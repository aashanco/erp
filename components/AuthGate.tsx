'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

type Role = 'Admin' | 'Office Staff' | 'Staff' | 'Technician' | 'Customer' | 'Read Only';

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  active: boolean;
  last_login_at?: string | null;
  phone?: string | null;
  department?: string | null;
};

type AuthMode = 'login' | 'signup' | 'forgot' | 'profile' | 'changePassword';

const SESSION_TIMEOUT_MINUTES = 30;
const WARNING_BEFORE_SECONDS = 60;

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');

  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [timeoutWarning, setTimeoutWarning] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem('aashan_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }

    loadSession();

    const { data } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        await loadProfile(newSession.user.id);
        resetInactivityTimer();
      } else {
        setProfile(null);
        setLoading(false);
        clearTimers();
      }
    });

    return () => {
      data.subscription.unsubscribe();
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!session) return;

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((eventName) => window.addEventListener(eventName, resetInactivityTimer));

    resetInactivityTimer();

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, resetInactivityTimer));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function clearTimers() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    timeoutRef.current = null;
    warningRef.current = null;
  }

  function resetInactivityTimer() {
    if (!session) return;

    clearTimers();
    setTimeoutWarning(false);

    const warningMs = Math.max((SESSION_TIMEOUT_MINUTES * 60 - WARNING_BEFORE_SECONDS) * 1000, 1000);
    const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;

    warningRef.current = setTimeout(() => {
      setTimeoutWarning(true);
    }, warningMs);

    timeoutRef.current = setTimeout(async () => {
      await safeAudit('AUTO_LOGOUT', 'User logged out due to inactivity.');
      await logout(false);
      alert('You were logged out due to inactivity.');
    }, timeoutMs);
  }

  async function safeAudit(action: string, notes: string, auditEmail?: string, userId?: string | null) {
    try {
      const currentUser = await supabase.auth.getUser();
      await supabase.from('login_audit_log').insert([{
        user_id: userId || currentUser.data.user?.id || null,
        email: auditEmail || currentUser.data.user?.email || email || '',
        action,
        notes,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      }]);
    } catch {
      console.log('Audit log skipped');
    }
  }

  async function loadSession() {
    setLoading(true);

    const { data } = await supabase.auth.getSession();
    setSession(data.session);

    if (data.session?.user) {
      await loadProfile(data.session.user.id);
      resetInactivityTimer();
    } else {
      setLoading(false);
    }
  }

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      alert(error.message);
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile(data || null);
    setFullName(data?.full_name || '');
    setPhone(data?.phone || '');
    setDepartment(data?.department || '');
    setLoading(false);
  }

  function normalizedEmail() {
    return email.trim().toLowerCase();
  }

  function saveRememberedEmail() {
    const cleanEmail = normalizedEmail();

    if (rememberMe && cleanEmail) {
      localStorage.setItem('aashan_remember_email', cleanEmail);
    } else {
      localStorage.removeItem('aashan_remember_email');
    }
  }

  async function login() {
    if (!email || !password) return alert('Enter email and password.');

    setLoading(true);

    const cleanEmail = normalizedEmail();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      setLoading(false);
      await safeAudit('LOGIN_FAILED', error.message, cleanEmail, null);
      return alert(error.message);
    }

    saveRememberedEmail();

    if (data.user) {
      await supabase
        .from('user_profiles')
        .update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', data.user.id);

      await safeAudit('LOGIN_SUCCESS', 'User logged in successfully.', cleanEmail, data.user.id);
      await loadProfile(data.user.id);
    }

    setPassword('');
    setLoading(false);
  }

  async function signup() {
    if (!email || !password) return alert('Enter email and password.');
    if (password.length < 8) return alert('Password must be at least 8 characters.');

    setLoading(true);

    const cleanEmail = normalizedEmail();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    if (error) {
      setLoading(false);
      return alert(error.message);
    }

    if (data.user) {
      const profilePayload = {
        id: data.user.id,
        email: cleanEmail,
        full_name: cleanEmail.split('@')[0],
        role: 'Technician',
        active: false,
      };

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        setLoading(false);
        return alert(profileError.message);
      }

      await safeAudit('SIGNUP', 'New user account created. Pending admin activation.', cleanEmail, data.user.id);
    }

    saveRememberedEmail();
    setPassword('');
    setLoading(false);
    alert('Account created. Admin must activate this user before access is allowed.');
    setMode('login');
  }

  async function resetPassword() {
    if (!email) return alert('Enter your email first.');

    const cleanEmail = normalizedEmail();

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin,
    });

    if (error) return alert(error.message);

    if (rememberMe) localStorage.setItem('aashan_remember_email', cleanEmail);

    await safeAudit('PASSWORD_RESET_REQUEST', 'Password reset requested.', cleanEmail, null);

    alert('Password reset email sent.');
    setMode('login');
  }

  async function changePassword() {
    if (!newPassword || newPassword.length < 8) return alert('Password must be at least 8 characters.');

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) return alert(error.message);

    setNewPassword('');
    await safeAudit('PASSWORD_CHANGED', 'User changed password.');
    alert('Password updated.');
    setMode('profile');
  }

  async function saveProfile() {
    if (!profile?.id) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName,
        phone,
        department,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (error) return alert(error.message);

    await safeAudit('PROFILE_UPDATED', 'User updated profile.');
    await loadProfile(profile.id);
    alert('Profile updated.');
  }

  async function logout(writeAudit = true) {
    if (writeAudit) await safeAudit('LOGOUT', 'User logged out.');
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setMode('login');
    clearTimers();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && mode === 'login') login();
  }

  function passwordStrengthLabel(value = password) {
    if (!value) return '';
    if (value.length < 8) return 'Weak';
    if (value.length < 12) return 'Medium';
    return 'Strong';
  }

  function friendlyName() {
    if (!email) return '';
    return email.split('@')[0].replace(/[._-]/g, ' ');
  }

  function formatDate(value?: string | null) {
    if (!value) return 'Not available';
    return new Date(value).toLocaleString();
  }

  if (loading) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.loadingCard}>
          <img src="/aashan-logo.png" alt="Aashan & Co LLC" style={styles.logoImg} />
          <h2>Aashan ERP</h2>
          <div style={styles.spinner}></div>
          <p>Connecting to secure workspace...</p>
        </div>
        <style>{spinCss}</style>
      </div>
    );
  }

  if (!session) {
    const rememberedName = friendlyName();

    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <img src="/aashan-logo.png" alt="Aashan & Co LLC" style={styles.loginLogo} />
          <h1 style={styles.loginTitle}>Aashan ERP</h1>
          <p style={styles.muted}>Secure field service and accounting workspace</p>

          {email && mode === 'login' && (
            <div style={styles.welcomeBox}>
              <b>Welcome back{rememberedName ? `, ${rememberedName}` : ''}</b>
              <span>Sign in to continue.</span>
            </div>
          )}

          <div style={styles.form}>
            <label>Email</label>
            <input
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="support@aashan.co"
              type="email"
              autoComplete="email"
              autoFocus
            />

            {mode !== 'forgot' && (
              <>
                <label>Password</label>
                <div style={styles.passwordWrap}>
                  <input
                    style={styles.passwordInput}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button style={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)} type="button">
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>

                {mode === 'signup' && password && (
                  <div style={passwordStrengthLabel() === 'Strong' ? styles.strengthStrong : passwordStrengthLabel() === 'Medium' ? styles.strengthMedium : styles.strengthWeak}>
                    Password strength: {passwordStrengthLabel()}
                  </div>
                )}

                <label style={styles.rememberRow}>
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  Remember email on this device
                </label>
              </>
            )}

            {mode === 'login' && <button style={styles.primaryBtn} onClick={login}>Login</button>}
            {mode === 'signup' && <button style={styles.primaryBtn} onClick={signup}>Create User</button>}
            {mode === 'forgot' && <button style={styles.primaryBtn} onClick={resetPassword}>Send Reset Link</button>}

            <div style={styles.links}>
              {mode !== 'login' && <button style={styles.linkBtn} onClick={() => setMode('login')}>Back to login</button>}
              {mode !== 'signup' && <button style={styles.linkBtn} onClick={() => setMode('signup')}>Create user</button>}
              {mode !== 'forgot' && <button style={styles.linkBtn} onClick={() => setMode('forgot')}>Forgot password?</button>}
            </div>
          </div>

          <p style={styles.secureNote}>🔐 Passwords are never stored in the browser.</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.card}>
          <h2>Profile Missing</h2>
          <p>Your login exists, but your ERP profile is not created yet.</p>
          <button style={styles.primaryBtn} onClick={() => logout()}>Logout</button>
        </div>
      </div>
    );
  }

  if (!profile.active) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.card}>
          <h2>Access Pending</h2>
          <p>Your account is created, but it is not activated yet.</p>
          <p>Please ask the Aashan ERP admin to activate your user.</p>
          <button style={styles.primaryBtn} onClick={() => logout()}>Logout</button>
        </div>
      </div>
    );
  }

  if (mode === 'profile') {
    return (
      <div style={styles.centerPage}>
        <div style={styles.profileCard}>
          <h2>User Profile</h2>
          <p style={styles.muted}>Manage your profile and security settings.</p>

          <div style={styles.form}>
            <label>Full Name</label>
            <input style={styles.input} value={fullName} onChange={(e) => setFullName(e.target.value)} />

            <label>Email</label>
            <input style={styles.input} value={profile.email} disabled />

            <label>Phone</label>
            <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} />

            <label>Department</label>
            <input style={styles.input} value={department} onChange={(e) => setDepartment(e.target.value)} />

            <label>Role</label>
            <input style={styles.input} value={profile.role} disabled />

            <label>Last Login</label>
            <input style={styles.input} value={formatDate(profile.last_login_at)} disabled />

            <button style={styles.primaryBtn} onClick={saveProfile}>Save Profile</button>
            <button style={styles.secondaryBtn} onClick={() => setMode('changePassword')}>Change Password</button>
            <button style={styles.linkBtn} onClick={() => setMode('login')}>Back to ERP</button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'changePassword') {
    return (
      <div style={styles.centerPage}>
        <div style={styles.profileCard}>
          <h2>Change Password</h2>
          <p style={styles.muted}>Use at least 8 characters.</p>

          <div style={styles.form}>
            <label>New Password</label>
            <input
              style={styles.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />

            <button style={styles.primaryBtn} onClick={changePassword}>Update Password</button>
            <button style={styles.linkBtn} onClick={() => setMode('profile')}>Back to Profile</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {timeoutWarning && (
        <div style={styles.timeoutWarning}>
          Session will expire soon due to inactivity.
          <button style={styles.warningBtn} onClick={resetInactivityTimer}>Stay signed in</button>
        </div>
      )}

      <div style={styles.securityBar}>
        <span>🔐 {profile.full_name || profile.email}</span>
        <span>{profile.role}</span>
        <span>Last login: {formatDate(profile.last_login_at)}</span>
        <button style={styles.profileBtn} onClick={() => setMode('profile')}>Profile</button>
        <button style={styles.logoutBtn} onClick={() => logout()}>Logout</button>
      </div>

      {children}
    </>
  );
}

const spinCss = `
@keyframes aashanSpin {
  to { transform: rotate(360deg); }
}
`;

const styles: Record<string, React.CSSProperties> = {
  loginPage: { minHeight: '100vh', background: 'radial-gradient(circle at top left, #2563eb 0, transparent 30%), linear-gradient(135deg, #020617, #1e3a8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Arial, sans-serif' },
  loginCard: { width: '100%', maxWidth: 450, background: 'rgba(255,255,255,0.96)', borderRadius: 28, padding: 30, boxShadow: '0 35px 100px rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.45)' },
  loginLogo: { width: 78, height: 78, objectFit: 'contain', borderRadius: 18, background: '#f8fafc', padding: 8, boxShadow: '0 12px 35px rgba(15,23,42,0.16)' },
  logoImg: { width: 82, height: 82, objectFit: 'contain', marginBottom: 8 },
  loginTitle: { marginBottom: 6 },
  muted: { color: '#64748b', marginTop: -4 },
  welcomeBox: { background: '#eff6ff', color: '#1e3a8a', border: '1px solid #dbeafe', borderRadius: 16, padding: 12, display: 'grid', gap: 3, marginTop: 16 },
  form: { display: 'grid', gap: 10, marginTop: 20 },
  input: { padding: '13px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 16, background: 'white' },
  passwordWrap: { display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: 12, background: 'white', overflow: 'hidden' },
  passwordInput: { flex: 1, padding: '13px 14px', border: 0, fontSize: 16, outline: 'none' },
  eyeBtn: { width: 52, alignSelf: 'stretch', border: 0, background: '#f8fafc', cursor: 'pointer', fontSize: 18 },
  rememberRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#334155', marginTop: 2, marginBottom: 4 },
  primaryBtn: { background: '#2563eb', color: 'white', border: 0, borderRadius: 12, padding: '13px 16px', fontWeight: 800, fontSize: 16, cursor: 'pointer' },
  secondaryBtn: { background: '#0f172a', color: 'white', border: 0, borderRadius: 12, padding: '13px 16px', fontWeight: 800, fontSize: 16, cursor: 'pointer' },
  links: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  linkBtn: { background: 'transparent', border: 0, color: '#2563eb', cursor: 'pointer', fontWeight: 700, padding: 6 },
  secureNote: { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 18 },
  centerPage: { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Arial, sans-serif' },
  card: { background: 'white', borderRadius: 18, padding: 24, maxWidth: 430, boxShadow: '0 20px 60px rgba(15,23,42,0.15)' },
  loadingCard: { background: 'white', borderRadius: 22, padding: 30, maxWidth: 430, textAlign: 'center', boxShadow: '0 20px 60px rgba(15,23,42,0.15)' },
  profileCard: { background: 'white', borderRadius: 22, padding: 26, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(15,23,42,0.15)' },
  spinner: { width: 34, height: 34, border: '4px solid #dbeafe', borderTop: '4px solid #2563eb', borderRadius: '50%', margin: '18px auto', animation: 'aashanSpin 0.9s linear infinite' },
  securityBar: { background: '#020617', color: 'white', padding: '8px 14px', display: 'flex', justifyContent: 'flex-end', gap: 16, alignItems: 'center', fontSize: 13, position: 'sticky', top: 0, zIndex: 10001, flexWrap: 'wrap' },
  profileBtn: { background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  logoutBtn: { background: '#dc2626', color: 'white', border: 0, borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  timeoutWarning: { background: '#f97316', color: 'white', padding: '10px 14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, fontWeight: 800, position: 'sticky', top: 0, zIndex: 10002 },
  warningBtn: { background: 'white', color: '#9a3412', border: 0, borderRadius: 8, padding: '6px 10px', fontWeight: 900, cursor: 'pointer' },
  strengthWeak: { color: '#dc2626', fontWeight: 800, fontSize: 13 },
  strengthMedium: { color: '#f97316', fontWeight: 800, fontSize: 13 },
  strengthStrong: { color: '#16a34a', fontWeight: 800, fontSize: 13 },
};
