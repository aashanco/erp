'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type GLAccount = {
  id?: number;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  is_active: boolean;
};

type PostingProfile = {
  id?: number;
  profile_code: string;
  profile_name: string;
  module: string;
  transaction_type: string;
  debit_account_code: string;
  debit_account_name: string;
  credit_account_code: string;
  credit_account_name: string;
  description: string;
  is_default: boolean;
  is_active: boolean;
};

const emptyProfile: PostingProfile = {
  profile_code: '',
  profile_name: '',
  module: 'Accounts Receivable',
  transaction_type: 'Customer Invoice',
  debit_account_code: '',
  debit_account_name: '',
  credit_account_code: '',
  credit_account_name: '',
  description: '',
  is_default: true,
  is_active: true,
};

const suggestedProfiles = [
  ['AR-INVOICE', 'Customer Invoice', 'Accounts Receivable', 'Customer Invoice', '1000', 'Accounts Receivable', '4010', 'Repair & Maintenance Revenue', 'Debit Accounts Receivable and credit Repair & Maintenance Revenue.'],
  ['AR-PAYMENT', 'Customer Payment / Receipt', 'Accounts Receivable', 'Customer Payment', '1010', 'Bank', '1000', 'Accounts Receivable', 'Debit Bank and credit Accounts Receivable.'],
  ['AP-BILL', 'Vendor Bill / Purchase Invoice', 'Accounts Payable', 'Vendor Invoice', '5000', 'COGS', '2000', 'Accounts Payable', 'Debit expense/COGS and credit Accounts Payable.'],
  ['AP-PAYMENT', 'Vendor Payment', 'Accounts Payable', 'Vendor Payment', '2000', 'Accounts Payable', '1010', 'Bank', 'Debit Accounts Payable and credit Bank.'],
  ['EXP-CASH', 'Cash Expense', 'Expenses', 'Expense', '5000', 'COGS', '1020', 'Cash on Hand', 'Debit expense/COGS and credit Cash on Hand.'],
  ['TAX-PAYABLE', 'Sales Tax Payable', 'Tax', 'Sales Tax', '1000', 'Accounts Receivable', '2100', 'Tax Payable', 'Customer tax receivable to Sales Tax Payable.'],
];

