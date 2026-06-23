'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Customer = { id?: number; name: string; phone: string; email: string; address: string };
type Job = { id?: number; customer: string; service: string; job_date: string; amount: string; status: string };
type Invoice = {
  id?: number;
  invoice_no: string;
  customer: string;
  job_id?: number | null;
  amount: string;
  invoice_date: string;
  due_date: string;
  status: string;
  notes?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
};
type Payment = {
  id?: number;
  invoice_id?: number | null;
  invoice_no: string;
  customer: string;
  payment_date: string;
  amount: string;
  payment_method: string;
  notes: string;
};

const LOGO_SRC = '/aashan-logo.png';

const emptyCustomer: Customer = { name: '', phone: '', email: '', address: '' };
const emptyJob: Job = { customer: '', service: '', job_date: '', amount: '', status: 'New' };
const emptyInvoice: Invoice = {
  invoice_no: '',
  customer: '',
  job_id: null,
  amount: '',
  invoice_date: '',
  due_date: '',
  status: 'Draft',
  notes: 'Thank you for choosing Aashan & Co LLC.',
  customer_phone: '',
  customer_email: '',
  customer_address: '',
};
const emptyPayment: Payment = { invoice_id: null, invoice_no: '', customer: '', payment_date: '', amount: '', payment_method: 'Cash', notes: '' };

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'jobs' | 'invoices' | 'payments'>('dashboard');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [job, setJob] = useState<Job>(emptyJob);
  const [invoice, setInvoice] = useState<Invoice>(emptyInvoice);
  const [payment, setPayment] = useState<Payment>(emptyPayment);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    const { data: customerData, error: customerError } = await supabase.from('customers').select('*').order('id', { ascending: false });
    const { data: jobData, error: jobError } = await supabase.from('jobs').select('*').order('id', { ascending: false });
    const { data: invoiceData, error: invoiceError } = await supabase.from('invoices').select('*').order('id', { ascending: false });
    const { data: paymentData, error: paymentError } = await supabase.from('payments').select('*').order('id', { ascending: false });

    if (customerError) alert(customerError.message);
    if (jobError) alert(jobError.message);
    if (invoiceError) alert(invoiceError.message);
    if (paymentError) alert(paymentError.message);

    setCustomers(customerData || []);
    setJobs((jobData || []).map((j: any) => ({ ...j, amount: String(j.amount || '') })));
    setInvoices((invoiceData || []).map((i: any) => ({ ...i, amount: String(i.amount || '') })));
    setPayments((paymentData || []).map((p: any) => ({ ...p, amount: String(p.amount || '') })));
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (printInvoice) {
      setTimeout(() => window.print(), 250);
    }
  }, [printInvoice]);

  function nextInvoiceNo() {
    const maxNo = invoices.reduce((max, inv) => {
      const num = Number(String(inv.invoice_no || '').replace(/[^0-9]/g, ''));
      return Number.isFinite(num) && num > max ? num : max;
    }, 1000);
    return `INV-${String(maxNo + 1).padStart(4, '0')}`;
  }

  function invoicePaidAmount(invoiceId?: number, invoiceNo?: string) {
    return payments
      .filter((p) => Number(p.invoice_id) === Number(invoiceId) || p.invoice_no === invoiceNo)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }

  function invoiceBalance(inv: Invoice) {
    return Math.max(Number(inv.amount || 0) - invoicePaidAmount(inv.id, inv.invoice_no), 0);
  }

  function getCustomerByName(name: string) {
    return customers.find((c) => c.name === name);
  }

  function getJobById(jobId?: number | null) {
    return jobs.find((j) => Number(j.id) === Number(jobId));
  }

  async function refreshInvoicePaymentStatus(inv: Invoice) {
    if (!inv.id) return;
    const balance = invoiceBalance(inv);
    const paid = invoicePaidAmount(inv.id, inv.invoice_no);
    let status = inv.status;

    if (paid <= 0) status = inv.status === 'Draft' ? 'Draft' : 'Sent';
    else if (balance <= 0) status = 'Paid';
    else status = 'Partially Paid';

    await supabase.from('invoices').update({ status }).eq('id', inv.id);

    if (inv.job_id && status === 'Paid') {
      await supabase.from('jobs').update({ status: 'Paid' }).eq('id', inv.job_id);
    }
  }

  async function saveCustomer() {
    if (!customer.name.trim()) return alert('Enter customer name');
    const payload = { name: customer.name.trim(), phone: customer.phone || '', email: customer.email || '', address: customer.address || '' };
    const res = editingCustomerId
      ? await supabase.from('customers').update(payload).eq('id', editingCustomerId)
      : await supabase.from('customers').insert([payload]);
    if (res.error) return alert(res.error.message);
    setCustomer(emptyCustomer); setEditingCustomerId(null); await loadData();
  }

  function editCustomer(c: Customer) {
    setCustomer(c); setEditingCustomerId(c.id || null); setActiveTab('customers'); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteCustomer(id?: number) {
    if (!id || !confirm('Delete this customer?')) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function saveJob() {
    if (!job.customer.trim() || !job.service.trim()) return alert('Enter customer and service');
    const payload = { customer: job.customer, service: job.service, job_date: job.job_date || null, amount: Number(job.amount || 0), status: job.status };
    const res = editingJobId
      ? await supabase.from('jobs').update(payload).eq('id', editingJobId)
      : await supabase.from('jobs').insert([payload]);
    if (res.error) return alert(res.error.message);
    setJob(emptyJob); setEditingJobId(null); await loadData();
  }

  function editJob(j: Job) {
    setJob({ ...j, amount: String(j.amount || '') }); setEditingJobId(j.id || null); setActiveTab('jobs'); window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteJob(id?: number) {
    if (!id || !confirm('Delete this job?')) return;
    const { error } = await supabase.from('jobs').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function quickJobStatus(id: number | undefined, status: string) {
    if (!id) return;
    const { error } = await supabase.from('jobs').update({ status }).eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  function fillInvoiceFromJob(jobIdValue: string) {
    if (!jobIdValue) return setInvoice({ ...invoice, job_id: null });
    const selected = jobs.find((j) => String(j.id) === jobIdValue);
    if (!selected) return;
    const today = new Date().toISOString().slice(0, 10);
    const c = getCustomerByName(selected.customer);

    setInvoice({
      invoice_no: invoice.invoice_no || nextInvoiceNo(),
      customer: selected.customer,
      job_id: selected.id || null,
      amount: String(selected.amount || ''),
      invoice_date: invoice.invoice_date || today,
      due_date: invoice.due_date || today,
      status: invoice.status || 'Draft',
      notes: invoice.notes || 'Thank you for choosing Aashan & Co LLC.',
      customer_phone: c?.phone || '',
      customer_email: c?.email || '',
      customer_address: c?.address || '',
    });
  }

  function fillInvoiceCustomer(customerName: string) {
    const c = getCustomerByName(customerName);
    setInvoice({
      ...invoice,
      customer: customerName,
      customer_phone: c?.phone || '',
      customer_email: c?.email || '',
      customer_address: c?.address || '',
    });
  }

  async function saveInvoice() {
    if (!invoice.customer.trim()) return alert('Select customer');
    if (!invoice.amount) return alert('Enter invoice amount');

    const c = getCustomerByName(invoice.customer);
    const payload = {
      invoice_no: invoice.invoice_no || nextInvoiceNo(),
      customer: invoice.customer,
      job_id: invoice.job_id || null,
      amount: Number(invoice.amount || 0),
      invoice_date: invoice.invoice_date || null,
      due_date: invoice.due_date || null,
      status: invoice.status,
      notes: invoice.notes || '',
      customer_phone: invoice.customer_phone || c?.phone || '',
      customer_email: invoice.customer_email || c?.email || '',
      customer_address: invoice.customer_address || c?.address || '',
    };

    const res = editingInvoiceId
      ? await supabase.from('invoices').update(payload).eq('id', editingInvoiceId)
      : await supabase.from('invoices').insert([payload]);

    if (res.error) return alert(res.error.message);

    if (payload.job_id) {
      await supabase.from('jobs').update({ status: payload.status === 'Paid' ? 'Paid' : 'Invoiced' }).eq('id', payload.job_id);
    }

    setInvoice(emptyInvoice); setEditingInvoiceId(null); await loadData();
  }

  function editInvoice(inv: Invoice) {
    const c = getCustomerByName(inv.customer);
    setInvoice({
      ...inv,
      amount: String(inv.amount || ''),
      customer_phone: inv.customer_phone || c?.phone || '',
      customer_email: inv.customer_email || c?.email || '',
      customer_address: inv.customer_address || c?.address || '',
    });
    setEditingInvoiceId(inv.id || null);
    setActiveTab('invoices');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteInvoice(id?: number) {
    if (!id || !confirm('Delete this invoice?')) return;
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function quickInvoiceStatus(id: number | undefined, status: string) {
    if (!id) return;
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  function fillPaymentFromInvoice(invoiceIdValue: string) {
    if (!invoiceIdValue) return setPayment(emptyPayment);
    const selected = invoices.find((i) => String(i.id) === invoiceIdValue);
    if (!selected) return;
    const today = new Date().toISOString().slice(0, 10);
    setPayment({
      invoice_id: selected.id || null,
      invoice_no: selected.invoice_no,
      customer: selected.customer,
      payment_date: payment.payment_date || today,
      amount: String(invoiceBalance(selected) || ''),
      payment_method: payment.payment_method || 'Cash',
      notes: payment.notes || '',
    });
  }

  async function savePayment() {
    if (!payment.invoice_id) return alert('Select invoice');
    if (!payment.amount) return alert('Enter payment amount');

    const payload = {
      invoice_id: payment.invoice_id,
      invoice_no: payment.invoice_no,
      customer: payment.customer,
      payment_date: payment.payment_date || null,
      amount: Number(payment.amount || 0),
      payment_method: payment.payment_method,
      notes: payment.notes || '',
    };

    const res = editingPaymentId
      ? await supabase.from('payments').update(payload).eq('id', editingPaymentId)
      : await supabase.from('payments').insert([payload]);

    if (res.error) return alert(res.error.message);

    const relatedInvoice = invoices.find((i) => Number(i.id) === Number(payload.invoice_id));
    setPayment(emptyPayment);
    setEditingPaymentId(null);
    await loadData();

    if (relatedInvoice) {
      setTimeout(async () => {
        await refreshInvoicePaymentStatus(relatedInvoice);
        await loadData();
      }, 300);
    }
  }

  function editPayment(p: Payment) {
    setPayment({ ...p, amount: String(p.amount || '') });
    setEditingPaymentId(p.id || null);
    setActiveTab('payments');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deletePayment(id?: number) {
    if (!id || !confirm('Delete this payment?')) return;
    const target = payments.find((p) => p.id === id);
    const { error } = await supabase.from('payments').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadData();

    if (target?.invoice_id) {
      const relatedInvoice = invoices.find((i) => Number(i.id) === Number(target.invoice_id));
      if (relatedInvoice) {
        setTimeout(async () => {
          await refreshInvoicePaymentStatus(relatedInvoice);
          await loadData();
        }, 300);
      }
    }
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
  const filteredPayments = payments.filter((p) => [p.invoice_no, p.customer, p.payment_date, p.payment_method, p.amount, p.notes].join(' ').toLowerCase().includes(q));

  const invoicedJobIds = invoices.map((i) => Number(i.job_id)).filter(Boolean);
  const availableInvoiceJobs = jobs.filter((j) => !invoicedJobIds.includes(Number(j.id)) || Number(j.id) === Number(invoice.job_id));
  const payableInvoices = invoices.filter((i) => invoiceBalance(i) > 0 || Number(i.id) === Number(payment.invoice_id));

  const outstanding = invoices.filter((i) => i.status !== 'Cancelled').reduce((sum, i) => sum + invoiceBalance(i), 0);
  const paidRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const openInvoices = invoices.filter((i) => invoiceBalance(i) > 0 && i.status !== 'Cancelled').length;
  const jobsInProgress = jobs.filter((j) => j.status === 'In Progress').length;
  const completedJobs = jobs.filter((j) => ['Completed', 'Invoiced', 'Paid'].includes(j.status)).length;

  return (
    <main style={styles.page}>
      <style>{printCss}</style>

      <div className="app-screen">
        <header style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>Aashan ERP Web</h1>
            <p style={styles.headerSub}>Aashan & Co LLC - Customers, Jobs, Invoices, Payments & Manager.io Export</p>
          </div>
          <div style={styles.phaseBadge}>Phase 5 PDF Invoice</div>
        </header>

        <section style={styles.container}>
          <div style={styles.toolbar}>
            {(['dashboard', 'customers', 'jobs', 'invoices', 'payments'] as const).map((tab) => (
              <button key={tab} style={activeTab === tab ? styles.tabActive : styles.tab} onClick={() => setActiveTab(tab)}>
                {tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
            <button style={styles.tab} onClick={() => exportCsv('manager-customers.csv', [['Name', 'Phone', 'Email', 'Address'], ...customers.map(c => [c.name, c.phone, c.email, c.address])])}>Export Customers</button>
            <button style={styles.tab} onClick={() => exportCsv('manager-invoices.csv', [['Invoice Number', 'Customer', 'Invoice Date', 'Due Date', 'Amount', 'Status'], ...invoices.map(i => [i.invoice_no, i.customer, i.invoice_date, i.due_date, i.amount, i.status])])}>Export Invoices</button>
            <button style={styles.tab} onClick={() => exportCsv('manager-payments.csv', [['Invoice Number', 'Customer', 'Payment Date', 'Amount', 'Method', 'Notes'], ...payments.map(p => [p.invoice_no, p.customer, p.payment_date, p.amount, p.payment_method, p.notes])])}>Export Payments</button>
          </div>

          <input placeholder="Search customer, job, invoice, payment, status..." value={search} onChange={(e) => setSearch(e.target.value)} style={styles.search} />
          {loading && <p>Loading...</p>}

          <div style={styles.cards}>
            <Card title="Customers" value={customers.length} />
            <Card title="Jobs" value={jobs.length} />
            <Card title="Invoices" value={invoices.length} />
            <Card title="Open Invoices" value={openInvoices} />
            <Card title="Outstanding" value={`$${outstanding.toFixed(2)}`} />
            <Card title="Paid Revenue" value={`$${paidRevenue.toFixed(2)}`} />
            <Card title="In Progress" value={jobsInProgress} />
            <Card title="Completed Jobs" value={completedJobs} />
          </div>

          {(activeTab === 'dashboard' || activeTab === 'customers') && (
            <>
              <SectionCard title={editingCustomerId ? 'Edit Customer' : 'Add Customer'}>
                <div style={styles.formGrid2}>
                  <Input label="Name" value={customer.name} onChange={(v: string) => setCustomer({ ...customer, name: v })} />
                  <Input label="Phone" value={customer.phone} onChange={(v: string) => setCustomer({ ...customer, phone: v })} />
                  <Input label="Email" value={customer.email} onChange={(v: string) => setCustomer({ ...customer, email: v })} />
                  <Input label="Address" value={customer.address} onChange={(v: string) => setCustomer({ ...customer, address: v })} />
                </div>
                <ButtonRow>
                  <button onClick={saveCustomer} style={styles.primaryBtn}>{editingCustomerId ? 'Update Customer' : 'Save Customer'}</button>
                  {editingCustomerId && <button onClick={() => { setCustomer(emptyCustomer); setEditingCustomerId(null); }} style={styles.grayBtn}>Cancel</button>}
                </ButtonRow>
              </SectionCard>

              <DataTable title="Customer List" headers={['Name', 'Phone', 'Email', 'Address', 'Actions']}>
                {filteredCustomers.map((c) => <tr key={c.id}><Td>{c.name}</Td><Td>{c.phone}</Td><Td>{c.email}</Td><Td>{c.address}</Td><Td><button style={styles.smallBtn} onClick={() => editCustomer(c)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteCustomer(c.id)}>Delete</button></Td></tr>)}
              </DataTable>
            </>
          )}

          {(activeTab === 'dashboard' || activeTab === 'jobs') && (
            <>
              <SectionCard title={editingJobId ? 'Edit Job / Quote' : 'Add Job / Quote'}>
                <div style={styles.formGrid2}>
                  <Field label="Customer"><select value={job.customer} onChange={(e) => setJob({ ...job, customer: e.target.value })} style={styles.input}><option value="">Select Customer</option>{customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></Field>
                  <Input label="Service" value={job.service} onChange={(v: string) => setJob({ ...job, service: v })} />
                  <Input label="Date" type="date" value={job.job_date} onChange={(v: string) => setJob({ ...job, job_date: v })} />
                  <Input label="Amount" value={job.amount} onChange={(v: string) => setJob({ ...job, amount: v })} />
                  <Field label="Status"><select value={job.status} onChange={(e) => setJob({ ...job, status: e.target.value })} style={styles.input}><option>New</option><option>Quoted</option><option>In Progress</option><option>Completed</option><option>Invoiced</option><option>Paid</option></select></Field>
                </div>
                <ButtonRow>
                  <button onClick={saveJob} style={styles.greenBtn}>{editingJobId ? 'Update Job' : 'Save Job'}</button>
                  {editingJobId && <button onClick={() => { setJob(emptyJob); setEditingJobId(null); }} style={styles.grayBtn}>Cancel</button>}
                </ButtonRow>
              </SectionCard>

              <DataTable title="Jobs & Quotes" headers={['Customer', 'Service', 'Date', 'Amount', 'Status', 'Quick Status', 'Actions']}>
                {filteredJobs.map((j) => <tr key={j.id}><Td>{j.customer}</Td><Td>{j.service}</Td><Td>{j.job_date}</Td><Td>${Number(j.amount || 0).toFixed(2)}</Td><Td><StatusBadge status={j.status} /></Td><Td><select value={j.status} onChange={(e) => quickJobStatus(j.id, e.target.value)} style={styles.smallSelect}><option>New</option><option>Quoted</option><option>In Progress</option><option>Completed</option><option>Invoiced</option><option>Paid</option></select></Td><Td><button style={styles.smallBtn} onClick={() => editJob(j)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteJob(j.id)}>Delete</button></Td></tr>)}
              </DataTable>
            </>
          )}

          {(activeTab === 'dashboard' || activeTab === 'invoices') && (
            <>
              <SectionCard title={editingInvoiceId ? 'Edit Invoice' : 'Create Invoice'}>
                <div style={styles.formGrid2}>
                  <Field label="From Job"><select value={invoice.job_id ? String(invoice.job_id) : ''} onChange={(e) => fillInvoiceFromJob(e.target.value)} style={styles.input}><option value="">Select Job</option>{availableInvoiceJobs.map((j) => <option key={j.id} value={j.id}>{j.customer} - {j.service} - ${j.amount}</option>)}</select></Field>
                  <Input label="Invoice No" value={invoice.invoice_no} onChange={(v: string) => setInvoice({ ...invoice, invoice_no: v })} />
                  <Field label="Customer"><select value={invoice.customer} onChange={(e) => fillInvoiceCustomer(e.target.value)} style={styles.input}><option value="">Select Customer</option>{customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></Field>
                  <Input label="Invoice Date" type="date" value={invoice.invoice_date} onChange={(v: string) => setInvoice({ ...invoice, invoice_date: v })} />
                  <Input label="Due Date" type="date" value={invoice.due_date} onChange={(v: string) => setInvoice({ ...invoice, due_date: v })} />
                  <Input label="Amount" value={invoice.amount} onChange={(v: string) => setInvoice({ ...invoice, amount: v })} />
                  <Input label="Customer Phone" value={invoice.customer_phone || ''} onChange={(v: string) => setInvoice({ ...invoice, customer_phone: v })} />
                  <Input label="Customer Email" value={invoice.customer_email || ''} onChange={(v: string) => setInvoice({ ...invoice, customer_email: v })} />
                  <Input label="Customer Address" value={invoice.customer_address || ''} onChange={(v: string) => setInvoice({ ...invoice, customer_address: v })} />
                  <Field label="Status"><select value={invoice.status} onChange={(e) => setInvoice({ ...invoice, status: e.target.value })} style={styles.input}><option>Draft</option><option>Sent</option><option>Partially Paid</option><option>Paid</option><option>Cancelled</option></select></Field>
                  <Input label="Notes" value={invoice.notes || ''} onChange={(v: string) => setInvoice({ ...invoice, notes: v })} />
                </div>
                <ButtonRow>
                  <button onClick={saveInvoice} style={styles.primaryBtn}>{editingInvoiceId ? 'Update Invoice' : 'Save Invoice'}</button>
                  {editingInvoiceId && <button onClick={() => { setInvoice(emptyInvoice); setEditingInvoiceId(null); }} style={styles.grayBtn}>Cancel</button>}
                </ButtonRow>
              </SectionCard>

              <DataTable title="Invoices" headers={['Invoice #', 'Customer', 'Invoice Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Status', 'Actions']}>
                {filteredInvoices.map((i) => <tr key={i.id}><Td>{i.invoice_no}</Td><Td>{i.customer}</Td><Td>{i.invoice_date}</Td><Td>{i.due_date}</Td><Td>${Number(i.amount || 0).toFixed(2)}</Td><Td>${invoicePaidAmount(i.id, i.invoice_no).toFixed(2)}</Td><Td>${invoiceBalance(i).toFixed(2)}</Td><Td><StatusBadge status={i.status} /></Td><Td><button style={styles.printBtn} onClick={() => setPrintInvoice(i)}>Print</button><button style={styles.smallBtn} onClick={() => editInvoice(i)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteInvoice(i.id)}>Delete</button></Td></tr>)}
              </DataTable>
            </>
          )}

          {(activeTab === 'dashboard' || activeTab === 'payments') && (
            <>
              <SectionCard title={editingPaymentId ? 'Edit Payment' : 'Record Payment'}>
                <div style={styles.formGrid2}>
                  <Field label="Invoice"><select value={payment.invoice_id ? String(payment.invoice_id) : ''} onChange={(e) => fillPaymentFromInvoice(e.target.value)} style={styles.input}><option value="">Select Invoice</option>{payableInvoices.map((i) => <option key={i.id} value={i.id}>{i.invoice_no} - {i.customer} - Balance ${invoiceBalance(i).toFixed(2)}</option>)}</select></Field>
                  <Input label="Customer" value={payment.customer} onChange={(v: string) => setPayment({ ...payment, customer: v })} />
                  <Input label="Payment Date" type="date" value={payment.payment_date} onChange={(v: string) => setPayment({ ...payment, payment_date: v })} />
                  <Input label="Amount" value={payment.amount} onChange={(v: string) => setPayment({ ...payment, amount: v })} />
                  <Field label="Payment Method"><select value={payment.payment_method} onChange={(e) => setPayment({ ...payment, payment_method: e.target.value })} style={styles.input}><option>Cash</option><option>Check</option><option>Zelle</option><option>Venmo</option><option>Credit Card</option><option>Bank Transfer</option><option>Other</option></select></Field>
                  <Input label="Notes" value={payment.notes} onChange={(v: string) => setPayment({ ...payment, notes: v })} />
                </div>
                <ButtonRow>
                  <button onClick={savePayment} style={styles.primaryBtn}>{editingPaymentId ? 'Update Payment' : 'Save Payment'}</button>
                  {editingPaymentId && <button onClick={() => { setPayment(emptyPayment); setEditingPaymentId(null); }} style={styles.grayBtn}>Cancel</button>}
                </ButtonRow>
              </SectionCard>

              <DataTable title="Payments" headers={['Invoice #', 'Customer', 'Date', 'Amount', 'Method', 'Notes', 'Actions']}>
                {filteredPayments.map((p) => <tr key={p.id}><Td>{p.invoice_no}</Td><Td>{p.customer}</Td><Td>{p.payment_date}</Td><Td>${Number(p.amount || 0).toFixed(2)}</Td><Td>{p.payment_method}</Td><Td>{p.notes}</Td><Td><button style={styles.smallBtn} onClick={() => editPayment(p)}>Edit</button><button style={styles.dangerBtn} onClick={() => deletePayment(p.id)}>Delete</button></Td></tr>)}
              </DataTable>
            </>
          )}
        </section>
      </div>

      {printInvoice && (
        <div className="invoice-print">
          <div className="invoice-page">
            <div className="invoice-header">
              <div>
                <img src={LOGO_SRC} className="invoice-logo" alt="Aashan & Co LLC" />
                <h1>Aashan & Co LLC</h1>
                <p>Quality Work Through Dedication</p>
              </div>
              <div className="invoice-company">
                <p><b>Phone:</b> (832) 210-4248</p>
                <p><b>Email:</b> support@aashan.co</p>
                <p><b>Location:</b> Dallas, Texas</p>
              </div>
            </div>

            <div className="invoice-title-row">
              <div>
                <h2>INVOICE</h2>
                <p><b>Invoice #:</b> {printInvoice.invoice_no}</p>
                <p><b>Status:</b> {printInvoice.status}</p>
              </div>
              <div>
                <p><b>Invoice Date:</b> {printInvoice.invoice_date}</p>
                <p><b>Due Date:</b> {printInvoice.due_date}</p>
              </div>
            </div>

            <div className="invoice-billto">
              <h3>Bill To</h3>
              <p><b>{printInvoice.customer}</b></p>
              <p>{printInvoice.customer_address || getCustomerByName(printInvoice.customer)?.address}</p>
              <p>{printInvoice.customer_phone || getCustomerByName(printInvoice.customer)?.phone}</p>
              <p>{printInvoice.customer_email || getCustomerByName(printInvoice.customer)?.email}</p>
            </div>

            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{getJobById(printInvoice.job_id)?.service || 'Service'}</td>
                  <td>${Number(printInvoice.amount || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div className="invoice-total">
              <p><span>Subtotal:</span> <b>${Number(printInvoice.amount || 0).toFixed(2)}</b></p>
              <p><span>Paid:</span> <b>${invoicePaidAmount(printInvoice.id, printInvoice.invoice_no).toFixed(2)}</b></p>
              <p><span>Balance Due:</span> <b>${invoiceBalance(printInvoice).toFixed(2)}</b></p>
            </div>

            <div className="invoice-notes">
              <h3>Notes</h3>
              <p>{printInvoice.notes || 'Thank you for choosing Aashan & Co LLC.'}</p>
              <p>Payment due within agreed terms.</p>
            </div>

            <div className="invoice-footer">
              Thank you for choosing Aashan & Co LLC.
            </div>
          </div>
          <button className="close-print" onClick={() => setPrintInvoice(null)}>Close Print Preview</button>
        </div>
      )}
    </main>
  );
}

function Card({ title, value }: { title: string; value: any }) {
  return <div style={styles.card}><div style={styles.cardTitle}>{title}</div><div style={styles.cardValue}>{value}</div></div>;
}
function SectionCard({ title, children }: any) {
  return <div style={styles.sectionCard}><h2 style={styles.sectionTitle}>{title}</h2>{children}</div>;
}
function Field({ label, children }: any) {
  return <div style={styles.field}><label style={styles.label}>{label}</label>{children}</div>;
}
function Input({ label, value, onChange, type = 'text' }: any) {
  return <Field label={label}><input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} style={styles.input} /></Field>;
}
function DataTable({ title, headers, children }: any) {
  return <div style={styles.sectionCard}><h2 style={styles.sectionTitle}>{title}</h2><div style={{ overflowX: 'auto' }}><table style={styles.table}><thead><tr>{headers.map((h: string) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div></div>;
}
function Td({ children }: any) { return <td style={styles.td}>{children}</td>; }
function ButtonRow({ children }: any) { return <div style={styles.buttonRow}>{children}</div>; }
function StatusBadge({ status }: { status: string }) {
  const color = status === 'Paid' ? styles.badgeGreen : status === 'Partially Paid' ? styles.badgeOrange : status === 'Cancelled' ? styles.badgeRed : status === 'Sent' || status === 'Invoiced' ? styles.badgeBlue : styles.badgeGray;
  return <span style={{ ...styles.badge, ...color }}>{status}</span>;
}

const styles: Record<string, any> = {
  page: { fontFamily: 'Arial, sans-serif', background: '#f3f6fa', minHeight: '100vh', color: '#0f172a' },
  header: { background: '#0f172a', color: 'white', padding: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
  headerTitle: { margin: 0, fontSize: 28 },
  headerSub: { margin: '6px 0 0', opacity: 0.9 },
  phaseBadge: { background: '#1d4ed8', padding: '8px 14px', borderRadius: 999, fontWeight: 700 },
  container: { maxWidth: 1280, margin: '0 auto', padding: 22 },
  toolbar: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 },
  tab: { background: 'white', padding: '10px 18px', borderRadius: 999, border: '1px solid #e5e7eb', boxShadow: '0 3px 10px rgba(15,23,42,0.08)', cursor: 'pointer' },
  tabActive: { background: '#2563eb', color: 'white', padding: '10px 18px', borderRadius: 999, border: '1px solid #2563eb', boxShadow: '0 3px 10px rgba(37,99,235,0.25)', cursor: 'pointer' },
  search: { width: '100%', maxWidth: 520, padding: 12, margin: '0 0 20px', border: '1px solid #cbd5e1', borderRadius: 10, boxSizing: 'border-box', background: 'white' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 22 },
  card: { background: 'white', padding: 18, borderRadius: 16, boxShadow: '0 8px 20px rgba(15,23,42,0.08)', minHeight: 92 },
  cardTitle: { fontWeight: 700, color: '#334155', marginBottom: 10 },
  cardValue: { fontSize: 28, fontWeight: 800 },
  sectionCard: { background: 'white', padding: 22, borderRadius: 16, boxShadow: '0 8px 20px rgba(15,23,42,0.08)', marginTop: 22 },
  sectionTitle: { marginTop: 0, marginBottom: 18 },
  formGrid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, alignItems: 'end' },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 14, fontWeight: 700, color: '#0f172a' },
  input: { width: '100%', height: 42, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box', background: 'white' },
  buttonRow: { display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' },
  primaryBtn: { background: '#2563eb', color: 'white', padding: '10px 16px', border: 0, borderRadius: 8, cursor: 'pointer', fontWeight: 700 },
  greenBtn: { background: '#059669', color: 'white', padding: '10px 16px', border: 0, borderRadius: 8, cursor: 'pointer', fontWeight: 700 },
  grayBtn: { background: '#64748b', color: 'white', padding: '10px 16px', border: 0, borderRadius: 8, cursor: 'pointer', fontWeight: 700 },
  smallBtn: { background: '#2563eb', color: 'white', padding: '7px 10px', border: 0, borderRadius: 7, marginRight: 6, cursor: 'pointer' },
  printBtn: { background: '#111827', color: 'white', padding: '7px 10px', border: 0, borderRadius: 7, marginRight: 6, cursor: 'pointer' },
  dangerBtn: { background: '#dc2626', color: 'white', padding: '7px 10px', border: 0, borderRadius: 7, cursor: 'pointer' },
  smallSelect: { padding: 7, border: '1px solid #cbd5e1', borderRadius: 7 },
  badge: { padding: '5px 9px', borderRadius: 999, fontWeight: 700, fontSize: 12 },
  badgeGreen: { background: '#dcfce7', color: '#166534' },
  badgeOrange: { background: '#ffedd5', color: '#9a3412' },
  badgeRed: { background: '#fee2e2', color: '#991b1b' },
  badgeBlue: { background: '#dbeafe', color: '#1d4ed8' },
  badgeGray: { background: '#e5e7eb', color: '#374151' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: 12, background: '#f8fafc', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
  td: { padding: 12, borderBottom: '1px solid #e5e7eb', verticalAlign: 'middle' },
};

const printCss = `
.invoice-print { display: none; }
@media print {
  body { margin: 0; background: white !important; }
  .app-screen { display: none !important; }
  .invoice-print { display: block !important; }
  .close-print { display: none !important; }
}
@media screen {
  .invoice-print {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.70);
    z-index: 9999;
    overflow: auto;
    padding: 30px;
  }
  .close-print {
    display: block;
    margin: 15px auto;
    padding: 10px 16px;
    border: none;
    background: #dc2626;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 700;
  }
}
.invoice-page {
  background: white;
  color: #111827;
  max-width: 850px;
  min-height: 1050px;
  margin: 0 auto;
  padding: 40px;
  box-sizing: border-box;
  font-family: Arial, sans-serif;
}
.invoice-header {
  display: flex;
  justify-content: space-between;
  border-bottom: 3px solid #0f172a;
  padding-bottom: 20px;
  gap: 25px;
}
.invoice-logo {
  width: 110px;
  height: 110px;
  object-fit: contain;
  border-radius: 12px;
}
.invoice-header h1 {
  margin: 10px 0 4px;
  color: #0f172a;
}
.invoice-header p {
  margin: 4px 0;
}
.invoice-company {
  text-align: right;
  font-size: 14px;
}
.invoice-title-row {
  display: flex;
  justify-content: space-between;
  margin-top: 28px;
  gap: 25px;
}
.invoice-title-row h2 {
  font-size: 34px;
  margin: 0 0 10px;
  color: #0f172a;
}
.invoice-billto {
  background: #f8fafc;
  padding: 18px;
  border-radius: 10px;
  margin-top: 25px;
}
.invoice-billto h3 {
  margin-top: 0;
}
.invoice-billto p {
  margin: 5px 0;
}
.invoice-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 25px;
}
.invoice-table th {
  background: #0f172a;
  color: white;
  padding: 12px;
  text-align: left;
}
.invoice-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 14px 12px;
}
.invoice-table td:last-child,
.invoice-table th:last-child {
  text-align: right;
}
.invoice-total {
  width: 320px;
  margin-left: auto;
  margin-top: 25px;
  background: #f8fafc;
  padding: 15px;
  border-radius: 10px;
}
.invoice-total p {
  display: flex;
  justify-content: space-between;
  margin: 8px 0;
  font-size: 16px;
}
.invoice-total p:last-child {
  font-size: 20px;
  border-top: 2px solid #0f172a;
  padding-top: 10px;
}
.invoice-notes {
  margin-top: 35px;
  border-top: 1px solid #e5e7eb;
  padding-top: 18px;
}
.invoice-footer {
  margin-top: 50px;
  text-align: center;
  font-weight: 700;
  color: #0f172a;
}
`;
