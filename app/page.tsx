'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Customer = { id?: number; name: string; phone: string; email: string; address: string };
type Job = { id?: number; customer: string; service: string; job_date: string; amount: string; status: string };
type Invoice = { id?: number; invoice_no: string; customer: string; job_id?: number | null; amount: string; invoice_date: string; due_date: string; status: string };

const emptyCustomer: Customer = { name: '', phone: '', email: '', address: '' };
const emptyJob: Job = { customer: '', service: '', job_date: '', amount: '', status: 'New' };
const emptyInvoice: Invoice = { invoice_no: '', customer: '', job_id: null, amount: '', invoice_date: '', due_date: '', status: 'Draft' };

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'jobs' | 'invoices'>('dashboard');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [job, setJob] = useState<Job>(emptyJob);
  const [invoice, setInvoice] = useState<Invoice>(emptyInvoice);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    const { data: customerData, error: customerError } = await supabase.from('customers').select('*').order('id', { ascending: false });
    const { data: jobData, error: jobError } = await supabase.from('jobs').select('*').order('id', { ascending: false });
    const { data: invoiceData, error: invoiceError } = await supabase.from('invoices').select('*').order('id', { ascending: false });
    if (customerError) alert(customerError.message);
    if (jobError) alert(jobError.message);
    if (invoiceError) alert(invoiceError.message);
    setCustomers(customerData || []);
    setJobs((jobData || []).map((j: any) => ({ ...j, amount: String(j.amount || '') })));
    setInvoices((invoiceData || []).map((i: any) => ({ ...i, amount: String(i.amount || '') })));
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function nextInvoiceNo() {
    const maxNo = invoices.reduce((max, inv) => {
      const num = Number(String(inv.invoice_no || '').replace(/[^0-9]/g, ''));
      return Number.isFinite(num) && num > max ? num : max;
    }, 0);
    return `INV-${String(maxNo + 1).padStart(4, '0')}`;
  }

  async function saveCustomer() {
    if (!customer.name.trim()) return alert('Enter customer name');
    const payload = { name: customer.name.trim(), phone: customer.phone || '', email: customer.email || '', address: customer.address || '' };
    const res = editingCustomerId ? await supabase.from('customers').update(payload).eq('id', editingCustomerId) : await supabase.from('customers').insert([payload]);
    if (res.error) return alert(res.error.message);
    setCustomer(emptyCustomer); setEditingCustomerId(null); await loadData();
  }

  function editCustomer(c: Customer) { setCustomer(c); setEditingCustomerId(c.id || null); setActiveTab('customers'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function deleteCustomer(id?: number) { if (!id || !confirm('Delete this customer?')) return; const { error } = await supabase.from('customers').delete().eq('id', id); if (error) return alert(error.message); await loadData(); }

  async function saveJob() {
    if (!job.customer.trim() || !job.service.trim()) return alert('Enter customer and service');
    const payload = { customer: job.customer, service: job.service, job_date: job.job_date || null, amount: Number(job.amount || 0), status: job.status };
    const res = editingJobId ? await supabase.from('jobs').update(payload).eq('id', editingJobId) : await supabase.from('jobs').insert([payload]);
    if (res.error) return alert(res.error.message);
    setJob(emptyJob); setEditingJobId(null); await loadData();
  }

  function editJob(j: Job) { setJob({ ...j, amount: String(j.amount || '') }); setEditingJobId(j.id || null); setActiveTab('jobs'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function deleteJob(id?: number) { if (!id || !confirm('Delete this job?')) return; const { error } = await supabase.from('jobs').delete().eq('id', id); if (error) return alert(error.message); await loadData(); }
  async function quickJobStatus(id: number | undefined, status: string) { if (!id) return; const { error } = await supabase.from('jobs').update({ status }).eq('id', id); if (error) return alert(error.message); await loadData(); }

  function fillInvoiceFromJob(jobIdValue: string) {
    if (!jobIdValue) { setInvoice({ ...invoice, job_id: null }); return; }
    const selected = jobs.find((j) => String(j.id) === jobIdValue);
    if (!selected) return;
    const today = new Date().toISOString().slice(0, 10);
    setInvoice({ invoice_no: invoice.invoice_no || nextInvoiceNo(), customer: selected.customer, job_id: selected.id || null, amount: String(selected.amount || ''), invoice_date: invoice.invoice_date || today, due_date: invoice.due_date || today, status: invoice.status || 'Draft' });
  }

  async function saveInvoice() {
    if (!invoice.customer.trim()) return alert('Select customer');
    if (!invoice.amount) return alert('Enter invoice amount');
    const payload = { invoice_no: invoice.invoice_no || nextInvoiceNo(), customer: invoice.customer, job_id: invoice.job_id || null, amount: Number(invoice.amount || 0), invoice_date: invoice.invoice_date || null, due_date: invoice.due_date || null, status: invoice.status };
    const res = editingInvoiceId ? await supabase.from('invoices').update(payload).eq('id', editingInvoiceId) : await supabase.from('invoices').insert([payload]);
    if (res.error) return alert(res.error.message);
    if (payload.job_id) await supabase.from('jobs').update({ status: payload.status === 'Paid' ? 'Paid' : 'Invoiced' }).eq('id', payload.job_id);
    setInvoice(emptyInvoice); setEditingInvoiceId(null); await loadData();
  }

  function editInvoice(inv: Invoice) { setInvoice({ ...inv, amount: String(inv.amount || '') }); setEditingInvoiceId(inv.id || null); setActiveTab('invoices'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function deleteInvoice(id?: number) { if (!id || !confirm('Delete this invoice?')) return; const { error } = await supabase.from('invoices').delete().eq('id', id); if (error) return alert(error.message); await loadData(); }
  async function quickInvoiceStatus(id: number | undefined, status: string) { if (!id) return; const { error } = await supabase.from('invoices').update({ status }).eq('id', id); if (error) return alert(error.message); await loadData(); }

  function exportCsv(filename: string, rows: any[][]) {
    const csv = rows.map((r) => r.map((v) => `"${String(v || '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  const q = search.toLowerCase();
  const filteredCustomers = customers.filter((c) => [c.name, c.phone, c.email, c.address].join(' ').toLowerCase().includes(q));
  const filteredJobs = jobs.filter((j) => [j.customer, j.service, j.status, j.job_date, j.amount].join(' ').toLowerCase().includes(q));
  const invoicedJobIds = invoices.map((i) => Number(i.job_id)).filter(Boolean);
  const availableInvoiceJobs = jobs.filter((j) => !invoicedJobIds.includes(Number(j.id)) || Number(j.id) === Number(invoice.job_id));
  const filteredInvoices = invoices.filter((i) => [i.invoice_no, i.customer, i.status, i.invoice_date, i.amount].join(' ').toLowerCase().includes(q));
  const outstanding = invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Cancelled').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const paidRevenue = invoices.filter((i) => i.status === 'Paid').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const openInvoices = invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Cancelled').length;
  const jobsInProgress = jobs.filter((j) => j.status === 'In Progress').length;
  const completedJobs = jobs.filter((j) => ['Completed', 'Invoiced', 'Paid'].includes(j.status)).length;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div><h1 style={styles.headerTitle}>Aashan ERP Web</h1><p style={styles.headerSub}>Aashan & Co LLC - Customers, Jobs, Invoices & Manager.io Export</p></div>
        <div style={styles.phaseBadge}>Phase 3 UI</div>
      </header>
      <section style={styles.container}>
        <div style={styles.toolbar}>
          <button style={activeTab === 'dashboard' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          <button style={activeTab === 'customers' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('customers')}>Customers</button>
          <button style={activeTab === 'jobs' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('jobs')}>Jobs</button>
          <button style={activeTab === 'invoices' ? styles.tabActive : styles.tab} onClick={() => setActiveTab('invoices')}>Invoices</button>
          <button style={styles.tab} onClick={() => exportCsv('manager-customers.csv', [['Name','Phone','Email','Address'], ...customers.map(c => [c.name,c.phone,c.email,c.address])])}>Export Customers</button>
          <button style={styles.tab} onClick={() => exportCsv('manager-invoices.csv', [['Invoice Number','Customer','Invoice Date','Due Date','Amount','Status'], ...invoices.map(i => [i.invoice_no,i.customer,i.invoice_date,i.due_date,i.amount,i.status])])}>Export Invoices</button>
        </div>
        <input placeholder="Search customer, job, invoice, phone, email, status..." value={search} onChange={(e) => setSearch(e.target.value)} style={styles.search} />
        {loading && <p>Loading...</p>}
        <div style={styles.cards}>
          <Card title="Customers" value={customers.length} /><Card title="Jobs" value={jobs.length} /><Card title="Open Invoices" value={openInvoices} /><Card title="Outstanding" value={`$${outstanding.toFixed(2)}`} /><Card title="Paid Revenue" value={`$${paidRevenue.toFixed(2)}`} /><Card title="In Progress" value={jobsInProgress} /><Card title="Completed Jobs" value={completedJobs} />
        </div>
        {(activeTab === 'dashboard' || activeTab === 'customers') && <><SectionCard title={editingCustomerId ? 'Edit Customer' : 'Add Customer'}><div style={styles.formGrid2}><Input label="Name" value={customer.name} onChange={(v: string) => setCustomer({ ...customer, name: v })} /><Input label="Phone" value={customer.phone} onChange={(v: string) => setCustomer({ ...customer, phone: v })} /><Input label="Email" value={customer.email} onChange={(v: string) => setCustomer({ ...customer, email: v })} /><Input label="Address" value={customer.address} onChange={(v: string) => setCustomer({ ...customer, address: v })} /></div><div style={styles.buttonRow}><button onClick={saveCustomer} style={styles.primaryBtn}>{editingCustomerId ? 'Update Customer' : 'Save Customer'}</button>{editingCustomerId && <button onClick={() => { setCustomer(emptyCustomer); setEditingCustomerId(null); }} style={styles.grayBtn}>Cancel</button>}</div></SectionCard><DataTable title="Customer List" headers={['Name','Phone','Email','Address','Actions']}>{filteredCustomers.map((c) => <tr key={c.id}><Td>{c.name}</Td><Td>{c.phone}</Td><Td>{c.email}</Td><Td>{c.address}</Td><Td><button style={styles.smallBtn} onClick={() => editCustomer(c)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteCustomer(c.id)}>Delete</button></Td></tr>)}</DataTable></>}
        {(activeTab === 'dashboard' || activeTab === 'jobs') && <><SectionCard title={editingJobId ? 'Edit Job / Quote' : 'Add Job / Quote'}><div style={styles.formGrid2}><Field label="Customer"><select value={job.customer} onChange={(e) => setJob({ ...job, customer: e.target.value })} style={styles.input}><option value="">Select Customer</option>{customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></Field><Input label="Service" value={job.service} onChange={(v: string) => setJob({ ...job, service: v })} /><Input label="Date" type="date" value={job.job_date} onChange={(v: string) => setJob({ ...job, job_date: v })} /><Input label="Amount" value={job.amount} onChange={(v: string) => setJob({ ...job, amount: v })} /><Field label="Status"><select value={job.status} onChange={(e) => setJob({ ...job, status: e.target.value })} style={styles.input}><option>New</option><option>Quoted</option><option>In Progress</option><option>Completed</option><option>Invoiced</option><option>Paid</option></select></Field></div><div style={styles.buttonRow}><button onClick={saveJob} style={styles.greenBtn}>{editingJobId ? 'Update Job' : 'Save Job'}</button>{editingJobId && <button onClick={() => { setJob(emptyJob); setEditingJobId(null); }} style={styles.grayBtn}>Cancel</button>}</div></SectionCard><DataTable title="Jobs & Quotes" headers={['Customer','Service','Date','Amount','Status','Quick Status','Actions']}>{filteredJobs.map((j) => <tr key={j.id}><Td>{j.customer}</Td><Td>{j.service}</Td><Td>{j.job_date}</Td><Td>${Number(j.amount || 0).toFixed(2)}</Td><Td><span style={styles.badge}>{j.status}</span></Td><Td><select value={j.status} onChange={(e) => quickJobStatus(j.id, e.target.value)} style={styles.smallSelect}><option>New</option><option>Quoted</option><option>In Progress</option><option>Completed</option><option>Invoiced</option><option>Paid</option></select></Td><Td><button style={styles.smallBtn} onClick={() => editJob(j)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteJob(j.id)}>Delete</button></Td></tr>)}</DataTable></>}
        {(activeTab === 'dashboard' || activeTab === 'invoices') && <><SectionCard title={editingInvoiceId ? 'Edit Invoice' : 'Create Invoice'}><div style={styles.invoiceGrid}><Field label="From Job"><select value={invoice.job_id ? String(invoice.job_id) : ''} onChange={(e) => fillInvoiceFromJob(e.target.value)} style={styles.input}><option value="">Select Job</option>{availableInvoiceJobs.map((j) => <option key={j.id} value={j.id}>{j.customer} - {j.service} - ${j.amount}</option>)}</select></Field><Input label="Invoice No" value={invoice.invoice_no} onChange={(v: string) => setInvoice({ ...invoice, invoice_no: v })} /><Field label="Customer"><select value={invoice.customer} onChange={(e) => setInvoice({ ...invoice, customer: e.target.value })} style={styles.input}><option value="">Select Customer</option>{customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></Field><Input label="Invoice Date" type="date" value={invoice.invoice_date} onChange={(v: string) => setInvoice({ ...invoice, invoice_date: v })} /><Input label="Due Date" type="date" value={invoice.due_date} onChange={(v: string) => setInvoice({ ...invoice, due_date: v })} /><Input label="Amount" value={invoice.amount} onChange={(v: string) => setInvoice({ ...invoice, amount: v })} /><Field label="Status"><select value={invoice.status} onChange={(e) => setInvoice({ ...invoice, status: e.target.value })} style={styles.input}><option>Draft</option><option>Sent</option><option>Partially Paid</option><option>Paid</option><option>Cancelled</option></select></Field></div><div style={styles.buttonRow}><button onClick={saveInvoice} style={styles.primaryBtn}>{editingInvoiceId ? 'Update Invoice' : 'Save Invoice'}</button>{editingInvoiceId && <button onClick={() => { setInvoice(emptyInvoice); setEditingInvoiceId(null); }} style={styles.grayBtn}>Cancel</button>}</div></SectionCard><DataTable title="Invoices" headers={['Invoice #','Customer','Invoice Date','Due Date','Amount','Status','Quick Status','Actions']}>{filteredInvoices.map((i) => <tr key={i.id}><Td>{i.invoice_no}</Td><Td>{i.customer}</Td><Td>{i.invoice_date}</Td><Td>{i.due_date}</Td><Td>${Number(i.amount || 0).toFixed(2)}</Td><Td><span style={styles.badge}>{i.status}</span></Td><Td><select value={i.status} onChange={(e) => quickInvoiceStatus(i.id, e.target.value)} style={styles.smallSelect}><option>Draft</option><option>Sent</option><option>Partially Paid</option><option>Paid</option><option>Cancelled</option></select></Td><Td><button style={styles.smallBtn} onClick={() => editInvoice(i)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteInvoice(i.id)}>Delete</button></Td></tr>)}</DataTable></>}
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: any }) { return <div style={styles.card}><div style={styles.cardTitle}>{title}</div><div style={styles.cardValue}>{value}</div></div>; }
function SectionCard({ title, children }: any) { return <div style={styles.sectionCard}><h2 style={styles.sectionTitle}>{title}</h2>{children}</div>; }
function Field({ label, children }: any) { return <div style={styles.field}><label style={styles.label}>{label}</label>{children}</div>; }
function Input({ label, value, onChange, type = 'text' }: any) { return <Field label={label}><input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} style={styles.input} /></Field>; }
function DataTable({ title, headers, children }: any) { return <div style={styles.sectionCard}><h2 style={styles.sectionTitle}>{title}</h2><div style={{ overflowX: 'auto' }}><table style={styles.table}><thead><tr>{headers.map((h: string) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div></div>; }
function Td({ children }: any) { return <td style={styles.td}>{children}</td>; }

const styles: Record<string, any> = {
  page: { fontFamily: 'Arial, sans-serif', background: '#f3f6fa', minHeight: '100vh', color: '#0f172a' },
  header: { background: '#0f172a', color: 'white', padding: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
  headerTitle: { margin: 0, fontSize: 28 }, headerSub: { margin: '6px 0 0', opacity: 0.9 }, phaseBadge: { background: '#1d4ed8', padding: '8px 14px', borderRadius: 999, fontWeight: 700 },
  container: { maxWidth: 1280, margin: '0 auto', padding: 22 }, toolbar: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 },
  tab: { background: 'white', padding: '10px 18px', borderRadius: 999, border: '1px solid #e5e7eb', boxShadow: '0 3px 10px rgba(15,23,42,0.08)', cursor: 'pointer' },
  tabActive: { background: '#2563eb', color: 'white', padding: '10px 18px', borderRadius: 999, border: '1px solid #2563eb', boxShadow: '0 3px 10px rgba(37,99,235,0.25)', cursor: 'pointer' },
  search: { width: '100%', maxWidth: 520, padding: 12, margin: '0 0 20px', border: '1px solid #cbd5e1', borderRadius: 10, boxSizing: 'border-box', background: 'white' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 22 },
  card: { background: 'white', padding: 18, borderRadius: 16, boxShadow: '0 8px 20px rgba(15,23,42,0.08)', minHeight: 92 }, cardTitle: { fontWeight: 700, color: '#334155', marginBottom: 10 }, cardValue: { fontSize: 28, fontWeight: 800 },
  sectionCard: { background: 'white', padding: 22, borderRadius: 16, boxShadow: '0 8px 20px rgba(15,23,42,0.08)', marginTop: 22 }, sectionTitle: { marginTop: 0, marginBottom: 18 },
  formGrid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, alignItems: 'end' }, invoiceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, alignItems: 'end' },
  field: { display: 'flex', flexDirection: 'column', gap: 7 }, label: { fontSize: 14, fontWeight: 700, color: '#0f172a' }, input: { width: '100%', height: 42, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box', background: 'white' },
  buttonRow: { display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }, primaryBtn: { background: '#2563eb', color: 'white', padding: '10px 16px', border: 0, borderRadius: 8, cursor: 'pointer', fontWeight: 700 }, greenBtn: { background: '#059669', color: 'white', padding: '10px 16px', border: 0, borderRadius: 8, cursor: 'pointer', fontWeight: 700 }, grayBtn: { background: '#64748b', color: 'white', padding: '10px 16px', border: 0, borderRadius: 8, cursor: 'pointer', fontWeight: 700 },
  smallBtn: { background: '#2563eb', color: 'white', padding: '7px 10px', border: 0, borderRadius: 7, marginRight: 6, cursor: 'pointer' }, dangerBtn: { background: '#dc2626', color: 'white', padding: '7px 10px', border: 0, borderRadius: 7, cursor: 'pointer' }, smallSelect: { padding: 7, border: '1px solid #cbd5e1', borderRadius: 7 }, badge: { background: '#dbeafe', color: '#1d4ed8', padding: '5px 9px', borderRadius: 999, fontWeight: 700, fontSize: 12 },
  table: { width: '100%', borderCollapse: 'collapse' }, th: { textAlign: 'left', padding: 12, background: '#f8fafc', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }, td: { padding: 12, borderBottom: '1px solid #e5e7eb', verticalAlign: 'middle' }
};
