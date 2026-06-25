'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Role = 'Admin' | 'Office Staff' | 'Technician' | 'Customer';

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  active: boolean;
};

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadSession();

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function loadSession() {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) {
      await loadProfile(data.session.user.id);
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

    if (error) alert(error.message);
    setProfile(data || null);
    setLoading(false);
  }

  async function login() {
    if (!email || !password) return alert('Enter email and password.');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return alert(error.message);
    }
  }

  async function signup() {
    if (!email || !password) return alert('Enter email and password.');
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setLoading(false);
      return alert(error.message);
    }

    if (data.user) {
      await supabase.from('user_profiles').insert({
        id: data.user.id,
        email,
        full_name: email.split('@')[0],
        role: 'Technician',
        active: false,
      });
    }

    setLoading(false);
    alert('Account created. Admin must activate this user before access is allowed.');
    setMode('login');
  }

  async function resetPassword() {
    if (!email) return alert('Enter your email first.');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) return alert(error.message);
    alert('Password reset email sent.');
    setMode('login');
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  if (loading) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.card}>
          <h2>Aashan ERP</h2>
          <p>Loading secure workspace...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <div style={styles.logoCircle}>🛠️</div>
          <h1>Aashan ERP</h1>
          <p style={styles.muted}>Secure field service and accounting workspace</p>

          <div style={styles.form}>
            <label>Email</label>
            <input style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="support@aashan.co" type="email" />

            {mode !== 'forgot' && (
              <>
                <label>Password</label>
                <input style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
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
          <button style={styles.primaryBtn} onClick={logout}>Logout</button>
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
          <button style={styles.primaryBtn} onClick={logout}>Logout</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={styles.securityBar}>
        <span>🔐 {profile.full_name || profile.email}</span>
        <span>{profile.role}</span>
        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
      </div>
      {children}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loginPage: { minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Arial, sans-serif' },
  loginCard: { width: '100%', maxWidth: 430, background: 'white', borderRadius: 24, padding: 28, boxShadow: '0 30px 90px rgba(0,0,0,0.35)' },
  logoCircle: { width: 64, height: 64, borderRadius: 18, background: '#0f172a', color: 'white', display: 'grid', placeItems: 'center', fontSize: 30, marginBottom: 12 },
  muted: { color: '#64748b', marginTop: -8 },
  form: { display: 'grid', gap: 10, marginTop: 20 },
  input: { padding: '13px 14px', borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 16 },
  primaryBtn: { background: '#2563eb', color: 'white', border: 0, borderRadius: 12, padding: '13px 16px', fontWeight: 800, fontSize: 16, cursor: 'pointer' },
  links: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  linkBtn: { background: 'transparent', border: 0, color: '#2563eb', cursor: 'pointer', fontWeight: 700 },
  centerPage: { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Arial, sans-serif' },
  card: { background: 'white', borderRadius: 18, padding: 24, maxWidth: 430, boxShadow: '0 20px 60px rgba(15,23,42,0.15)' },
  securityBar: { background: '#020617', color: 'white', padding: '8px 14px', display: 'flex', justifyContent: 'flex-end', gap: 16, alignItems: 'center', fontSize: 13, position: 'sticky', top: 0, zIndex: 10001 },
  logoutBtn: { background: '#dc2626', color: 'white', border: 0, borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
};
