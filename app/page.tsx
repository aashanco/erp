'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type Customer = { id?: number; name: string; phone: string; email: string; address: string };
type Job = { id?: number; customer: string; service: string; job_date: string; amount: string; status: string };
type Invoice = { id?: number; invoice_no: string; customer: string; job_id?: number | null; amount: string; invoice_date: string; due_date: string; status: string };

const emptyCustomer: Customer = { name: '', phone: '', email: '', address: '' };
const emptyJob: Job = { customer: '', service: '', job_date: '', amount: '', status: 'New' };
const emptyInvoice: Invoice = { invoice_no: '', customer: '', job_id: null, amount: '', invoice_date: '', due_date: '', status: 'Draft' };

export default function Home() {
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
    setJobs(jobData || []);
    setInvoices(invoiceData || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  function nextInvoiceNo() {
    const next = invoices.length + 1;
    return `INV-${String(next).padStart(4, '0')}`;
  }

  async function saveCustomer() {
    if (!customer.name.trim()) return alert('Enter customer name');
    const payload = { name: customer.name, phone: customer.phone, email: customer.email, address: customer.address };
    const res = editingCustomerId
      ? await supabase.from('customers').update(payload).eq('id', editingCustomerId)
      : await supabase.from('customers').insert([payload]);
    if (res.error) return alert(res.error.message);
    setCustomer(emptyCustomer); setEditingCustomerId(null); loadData();
  }

  function editCustomer(c: Customer) {
    setCustomer(c); setEditingCustomerId(c.id || null); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteCustomer(id?: number) {
    if (!id || !confirm('Delete this customer?')) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) return alert(error.message);
    loadData();
  }

  async function saveJob() {
    if (!job.customer.trim() || !job.service.trim()) return alert('Enter customer and service');
    const payload = { customer: job.customer, service: job.service, job_date: job.job_date || null, amount: Number(job.amount || 0), status: job.status };
    const res = editingJobId
      ? await supabase.from('jobs').update(payload).eq('id', editingJobId)
      : await supabase.from('jobs').insert([payload]);
    if (res.error) return alert(res.error.message);
    setJob(emptyJob); setEditingJobId(null); loadData();
  }

  function editJob(j: Job) {
    setJob({ ...j, amount: String(j.amount || '') }); setEditingJobId(j.id || null); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteJob(id?: number) {
    if (!id || !confirm('Delete this job?')) return;
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) return alert(error.message);
    loadData();
  }

  async function quickStatus(id: number | undefined, status: string) {
    if (!id) return;
    const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
    if (error) return alert(error.message);
    loadData();
  }

  function fillInvoiceFromJob(jobIdValue: string) {
    const selected = jobs.find((j) => String(j.id) === jobIdValue);
    if (!selected) return setInvoice({ ...invoice, job_id: null });
    setInvoice({
      ...invoice,
      invoice_no: invoice.invoice_no || nextInvoiceNo(),
      customer: selected.customer,
      job_id: selected.id || null,
      amount: String(selected.amount || ''),
      invoice_date: invoice.invoice_date || new Date().toISOString().slice(0, 10),
      status: invoice.status || 'Draft'
    });
  }

  async function saveInvoice() {
    if (!invoice.customer.trim()) return alert('Select customer');
    const payload = {
      invoice_no: invoice.invoice_no || nextInvoiceNo(),
      customer: invoice.customer,
      job_id: invoice.job_id || null,
      amount: Number(invoice.amount || 0),
      invoice_date: invoice.invoice_date || null,
      due_date: invoice.due_date || null,
      status: invoice.status
    };
    const res = editingInvoiceId
      ? await supabase.from('invoices').update(payload).eq('id', editingInvoiceId)
      : await supabase.from('invoices').insert([payload]);
    if (res.error) return alert(res.error.message);
    setInvoice(emptyInvoice); setEditingInvoiceId(null); loadData();
  }

  function editInvoice(inv: Invoice) {
    setInvoice({ ...inv, amount: String(inv.amount || '') });
    setEditingInvoiceId(inv.id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteInvoice(id?: number) {
    if (!id || !confirm('Delete this invoice?')) return;
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) return alert(error.message);
    loadData();
  }

  async function invoiceStatus(id: number | undefined, status: string) {
    if (!id) return;
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
    if (error) return alert(error.message);
    loadData();
  }

  function exportCsv(filename: string, rows: any[][]) {
    const csv = rows.map((r) => r.map((v) => `"${String(v || '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  const q = search.toLowerCase();
  const filteredCustomers = customers.filter((c) => [c.name, c.phone, c.email, c.address].join(' ').toLowerCase().includes(q));
  const filteredJobs = jobs.filter((j) => [j.customer, j.service, j.status, j.job_date, j.amount].join(' ').toLowerCase().includes(q));
  const filteredInvoices = invoices.filter((i) => [i.invoice_no, i.customer, i.status, i.invoice_date, i.amount].join(' ').toLowerCase().includes(q));

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const outstanding = invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const openInvoices = invoices.filter(i => i.status !== 'Paid').length;

  return (
    <main style={{ fontFamily: 'Arial', background: '#f4f6f8', minHeight: '100vh' }}>
      <header style={{ background: '#0f172a', color: 'white', padding: 20 }}>
        <h1 style={{ margin: 0 }}>Aashan ERP Web</h1>
        <p>Aashan & Co LLC - Phase 3 Invoice Module</p>
      </header>

      <section style={{ maxWidth: 1280, margin: '30px auto', padding: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          <button style={pill}>Dashboard</button>
          <button style={pill}>Customers</button>
          <button style={pill}>Jobs</button>
          <button style={pill}>Invoices</button>
          <button style={pill} onClick={() => exportCsv('manager-customers.csv', [['Name','Phone','Email','Address'], ...customers.map(c => [c.name,c.phone,c.email,c.address])])}>Manager Customers CSV</button>
          <button style={pill} onClick={() => exportCsv('manager-invoices.csv', [['Invoice Number','Customer','Invoice Date','Due Date','Amount','Status'], ...invoices.map(i => [i.invoice_no,i.customer,i.invoice_date,i.due_date,i.amount,i.status])])}>Manager Invoices CSV</button>
        </div>

        <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...input, maxWidth: 500, background: 'white' }} />
        {loading && <p>Loading...</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
          <Card title="Customers" value={customers.length} />
          <Card title="Jobs" value={jobs.length} />
          <Card title="Invoices" value={invoices.length} />
          <Card title="Outstanding" value={`$${outstanding.toFixed(2)}`} />
          <Card title="Paid Revenue" value={`$${totalRevenue.toFixed(2)}`} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 25 }}>
          <div style={box}>
            <h2>{editingCustomerId ? 'Edit Customer' : 'Add Customer'}</h2>
            <Input label="Name" value={customer.name} onChange={(v: string) => setCustomer({ ...customer, name: v })} />
            <Input label="Phone" value={customer.phone} onChange={(v: string) => setCustomer({ ...customer, phone: v })} />
            <Input label="Email" value={customer.email} onChange={(v: string) => setCustomer({ ...customer, email: v })} />
            <Input label="Address" value={customer.address} onChange={(v: string) => setCustomer({ ...customer, address: v })} />
            <button onClick={saveCustomer} style={buttonBlue}>{editingCustomerId ? 'Update Customer' : 'Save Customer'}</button>
            {editingCustomerId && <button onClick={() => { setCustomer(emptyCustomer); setEditingCustomerId(null); }} style={buttonGray}>Cancel</button>}
          </div>

          <div style={box}>
            <h2>{editingJobId ? 'Edit Job / Quote' : 'Add Job / Quote'}</h2>
            <label>Customer</label>
            <select value={job.customer} onChange={(e) => setJob({ ...job, customer: e.target.value })} style={input}>
              <option value="">Select Customer</option>
              {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <Input label="Service" value={job.service} onChange={(v: string) => setJob({ ...job, service: v })} />
            <Input label="Date" type="date" value={job.job_date} onChange={(v: string) => setJob({ ...job, job_date: v })} />
            <Input label="Amount" value={job.amount} onChange={(v: string) => setJob({ ...job, amount: v })} />
            <label>Status</label>
            <select value={job.status} onChange={(e) => setJob({ ...job, status: e.target.value })} style={input}>
              <option>New</option><option>Quoted</option><option>In Progress</option><option>Completed</option><option>Invoiced</option><option>Paid</option>
            </select>
            <button onClick={saveJob} style={buttonGreen}>{editingJobId ? 'Update Job' : 'Save Job'}</button>
            {editingJobId && <button onClick={() => { setJob(emptyJob); setEditingJobId(null); }} style={buttonGray}>Cancel</button>}
          </div>
        </div>

        <div style={{ ...box, marginTop: 25 }}>
          <h2>{editingInvoiceId ? 'Edit Invoice' : 'Create Invoice'}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <div>
              <label>From Job</label>
              <select onChange={(e) => fillInvoiceFromJob(e.target.value)} style={input}>
                <option value="">Select Job</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.customer} - {j.service} - ${j.amount}</option>)}
              </select>
            </div>
            <Input label="Invoice No" value={invoice.invoice_no} onChange={(v: string) => setInvoice({ ...invoice, invoice_no: v })} />
            <div>
              <label>Customer</label>
              <select value={invoice.customer} onChange={(e) => setInvoice({ ...invoice, customer: e.target.value })} style={input}>
                <option value="">Select Customer</option>
                {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <Input label="Invoice Date" type="date" value={invoice.invoice_date} onChange={(v: string) => setInvoice({ ...invoice, invoice_date: v })} />
            <Input label="Due Date" type="date" value={invoice.due_date} onChange={(v: string) => setInvoice({ ...invoice, due_date: v })} />
            <Input label="Amount" value={invoice.amount} onChange={(v: string) => setInvoice({ ...invoice, amount: v })} />
            <div>
              <label>Status</label>
              <select value={invoice.status} onChange={(e) => setInvoice({ ...invoice, status: e.target.value })} style={input}>
                <option>Draft</option><option>Sent</option><option>Partially Paid</option><option>Paid</option><option>Cancelled</option>
              </select>
            </div>
          </div>
          <button onClick={saveInvoice} style={buttonBlue}>{editingInvoiceId ? 'Update Invoice' : 'Save Invoice'}</button>
          {editingInvoiceId && <button onClick={() => { setInvoice(emptyInvoice); setEditingInvoiceId(null); }} style={buttonGray}>Cancel</button>}
        </div>

        <DataTable title="Customer List" headers={['Name','Phone','Email','Address','Actions']}>
          {filteredCustomers.map((c) => <tr key={c.id}><Td>{c.name}</Td><Td>{c.phone}</Td><Td>{c.email}</Td><Td>{c.address}</Td><Td><button style={smallBtn} onClick={() => editCustomer(c)}>Edit</button><button style={dangerBtn} onClick={() => deleteCustomer(c.id)}>Delete</button></Td></tr>)}
        </DataTable>

        <DataTable title="Jobs & Quotes" headers={['Customer','Service','Date','Amount','Status','Quick Status','Actions']}>
          {filteredJobs.map((j) => <tr key={j.id}><Td>{j.customer}</Td><Td>{j.service}</Td><Td>{j.job_date}</Td><Td>${Number(j.amount || 0).toFixed(2)}</Td><Td><span style={badge}>{j.status}</span></Td><Td><select value={j.status} onChange={(e) => quickStatus(j.id, e.target.value)} style={{ padding: 6 }}><option>New</option><option>Quoted</option><option>In Progress</option><option>Completed</option><option>Invoiced</option><option>Paid</option></select></Td><Td><button style={smallBtn} onClick={() => editJob(j)}>Edit</button><button style={dangerBtn} onClick={() => deleteJob(j.id)}>Delete</button></Td></tr>)}
        </DataTable>

        <DataTable title="Invoices" headers={['Invoice #','Customer','Invoice Date','Due Date','Amount','Status','Quick Status','Actions']}>
          {filteredInvoices.map((i) => <tr key={i.id}><Td>{i.invoice_no}</Td><Td>{i.customer}</Td><Td>{i.invoice_date}</Td><Td>{i.due_date}</Td><Td>${Number(i.amount || 0).toFixed(2)}</Td><Td><span style={badge}>{i.status}</span></Td><Td><select value={i.status} onChange={(e) => invoiceStatus(i.id, e.target.value)} style={{ padding: 6 }}><option>Draft</option><option>Sent</option><option>Partially Paid</option><option>Paid</option><option>Cancelled</option></select></Td><Td><button style={smallBtn} onClick={() => editInvoice(i)}>Edit</button><button style={dangerBtn} onClick={() => deleteInvoice(i.id)}>Delete</button></Td></tr>)}
        </DataTable>
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: any }) { return <div style={box}><b>{title}</b><h1>{value}</h1></div>; }
function Input({ label, value, onChange, type = 'text' }: any) { return <><label>{label}</label><input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} style={input} /></>; }
function DataTable({ title, headers, children }: any) { return <div style={{ ...box, marginTop: 25 }}><h2>{title}</h2><div style={{ overflowX: 'auto' }}><table style={table}><thead><tr>{headers.map((h: string) => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div></div>; }
function Td({ children }: any) { return <td style={td}>{children}</td>; }

const box = { background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 4px 15px #ddd' };
const pill = { background: 'white', padding: '10px 18px', borderRadius: 22, border: 0, boxShadow: '0 3px 12px #ddd', cursor: 'pointer' };
const input = { width: '100%', padding: 10, margin: '8px 0 15px', border: '1px solid #ccc', borderRadius: 6 };
const buttonBlue = { background: '#2563eb', color: 'white', padding: '10px 15px', border: 0, borderRadius: 6, marginRight: 8, cursor: 'pointer' };
const buttonGreen = { background: '#059669', color: 'white', padding: '10px 15px', border: 0, borderRadius: 6, marginRight: 8, cursor: 'pointer' };
const buttonGray = { background: '#6b7280', color: 'white', padding: '10px 15px', border: 0, borderRadius: 6, cursor: 'pointer' };
const smallBtn = { background: '#2563eb', color: 'white', padding: '6px 10px', border: 0, borderRadius: 5, marginRight: 6, cursor: 'pointer' };
const dangerBtn = { background: '#dc2626', color: 'white', padding: '6px 10px', border: 0, borderRadius: 5, cursor: 'pointer' };
const badge = { background: '#dbeafe', color: '#1d4ed8', padding: '4px 8px', borderRadius: 20 };
const table = { width: '100%', borderCollapse: 'collapse' as const };
const th = { textAlign: 'left' as const, padding: 12, background: '#f8fafc', borderBottom: '1px solid #e5e7eb' };
const td = { padding: 12, borderBottom: '1px solid #e5e7eb' };