export default function PostingProfiles() {
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [profiles, setProfiles] = useState<PostingProfile[]>([]);
  const [profile, setProfile] = useState<PostingProfile>(emptyProfile);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState('');

  async function loadData() {
    const { data: accountData } = await supabase.from('gl_accounts').select('*').order('account_code', { ascending: true });
    const { data: profileData } = await supabase.from('posting_profiles').select('*').order('profile_code', { ascending: true });
    setAccounts((accountData || []) as GLAccount[]);
    setProfiles((profileData || []) as PostingProfile[]);
  }

  useEffect(() => { loadData(); }, []);

  function accountName(code: string) {
    return accounts.find((a) => a.account_code === code)?.account_name || '';
  }

  function setAccount(field: 'debit' | 'credit', code: string) {
    if (field === 'debit') {
      setProfile({ ...profile, debit_account_code: code, debit_account_name: accountName(code) });
    } else {
      setProfile({ ...profile, credit_account_code: code, credit_account_name: accountName(code) });
    }
  }

  async function saveProfile() {
    if (!profile.profile_code.trim()) return alert('Enter posting profile code.');
    if (!profile.profile_name.trim()) return alert('Enter posting profile name.');
    if (!profile.debit_account_code || !profile.credit_account_code) return alert('Select debit and credit ledger accounts.');

    const payload = {
      ...profile,
      profile_code: profile.profile_code.trim().toUpperCase(),
      debit_account_name: accountName(profile.debit_account_code) || profile.debit_account_name,
      credit_account_name: accountName(profile.credit_account_code) || profile.credit_account_name,
    };

    const res = editingId
      ? await supabase.from('posting_profiles').update(payload).eq('id', editingId)
      : await supabase.from('posting_profiles').insert([payload]);

    if (res.error) return alert(res.error.message);
    setProfile(emptyProfile);
    setEditingId(null);
    await loadData();
  }

  function editProfile(p: PostingProfile) {
    setProfile(p);
    setEditingId(p.id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteProfile(id?: number) {
    if (!id || !confirm('Delete this posting profile?')) return;
    const { error } = await supabase.from('posting_profiles').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function installSuggestedProfiles() {
    const payload = suggestedProfiles.map((p) => ({
      profile_code: p[0], profile_name: p[1], module: p[2], transaction_type: p[3],
      debit_account_code: p[4], debit_account_name: accountName(p[4]) || p[5],
      credit_account_code: p[6], credit_account_name: accountName(p[6]) || p[7],
      description: p[8], is_default: true, is_active: true,
    }));
    const { error } = await supabase.from('posting_profiles').upsert(payload, { onConflict: 'profile_code' });
    if (error) return alert(error.message);
    await loadData();
    alert('Suggested posting profiles installed.');
  }

  const filtered = profiles.filter((p) => `${p.profile_code} ${p.profile_name} ${p.module} ${p.transaction_type}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <p style={styles.help}>Define default debit and credit ledger accounts for customer invoices, receipts, vendor bills, vendor payments, expenses, and tax postings.</p>
        <div style={styles.actions}>
          <input style={styles.search} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search posting profile..." />
          <button style={styles.primaryBtn} onClick={installSuggestedProfiles}>Install Suggested Profiles</button>
        </div>
      </div>

      <div style={styles.card}>
        <h4>{editingId ? 'Edit Posting Profile' : 'New Posting Profile'}</h4>
        <div style={styles.formGrid}>
          <Field label="Profile Code"><input style={styles.input} value={profile.profile_code} onChange={(e) => setProfile({ ...profile, profile_code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Profile Name"><input style={styles.input} value={profile.profile_name} onChange={(e) => setProfile({ ...profile, profile_name: e.target.value })} /></Field>
          <Field label="Module"><select style={styles.input} value={profile.module} onChange={(e) => setProfile({ ...profile, module: e.target.value })}><option>Accounts Receivable</option><option>Accounts Payable</option><option>Expenses</option><option>Bank</option><option>Tax</option><option>General Ledger</option></select></Field>
          <Field label="Transaction Type"><select style={styles.input} value={profile.transaction_type} onChange={(e) => setProfile({ ...profile, transaction_type: e.target.value })}><option>Customer Invoice</option><option>Customer Payment</option><option>Vendor Invoice</option><option>Vendor Payment</option><option>Expense</option><option>Sales Tax</option><option>Opening Balance</option></select></Field>
          <Field label="Debit Ledger"><select style={styles.input} value={profile.debit_account_code} onChange={(e) => setAccount('debit', e.target.value)}><option value="">Select debit ledger</option>{accounts.filter(a => a.is_active).map(a => <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.account_name}</option>)}</select></Field>
          <Field label="Credit Ledger"><select style={styles.input} value={profile.credit_account_code} onChange={(e) => setAccount('credit', e.target.value)}><option value="">Select credit ledger</option>{accounts.filter(a => a.is_active).map(a => <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.account_name}</option>)}</select></Field>
          <Field label="Default"><select style={styles.input} value={profile.is_default ? 'Yes' : 'No'} onChange={(e) => setProfile({ ...profile, is_default: e.target.value === 'Yes' })}><option>Yes</option><option>No</option></select></Field>
          <Field label="Active"><select style={styles.input} value={profile.is_active ? 'Yes' : 'No'} onChange={(e) => setProfile({ ...profile, is_active: e.target.value === 'Yes' })}><option>Yes</option><option>No</option></select></Field>
        </div>
        <Field label="Description"><textarea style={{ ...styles.input, minHeight: 75 }} value={profile.description} onChange={(e) => setProfile({ ...profile, description: e.target.value })} /></Field>
        <div style={styles.buttonRow}><button style={styles.primaryBtn} onClick={saveProfile}>{editingId ? 'Update' : 'Save'}</button>{editingId && <button style={styles.grayBtn} onClick={() => { setProfile(emptyProfile); setEditingId(null); }}>Cancel</button>}</div>
      </div>

      <div style={styles.card}>
        <h4>Posting Profiles</h4>
        <div style={styles.tableWrap}><table style={styles.table}><thead><tr>{['Code','Name','Module','Transaction','Debit Ledger','Credit Ledger','Default','Active','Actions'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr></thead><tbody>
          {filtered.map((p) => <tr key={p.id}><td style={styles.td}>{p.profile_code}</td><td style={styles.td}>{p.profile_name}</td><td style={styles.td}>{p.module}</td><td style={styles.td}>{p.transaction_type}</td><td style={styles.td}>{p.debit_account_code} - {p.debit_account_name}</td><td style={styles.td}>{p.credit_account_code} - {p.credit_account_name}</td><td style={styles.td}>{p.is_default ? 'Yes' : 'No'}</td><td style={styles.td}>{p.is_active ? 'Yes' : 'No'}</td><td style={styles.td}><button style={styles.smallBtn} onClick={() => editProfile(p)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteProfile(p.id)}>Delete</button></td></tr>)}
        </tbody></table></div>
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return <label style={styles.field}><span>{label}</span>{children}</label>;
}

const styles: Record<string, any> = {
  wrapper: { display: 'grid', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  help: { color: '#64748b', margin: 0, lineHeight: 1.5, maxWidth: 700 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  search: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10 },
  card: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  field: { display: 'grid', gap: 5, fontWeight: 700, color: '#0f172a', marginBottom: 10 },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, boxSizing: 'border-box' },
  buttonRow: { display: 'flex', justifyContent: 'flex-end', gap: 10 },
  primaryBtn: { background: '#2563eb', color: 'white', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' },
  grayBtn: { background: '#64748b', color: 'white', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' },
  smallBtn: { background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer', marginRight: 6 },
  dangerBtn: { background: '#dc2626', color: 'white', border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 950 },
  th: { background: 'white', color: '#0f172a', textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  td: { padding: 10, borderBottom: '1px solid #e2e8f0', verticalAlign: 'top' },
};
