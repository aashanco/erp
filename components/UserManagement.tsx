'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type UserRole = 'Admin' | 'Staff' | 'Office Staff' | 'Technician' | 'Customer' | 'Read Only';

type UserProfile = {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  active?: boolean;
  phone?: string;
  department?: string;
  last_login_at?: string;
  created_at?: string;
};

const emptyUser: Partial<UserProfile> = {
  full_name: '',
  email: '',
  role: 'Staff',
  active: true,
  phone: '',
  department: '',
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [user, setUser] = useState<Partial<UserProfile>>(emptyUser);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('email', { ascending: true });

    if (error) alert(error.message);
    setUsers((data || []) as UserProfile[]);
    setLoading(false);
  }

  async function saveUser() {
    if (!user.email?.trim()) return alert('Email is required.');

    const payload = {
      full_name: user.full_name || '',
      email: user.email.trim().toLowerCase(),
      role: user.role || 'Staff',
      active: user.active ?? true,
      phone: user.phone || '',
      department: user.department || '',
      updated_at: new Date().toISOString(),
    };

    const res = editingId
      ? await supabase.from('user_profiles').update(payload).eq('id', editingId)
      : await supabase.from('user_profiles').insert([payload]);

    if (res.error) return alert(res.error.message);

    setUser(emptyUser);
    setEditingId(null);
    await loadUsers();
  }

  function editUser(row: UserProfile) {
    setUser(row);
    setEditingId(row.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function updateRole(id: string, role: UserRole) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return alert(error.message);
    await loadUsers();
  }

  async function toggleActive(row: UserProfile) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ active: !row.active, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (error) return alert(error.message);
    await loadUsers();
  }

  async function deleteUser(row: UserProfile) {
    if (!confirm(`Remove ERP profile for ${row.email}? This does not delete the Supabase login.`)) return;
    const { error } = await supabase.from('user_profiles').delete().eq('id', row.id);
    if (error) return alert(error.message);
    await loadUsers();
  }

  function resetForm() {
    setUser(emptyUser);
    setEditingId(null);
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const total = users.length;
  const active = users.filter((u) => u.active).length;
  const pending = users.filter((u) => !u.active).length;
  const admins = users.filter((u) => u.role === 'Admin').length;

  return (
    <div style={styles.wrap}>
      <div style={styles.kpiGrid}>
        <Kpi title="Total Users" value={total} />
        <Kpi title="Active" value={active} />
        <Kpi title="Pending / Inactive" value={pending} />
        <Kpi title="Admins" value={admins} />
      </div>

      <div style={styles.card}>
        <h2 style={styles.title}>{editingId ? 'Edit User' : 'Create / Manage User Profile'}</h2>
        <p style={styles.help}>Use this screen to activate users, assign roles, and disable access.</p>

        <div style={styles.formGrid}>
          <Field label="Full Name">
            <input style={styles.input} value={user.full_name || ''} onChange={(e) => setUser({ ...user, full_name: e.target.value })} />
          </Field>
          <Field label="Email">
            <input style={styles.input} value={user.email || ''} onChange={(e) => setUser({ ...user, email: e.target.value })} />
          </Field>
          <Field label="Phone">
            <input style={styles.input} value={user.phone || ''} onChange={(e) => setUser({ ...user, phone: e.target.value })} />
          </Field>
          <Field label="Department">
            <input style={styles.input} value={user.department || ''} onChange={(e) => setUser({ ...user, department: e.target.value })} />
          </Field>
          <Field label="Role">
            <select style={styles.input} value={user.role || 'Staff'} onChange={(e) => setUser({ ...user, role: e.target.value as UserRole })}>
              <option>Admin</option>
              <option>Staff</option>
              <option>Office Staff</option>
              <option>Technician</option>
              <option>Customer</option>
              <option>Read Only</option>
            </select>
          </Field>
          <Field label="Status">
            <select style={styles.input} value={user.active ? 'Active' : 'Inactive'} onChange={(e) => setUser({ ...user, active: e.target.value === 'Active' })}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>
        </div>

        <div style={styles.actions}>
          <button style={styles.primaryBtn} onClick={saveUser}>{editingId ? 'Update User' : 'Save User Profile'}</button>
          <button style={styles.grayBtn} onClick={resetForm}>Clear</button>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.tableHeader}>
          <div>
            <h2 style={styles.title}>Users & Roles</h2>
            <p style={styles.help}>Admin can activate/deactivate users and change their roles.</p>
          </div>
          <input style={styles.search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." />
        </div>

        {loading ? <p>Loading users...</p> : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td style={styles.td}>{u.full_name || '-'}</td>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>
                      <select style={styles.smallSelect} value={u.role || 'Staff'} onChange={(e) => updateRole(u.id, e.target.value as UserRole)}>
                        <option>Admin</option>
                        <option>Staff</option>
                        <option>Office Staff</option>
                        <option>Technician</option>
                        <option>Customer</option>
                        <option>Read Only</option>
                      </select>
                    </td>
                    <td style={styles.td}>
                      <span style={u.active ? styles.badgeActive : styles.badgePending}>{u.active ? 'Active' : 'Pending / Disabled'}</span>
                    </td>
                    <td style={styles.td}>{u.department || '-'}</td>
                    <td style={styles.td}>
                      <div style={styles.rowActions}>
                        <button style={styles.smallBtn} onClick={() => editUser(u)}>Edit</button>
                        <button style={u.active ? styles.dangerBtn : styles.greenBtn} onClick={() => toggleActive(u)}>{u.active ? 'Disable' : 'Activate'}</button>
                        <button style={styles.deleteBtn} onClick={() => deleteUser(u)}>Remove Profile</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td style={styles.td} colSpan={6}>No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={styles.field}><span style={styles.label}>{label}</span>{children}</label>;
}

function Kpi({ title, value }: { title: string; value: number | string }) {
  return <div style={styles.kpi}><span>{title}</span><b>{value}</b></div>;
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { display: 'grid', gap: 18 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  kpi: { background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 10px 30px rgba(15,23,42,0.08)', borderLeft: '5px solid #2563eb', display: 'grid', gap: 8 },
  card: { background: 'white', borderRadius: 18, padding: 20, boxShadow: '0 10px 30px rgba(15,23,42,0.08)' },
  title: { margin: 0 },
  help: { color: '#64748b', marginTop: 6 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 },
  field: { display: 'grid', gap: 6 },
  label: { fontWeight: 800, color: '#334155' },
  input: { border: '1px solid #cbd5e1', borderRadius: 12, padding: '11px 12px', fontSize: 15 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  primaryBtn: { background: '#2563eb', color: 'white', border: 0, borderRadius: 12, padding: '11px 14px', fontWeight: 800, cursor: 'pointer' },
  grayBtn: { background: '#64748b', color: 'white', border: 0, borderRadius: 12, padding: '11px 14px', fontWeight: 800, cursor: 'pointer' },
  greenBtn: { background: '#16a34a', color: 'white', border: 0, borderRadius: 10, padding: '7px 9px', fontWeight: 800, cursor: 'pointer' },
  dangerBtn: { background: '#f97316', color: 'white', border: 0, borderRadius: 10, padding: '7px 9px', fontWeight: 800, cursor: 'pointer' },
  deleteBtn: { background: '#dc2626', color: 'white', border: 0, borderRadius: 10, padding: '7px 9px', fontWeight: 800, cursor: 'pointer' },
  smallBtn: { background: '#2563eb', color: 'white', border: 0, borderRadius: 10, padding: '7px 9px', fontWeight: 800, cursor: 'pointer' },
  tableHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  search: { border: '1px solid #cbd5e1', borderRadius: 12, padding: '11px 12px', minWidth: 240 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb', color: '#475569' },
  td: { padding: 10, borderBottom: '1px solid #e5e7eb', verticalAlign: 'middle' },
  smallSelect: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '7px 8px' },
  badgeActive: { background: '#dcfce7', color: '#166534', padding: '5px 9px', borderRadius: 999, fontWeight: 800, fontSize: 12 },
  badgePending: { background: '#fee2e2', color: '#991b1b', padding: '5px 9px', borderRadius: 999, fontWeight: 800, fontSize: 12 },
  rowActions: { display: 'flex', flexWrap: 'wrap', gap: 6 },
};
