'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Customer = { id?: number; name: string; phone: string; email: string; address: string };
type Job = { id?: number; customer: string; service: string; job_date: string; amount: string; status: string };
type Quote = { id?: number; quote_no: string; customer: string; service: string; quote_date: string; amount: string; status: string; notes: string };
type WorkOrder = { id?: number; work_order_no: string; job_id?: number | null; customer: string; service: string; technician: string; scheduled_date: string; start_time: string; end_time: string; status: string; notes: string };
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

type Vendor = {
  id?: number;
  vendor_no: string;
  vendor_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  tax_id: string;
  notes: string;
  status: string;
};

type Expense = {
  id?: number;
  expense_no: string;
  expense_date: string;
  vendor: string;
  category: string;
  description: string;
  amount: string;
  payment_method: string;
  status: string;
};

type CompanySettings = { id?: number; company_name: string; phone: string; email: string; website: string; address: string; logo_url: string; tax_rate: string; payment_terms: string; payment_instructions: string };
type NumberSequence = { id?: number; document_type: string; prefix: string; next_number: string; padding: string };
type Account = { id?: number; account_code: string; account_name: string; account_type: string; normal_balance: string; is_active: boolean };
type EmailSettings = { id?: number; from_name: string; from_email: string; reply_to_email: string; bcc_email: string };
type EmailTemplate = { id?: number; template_name: string; subject: string; body: string };

const LOGO_SRC = '/aashan-logo.png';

const emptyCustomer: Customer = { name: '', phone: '', email: '', address: '' };
const emptyJob: Job = { customer: '', service: '', job_date: '', amount: '', status: 'New' };
const emptyQuote: Quote = { quote_no: '', customer: '', service: '', quote_date: '', amount: '', status: 'Draft', notes: '' };
const emptyWorkOrder: WorkOrder = { work_order_no: '', job_id: null, customer: '', service: '', technician: '', scheduled_date: '', start_time: '', end_time: '', status: 'Scheduled', notes: '' };
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
const emptyVendor: Vendor = { vendor_no: '', vendor_name: '', contact_person: '', phone: '', email: '', address: '', tax_id: '', notes: '', status: 'Active' };
const emptyExpense: Expense = { expense_no: '', expense_date: '', vendor: '', category: 'Materials', description: '', amount: '', payment_method: 'Cash', status: 'Draft' };
const emptyCompany: CompanySettings = { company_name: 'Aashan & Co LLC', phone: '(832) 210-4248', email: 'support@aashan.co', website: 'www.aashan.co', address: 'Dallas, Texas', logo_url: '/aashan-logo.png', tax_rate: '0', payment_terms: 'Payment due within agreed terms.', payment_instructions: 'Please contact Aashan & Co LLC for payment options.' };
const emptySequence: NumberSequence = { document_type: '', prefix: '', next_number: '1001', padding: '4' };
const emptyAccount: Account = { account_code: '', account_name: '', account_type: 'Revenue', normal_balance: 'Credit', is_active: true };
const emptyEmailSettings: EmailSettings = { from_name: 'Aashan & Co LLC', from_email: 'support@aashan.co', reply_to_email: 'support@aashan.co', bcc_email: '' };
const emptyTemplate: EmailTemplate = { template_name: '', subject: '', body: '' };

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'vendors' | 'quotes' | 'jobs' | 'workorders' | 'calendar' | 'invoices' | 'payments' | 'expenses' | 'reports' | 'masters'>('dashboard');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [job, setJob] = useState<Job>(emptyJob);
  const [quote, setQuote] = useState<Quote>(emptyQuote);
  const [workOrder, setWorkOrder] = useState<WorkOrder>(emptyWorkOrder);
  const [invoice, setInvoice] = useState<Invoice>(emptyInvoice);
  const [payment, setPayment] = useState<Payment>(emptyPayment);
  const [vendor, setVendor] = useState<Vendor>(emptyVendor);
  const [expense, setExpense] = useState<Expense>(emptyExpense);
  const [company, setCompany] = useState<CompanySettings>(emptyCompany);
  const [sequences, setSequences] = useState<NumberSequence[]>([]);
  const [sequence, setSequence] = useState<NumberSequence>(emptySequence);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account>(emptyAccount);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(emptyEmailSettings);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [template, setTemplate] = useState<EmailTemplate>(emptyTemplate);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [editingWorkOrderId, setEditingWorkOrderId] = useState<number | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editingSequenceId, setEditingSequenceId] = useState<number | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    const { data: customerData, error: customerError } = await supabase.from('customers').select('*').order('id', { ascending: false });
    const { data: jobData, error: jobError } = await supabase.from('jobs').select('*').order('id', { ascending: false });
    const { data: quoteData, error: quoteError } = await supabase.from('quotes').select('*').order('id', { ascending: false });
    const { data: workOrderData, error: workOrderError } = await supabase.from('work_orders').select('*').order('scheduled_date', { ascending: true });
    const { data: invoiceData, error: invoiceError } = await supabase.from('invoices').select('*').order('id', { ascending: false });
    const { data: paymentData, error: paymentError } = await supabase.from('payments').select('*').order('id', { ascending: false });
    const { data: vendorData, error: vendorError } = await supabase.from('vendors').select('*').order('id', { ascending: false });
    const { data: expenseData, error: expenseError } = await supabase.from('expenses').select('*').order('id', { ascending: false });
    const { data: companyData } = await supabase.from('company_settings').select('*').limit(1);
    const { data: sequenceData } = await supabase.from('number_sequences').select('*').order('id', { ascending: true });
    const { data: accountData } = await supabase.from('chart_of_accounts').select('*').order('account_code', { ascending: true });
    const { data: emailSettingsData } = await supabase.from('email_settings').select('*').limit(1);
    const { data: templateData } = await supabase.from('email_templates').select('*').order('template_name', { ascending: true });

    if (customerError) alert(customerError.message);
    if (jobError) alert(jobError.message);
    if (quoteError) alert(quoteError.message);
    if (workOrderError) alert(workOrderError.message);
    if (invoiceError) alert(invoiceError.message);
    if (paymentError) alert(paymentError.message);
    if (vendorError) alert(vendorError.message);
    if (expenseError) alert(expenseError.message);

    setCustomers(customerData || []);
    setJobs((jobData || []).map((j: any) => ({ ...j, amount: String(j.amount || '') })));
    setQuotes((quoteData || []).map((q: any) => ({ ...q, amount: String(q.amount || '') })));
    setWorkOrders(workOrderData || []);
    setInvoices((invoiceData || []).map((i: any) => ({ ...i, amount: String(i.amount || '') })));
    setPayments((paymentData || []).map((p: any) => ({ ...p, amount: String(p.amount || '') })));
    setVendors(vendorData || []);
    setExpenses((expenseData || []).map((e: any) => ({ ...e, amount: String(e.amount || '') })));
    if (companyData && companyData.length > 0) setCompany({ ...emptyCompany, ...companyData[0], tax_rate: String(companyData[0].tax_rate || 0) });
    setSequences((sequenceData || []).map((s: any) => ({ ...s, next_number: String(s.next_number || ''), padding: String(s.padding || 4) })));
    setAccounts(accountData || []);
    if (emailSettingsData && emailSettingsData.length > 0) setEmailSettings({ ...emptyEmailSettings, ...emailSettingsData[0] });
    setTemplates(templateData || []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (printInvoice) {
      setTimeout(() => window.print(), 250);
    }
  }, [printInvoice]);

  function nextQuoteNo() {
    const maxNo = quotes.reduce((max, q) => {
      const num = Number(String(q.quote_no || '').replace(/[^0-9]/g, ''));
      return Number.isFinite(num) && num > max ? num : max;
    }, 1000);
    return `Q-${String(maxNo + 1).padStart(4, '0')}`;
  }

  function nextWorkOrderNo() {
    const maxNo = workOrders.reduce((max, wo) => {
      const num = Number(String(wo.work_order_no || '').replace(/[^0-9]/g, ''));
      return Number.isFinite(num) && num > max ? num : max;
    }, 1000);
    return `WO-${String(maxNo + 1).padStart(4, '0')}`;
  }

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


  async function saveQuote() {
    if (!quote.customer.trim() || !quote.service.trim()) return alert('Select customer and enter service');
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      quote_no: quote.quote_no || nextQuoteNo(),
      customer: quote.customer,
      service: quote.service,
      quote_date: quote.quote_date || today,
      amount: Number(quote.amount || 0),
      status: quote.status,
      notes: quote.notes || '',
    };

    const res = editingQuoteId
      ? await supabase.from('quotes').update(payload).eq('id', editingQuoteId)
      : await supabase.from('quotes').insert([payload]);

    if (res.error) return alert(res.error.message);
    setQuote(emptyQuote);
    setEditingQuoteId(null);
    await loadData();
  }

  function editQuote(q: Quote) {
    setQuote({ ...q, amount: String(q.amount || '') });
    setEditingQuoteId(q.id || null);
    setActiveTab('quotes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteQuote(id?: number) {
    if (!id || !confirm('Delete this quote?')) return;
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function quickQuoteStatus(id: number | undefined, status: string) {
    if (!id) return;
    const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function convertQuoteToJob(q: Quote) {
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      customer: q.customer,
      service: q.service,
      job_date: today,
      amount: Number(q.amount || 0),
      status: 'New',
    };
    const res = await supabase.from('jobs').insert([payload]);
    if (res.error) return alert(res.error.message);
    if (q.id) await supabase.from('quotes').update({ status: 'Approved' }).eq('id', q.id);
    await loadData();
    alert('Quote converted to Job');
  }

  async function convertQuoteToInvoice(q: Quote) {
    const today = new Date().toISOString().slice(0, 10);
    const c = getCustomerByName(q.customer);
    const payload = {
      invoice_no: nextInvoiceNo(),
      customer: q.customer,
      job_id: null,
      amount: Number(q.amount || 0),
      invoice_date: today,
      due_date: today,
      status: 'Draft',
      notes: q.notes || 'Thank you for choosing Aashan & Co LLC.',
      customer_phone: c?.phone || '',
      customer_email: c?.email || '',
      customer_address: c?.address || '',
    };
    const res = await supabase.from('invoices').insert([payload]);
    if (res.error) return alert(res.error.message);
    if (q.id) await supabase.from('quotes').update({ status: 'Approved' }).eq('id', q.id);
    await loadData();
    alert('Quote converted to Invoice');
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


  function fillWorkOrderFromJob(jobIdValue: string) {
    if (!jobIdValue) return setWorkOrder({ ...workOrder, job_id: null });
    const selected = jobs.find((j) => String(j.id) === jobIdValue);
    if (!selected) return;
    const today = new Date().toISOString().slice(0, 10);
    setWorkOrder({
      work_order_no: workOrder.work_order_no || nextWorkOrderNo(),
      job_id: selected.id || null,
      customer: selected.customer,
      service: selected.service,
      technician: workOrder.technician || '',
      scheduled_date: workOrder.scheduled_date || today,
      start_time: workOrder.start_time || '',
      end_time: workOrder.end_time || '',
      status: workOrder.status || 'Scheduled',
      notes: workOrder.notes || '',
    });
  }

  async function saveWorkOrder() {
    if (!workOrder.customer.trim() || !workOrder.service.trim()) return alert('Select job or enter customer and service');
    const payload = {
      work_order_no: workOrder.work_order_no || nextWorkOrderNo(),
      job_id: workOrder.job_id || null,
      customer: workOrder.customer,
      service: workOrder.service,
      technician: workOrder.technician,
      scheduled_date: workOrder.scheduled_date || null,
      start_time: workOrder.start_time,
      end_time: workOrder.end_time,
      status: workOrder.status,
      notes: workOrder.notes,
    };

    const res = editingWorkOrderId
      ? await supabase.from('work_orders').update(payload).eq('id', editingWorkOrderId)
      : await supabase.from('work_orders').insert([payload]);

    if (res.error) return alert(res.error.message);

    if (payload.job_id) {
      await supabase.from('jobs').update({ status: payload.status === 'Completed' ? 'Completed' : 'In Progress' }).eq('id', payload.job_id);
    }

    setWorkOrder(emptyWorkOrder);
    setEditingWorkOrderId(null);
    await loadData();
  }

  function editWorkOrder(wo: WorkOrder) {
    setWorkOrder(wo);
    setEditingWorkOrderId(wo.id || null);
    setActiveTab('workorders');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteWorkOrder(id?: number) {
    if (!id || !confirm('Delete this work order?')) return;
    const { error } = await supabase.from('work_orders').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function quickWorkOrderStatus(id: number | undefined, status: string, jobId?: number | null) {
    if (!id) return;
    const { error } = await supabase.from('work_orders').update({ status }).eq('id', id);
    if (error) return alert(error.message);
    if (jobId) await supabase.from('jobs').update({ status: status === 'Completed' ? 'Completed' : 'In Progress' }).eq('id', jobId);
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



  function nextVendorNo() {
    return `V-${String(vendors.length + 1).padStart(4, '0')}`;
  }

  function nextExpenseNo() {
    return `EXP-${String(expenses.length + 1).padStart(4, '0')}`;
  }

  async function saveVendor() {
    if (!vendor.vendor_name.trim()) return alert('Enter vendor name');
    const payload = {
      vendor_no: vendor.vendor_no || nextVendorNo(),
      vendor_name: vendor.vendor_name,
      contact_person: vendor.contact_person,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
      tax_id: vendor.tax_id,
      notes: vendor.notes,
      status: vendor.status,
    };

    const res = editingVendorId
      ? await supabase.from('vendors').update(payload).eq('id', editingVendorId)
      : await supabase.from('vendors').insert([payload]);

    if (res.error) return alert(res.error.message);
    setVendor(emptyVendor);
    setEditingVendorId(null);
    await loadData();
  }

  function editVendor(v: Vendor) {
    setVendor(v);
    setEditingVendorId(v.id || null);
    setActiveTab('vendors');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteVendor(id?: number) {
    if (!id || !confirm('Delete this vendor?')) return;
    const { error } = await supabase.from('vendors').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function saveExpense() {
    if (!expense.description.trim()) return alert('Enter expense description');
    const payload = {
      expense_no: expense.expense_no || nextExpenseNo(),
      expense_date: expense.expense_date || null,
      vendor: expense.vendor,
      category: expense.category,
      description: expense.description,
      amount: Number(expense.amount || 0),
      payment_method: expense.payment_method,
      status: expense.status,
    };

    const res = editingExpenseId
      ? await supabase.from('expenses').update(payload).eq('id', editingExpenseId)
      : await supabase.from('expenses').insert([payload]);

    if (res.error) return alert(res.error.message);
    setExpense(emptyExpense);
    setEditingExpenseId(null);
    await loadData();
  }

  function editExpense(e: Expense) {
    setExpense({ ...e, amount: String(e.amount || '') });
    setEditingExpenseId(e.id || null);
    setActiveTab('expenses');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteExpense(id?: number) {
    if (!id || !confirm('Delete this expense?')) return;
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function saveCompany() {
    const payload = { company_name: company.company_name, phone: company.phone, email: company.email, website: company.website, address: company.address, logo_url: company.logo_url, tax_rate: Number(company.tax_rate || 0), payment_terms: company.payment_terms, payment_instructions: company.payment_instructions };
    const res = company.id ? await supabase.from('company_settings').update(payload).eq('id', company.id) : await supabase.from('company_settings').insert([payload]);
    if (res.error) return alert(res.error.message);
    alert('Company settings saved');
    await loadData();
  }
  async function saveSequence() {
    if (!sequence.document_type.trim()) return alert('Enter document type');
    const payload = { document_type: sequence.document_type, prefix: sequence.prefix, next_number: Number(sequence.next_number || 1), padding: Number(sequence.padding || 4) };
    const res = editingSequenceId ? await supabase.from('number_sequences').update(payload).eq('id', editingSequenceId) : await supabase.from('number_sequences').insert([payload]);
    if (res.error) return alert(res.error.message);
    setSequence(emptySequence); setEditingSequenceId(null); await loadData();
  }
  function editSequence(s: NumberSequence) { setSequence({ ...s, next_number: String(s.next_number || ''), padding: String(s.padding || 4) }); setEditingSequenceId(s.id || null); }
  async function deleteSequence(id?: number) { if (!id || !confirm('Delete this number sequence?')) return; const { error } = await supabase.from('number_sequences').delete().eq('id', id); if (error) return alert(error.message); await loadData(); }
  async function saveAccount() {
    if (!account.account_code.trim() || !account.account_name.trim()) return alert('Enter account code and name');
    const payload = { account_code: account.account_code, account_name: account.account_name, account_type: account.account_type, normal_balance: account.normal_balance, is_active: account.is_active };
    const res = editingAccountId ? await supabase.from('chart_of_accounts').update(payload).eq('id', editingAccountId) : await supabase.from('chart_of_accounts').insert([payload]);
    if (res.error) return alert(res.error.message);
    setAccount(emptyAccount); setEditingAccountId(null); await loadData();
  }
  function editAccount(a: Account) { setAccount(a); setEditingAccountId(a.id || null); }
  async function deleteAccount(id?: number) { if (!id || !confirm('Delete this account?')) return; const { error } = await supabase.from('chart_of_accounts').delete().eq('id', id); if (error) return alert(error.message); await loadData(); }
  async function saveEmailSettings() {
    const payload = { from_name: emailSettings.from_name, from_email: emailSettings.from_email, reply_to_email: emailSettings.reply_to_email, bcc_email: emailSettings.bcc_email };
    const res = emailSettings.id ? await supabase.from('email_settings').update(payload).eq('id', emailSettings.id) : await supabase.from('email_settings').insert([payload]);
    if (res.error) return alert(res.error.message);
    alert('Email settings saved'); await loadData();
  }
  async function saveTemplate() {
    if (!template.template_name.trim()) return alert('Enter template name');
    const payload = { template_name: template.template_name, subject: template.subject, body: template.body };
    const res = editingTemplateId ? await supabase.from('email_templates').update(payload).eq('id', editingTemplateId) : await supabase.from('email_templates').insert([payload]);
    if (res.error) return alert(res.error.message);
    setTemplate(emptyTemplate); setEditingTemplateId(null); await loadData();
  }
  function editTemplate(t: EmailTemplate) { setTemplate(t); setEditingTemplateId(t.id || null); }
  async function deleteTemplate(id?: number) { if (!id || !confirm('Delete this template?')) return; const { error } = await supabase.from('email_templates').delete().eq('id', id); if (error) return alert(error.message); await loadData(); }
  function loadDefaultMasters() {
    setCompany(emptyCompany);
    setSequence({ document_type: 'Invoice', prefix: 'INV-', next_number: '1001', padding: '4' });
    setAccount({ account_code: '4000', account_name: 'Service Revenue', account_type: 'Revenue', normal_balance: 'Credit', is_active: true });
    setEmailSettings(emptyEmailSettings);
    setTemplate({ template_name: 'Invoice Email', subject: 'Invoice {{invoice_no}} from Aashan & Co LLC', body: 'Hi {{customer}},\n\nPlease find your invoice {{invoice_no}} for ${{amount}}.\n\nThank you for choosing Aashan & Co LLC.\n\nBest Regards,\nAashan & Co LLC' });
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
  const filteredQuotes = quotes.filter((qt) => [qt.quote_no, qt.customer, qt.service, qt.status, qt.quote_date, qt.amount].join(' ').toLowerCase().includes(q));
  const filteredWorkOrders = workOrders.filter((wo) => [wo.work_order_no, wo.customer, wo.service, wo.technician, wo.scheduled_date, wo.status].join(' ').toLowerCase().includes(q));
  const filteredInvoices = invoices.filter((i) => [i.invoice_no, i.customer, i.status, i.invoice_date, i.amount].join(' ').toLowerCase().includes(q));
  const filteredPayments = payments.filter((p) => [p.invoice_no, p.customer, p.payment_date, p.payment_method, p.amount, p.notes].join(' ').toLowerCase().includes(q));
  const filteredVendors = vendors.filter((v) => [v.vendor_no, v.vendor_name, v.contact_person, v.phone, v.email, v.status].join(' ').toLowerCase().includes(q));
  const filteredExpenses = expenses.filter((e) => [e.expense_no, e.vendor, e.category, e.description, e.payment_method, e.status].join(' ').toLowerCase().includes(q));

  const invoicedJobIds = invoices.map((i) => Number(i.job_id)).filter(Boolean);
  const availableInvoiceJobs = jobs.filter((j) => !invoicedJobIds.includes(Number(j.id)) || Number(j.id) === Number(invoice.job_id));
  const payableInvoices = invoices.filter((i) => invoiceBalance(i) > 0 || Number(i.id) === Number(payment.invoice_id));

  const outstanding = invoices.filter((i) => i.status !== 'Cancelled').reduce((sum, i) => sum + invoiceBalance(i), 0);
  const paidRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const openInvoices = invoices.filter((i) => invoiceBalance(i) > 0 && i.status !== 'Cancelled').length;
  const jobsInProgress = jobs.filter((j) => j.status === 'In Progress').length;
  const openQuotes = quotes.filter((qt) => ['Draft', 'Sent'].includes(qt.status)).length;
  const todayText = new Date().toISOString().slice(0, 10);
  const todaysWorkOrders = workOrders.filter((wo) => wo.scheduled_date === todayText).length;
  const scheduledWorkOrders = workOrders.filter((wo) => ['Scheduled', 'In Progress'].includes(wo.status)).length;
  const completedJobs = jobs.filter((j) => ['Completed', 'Invoiced', 'Paid'].includes(j.status)).length;
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = paidRevenue - totalExpenses;
  const approvedExpenses = expenses.filter((e) => ['Approved', 'Paid'].includes(e.status)).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const draftExpenses = expenses.filter((e) => ['Draft', 'Submitted'].includes(e.status)).reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <main style={styles.page}>
      <style>{printCss}</style>

      <div className="app-screen">
        <header style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>Aashan ERP Web</h1>
            <p style={styles.headerSub}>Aashan & Co LLC - Customers, Jobs, Invoices, Payments & Manager.io Export</p>
          </div>
          <div style={styles.phaseBadge}>Phase 6 Masters</div>
        </header>

        <section style={styles.container}>
          <div style={styles.toolbar}>
            {(['dashboard', 'customers', 'vendors', 'quotes', 'jobs', 'workorders', 'calendar', 'invoices', 'payments', 'expenses', 'reports', 'masters'] as const).map((tab) => (
              <button key={tab} style={activeTab === tab ? styles.tabActive : styles.tab} onClick={() => setActiveTab(tab)}>
                {tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
            <button style={styles.tab} onClick={() => exportCsv('manager-customers.csv', [['Name', 'Phone', 'Email', 'Address'], ...customers.map(c => [c.name, c.phone, c.email, c.address])])}>Export Customers</button>
            <button style={styles.tab} onClick={() => exportCsv('quotes.csv', [['Quote Number', 'Customer', 'Date', 'Service', 'Amount', 'Status'], ...quotes.map(q => [q.quote_no, q.customer, q.quote_date, q.service, q.amount, q.status])])}>Export Quotes</button>
            <button style={styles.tab} onClick={() => exportCsv('manager-invoices.csv', [['Invoice Number', 'Customer', 'Invoice Date', 'Due Date', 'Amount', 'Status'], ...invoices.map(i => [i.invoice_no, i.customer, i.invoice_date, i.due_date, i.amount, i.status])])}>Export Invoices</button>
            <button style={styles.tab} onClick={() => exportCsv('manager-payments.csv', [['Invoice Number', 'Customer', 'Payment Date', 'Amount', 'Method', 'Notes'], ...payments.map(p => [p.invoice_no, p.customer, p.payment_date, p.amount, p.payment_method, p.notes])])}>Export Payments</button>
            <button style={styles.tab} onClick={() => exportCsv('manager-expenses.csv', [['Expense Number', 'Date', 'Vendor', 'Category', 'Description', 'Amount', 'Method', 'Status'], ...expenses.map(e => [e.expense_no, e.expense_date, e.vendor, e.category, e.description, e.amount, e.payment_method, e.status])])}>Export Expenses</button>
          </div>

          <input placeholder="Search customer, job, invoice, payment, status..." value={search} onChange={(e) => setSearch(e.target.value)} style={styles.search} />
          {loading && <p>Loading...</p>}

          <div style={styles.cards}>
            <Card title="Customers" value={customers.length} />
            <Card title="Quotes" value={quotes.length} />
            <Card title="Open Quotes" value={openQuotes} />
            <Card title="Jobs" value={jobs.length} />
            <Card title="Work Orders" value={workOrders.length} />
            <Card title="Today Schedule" value={todaysWorkOrders} />
            <Card title="Invoices" value={invoices.length} />
            <Card title="Open Invoices" value={openInvoices} />
            <Card title="Outstanding" value={`$${outstanding.toFixed(2)}`} />
            <Card title="Paid Revenue" value={`$${paidRevenue.toFixed(2)}`} />
            <Card title="In Progress" value={jobsInProgress} />
            <Card title="Completed Jobs" value={completedJobs} />
            <Card title="Expenses" value={`$${totalExpenses.toFixed(2)}`} />
            <Card title="Net Profit" value={`$${netProfit.toFixed(2)}`} />
            <Card title="Vendors" value={vendors.length} />
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


          {(activeTab === 'vendors') && (
            <>
              <SectionCard title={editingVendorId ? 'Edit Vendor' : 'Add Vendor'}>
                <div style={styles.formGrid2}>
                  <Input label="Vendor No" value={vendor.vendor_no} onChange={(v: string) => setVendor({ ...vendor, vendor_no: v })} />
                  <Input label="Vendor Name" value={vendor.vendor_name} onChange={(v: string) => setVendor({ ...vendor, vendor_name: v })} />
                  <Input label="Contact Person" value={vendor.contact_person} onChange={(v: string) => setVendor({ ...vendor, contact_person: v })} />
                  <Input label="Phone" value={vendor.phone} onChange={(v: string) => setVendor({ ...vendor, phone: v })} />
                  <Input label="Email" value={vendor.email} onChange={(v: string) => setVendor({ ...vendor, email: v })} />
                  <Input label="Address" value={vendor.address} onChange={(v: string) => setVendor({ ...vendor, address: v })} />
                  <Input label="Tax ID" value={vendor.tax_id} onChange={(v: string) => setVendor({ ...vendor, tax_id: v })} />
                  <Field label="Status"><select value={vendor.status} onChange={(e) => setVendor({ ...vendor, status: e.target.value })} style={styles.input}><option>Active</option><option>Inactive</option><option>Blocked</option></select></Field>
                  <Input label="Notes" value={vendor.notes} onChange={(v: string) => setVendor({ ...vendor, notes: v })} />
                </div>
                <ButtonRow>
                  <button onClick={saveVendor} style={styles.primaryBtn}>{editingVendorId ? 'Update Vendor' : 'Save Vendor'}</button>
                  {editingVendorId && <button onClick={() => { setVendor(emptyVendor); setEditingVendorId(null); }} style={styles.grayBtn}>Cancel</button>}
                </ButtonRow>
              </SectionCard>

              <DataTable title="Vendor List" headers={['Vendor No', 'Name', 'Contact', 'Phone', 'Email', 'Status', 'Actions']}>
                {filteredVendors.map((v) => <tr key={v.id}><Td>{v.vendor_no}</Td><Td>{v.vendor_name}</Td><Td>{v.contact_person}</Td><Td>{v.phone}</Td><Td>{v.email}</Td><Td><StatusBadge status={v.status} /></Td><Td><button style={styles.smallBtn} onClick={() => editVendor(v)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteVendor(v.id)}>Delete</button></Td></tr>)}
              </DataTable>
            </>
          )}


          {(activeTab === 'dashboard' || activeTab === 'quotes') && (
            <>
              <SectionCard title={editingQuoteId ? 'Edit Quote' : 'Create Quote'}>
                <div style={styles.formGrid2}>
                  <Input label="Quote No" value={quote.quote_no} onChange={(v: string) => setQuote({ ...quote, quote_no: v })} />
                  <Field label="Customer"><select value={quote.customer} onChange={(e) => setQuote({ ...quote, customer: e.target.value })} style={styles.input}><option value="">Select Customer</option>{customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></Field>
                  <Input label="Quote Date" type="date" value={quote.quote_date} onChange={(v: string) => setQuote({ ...quote, quote_date: v })} />
                  <Input label="Service / Description" value={quote.service} onChange={(v: string) => setQuote({ ...quote, service: v })} />
                  <Input label="Amount" value={quote.amount} onChange={(v: string) => setQuote({ ...quote, amount: v })} />
                  <Field label="Status"><select value={quote.status} onChange={(e) => setQuote({ ...quote, status: e.target.value })} style={styles.input}><option>Draft</option><option>Sent</option><option>Approved</option><option>Rejected</option></select></Field>
                  <Input label="Notes" value={quote.notes} onChange={(v: string) => setQuote({ ...quote, notes: v })} />
                </div>
                <ButtonRow>
                  <button onClick={saveQuote} style={styles.primaryBtn}>{editingQuoteId ? 'Update Quote' : 'Save Quote'}</button>
                  {editingQuoteId && <button onClick={() => { setQuote(emptyQuote); setEditingQuoteId(null); }} style={styles.grayBtn}>Cancel</button>}
                </ButtonRow>
              </SectionCard>

              <DataTable title="Quotes" headers={['Quote #', 'Customer', 'Date', 'Service', 'Amount', 'Status', 'Quick Status', 'Actions']}>
                {filteredQuotes.map((qt) => (
                  <tr key={qt.id}>
                    <Td>{qt.quote_no}</Td>
                    <Td>{qt.customer}</Td>
                    <Td>{qt.quote_date}</Td>
                    <Td>{qt.service}</Td>
                    <Td>${Number(qt.amount || 0).toFixed(2)}</Td>
                    <Td><StatusBadge status={qt.status} /></Td>
                    <Td><select value={qt.status} onChange={(e) => quickQuoteStatus(qt.id, e.target.value)} style={styles.smallSelect}><option>Draft</option><option>Sent</option><option>Approved</option><option>Rejected</option></select></Td>
                    <Td>
                      <button style={styles.smallBtn} onClick={() => editQuote(qt)}>Edit</button>
                      <button style={styles.greenSmallBtn || styles.smallBtn} onClick={() => convertQuoteToJob(qt)}>To Job</button>
                      <button style={styles.printBtn} onClick={() => convertQuoteToInvoice(qt)}>To Invoice</button>
                      <button style={styles.dangerBtn} onClick={() => deleteQuote(qt.id)}>Delete</button>
                    </Td>
                  </tr>
                ))}
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


          {(activeTab === 'dashboard' || activeTab === 'workorders') && (
            <>
              <SectionCard title={editingWorkOrderId ? 'Edit Work Order' : 'Create Work Order'}>
                <div style={styles.formGrid2}>
                  <Field label="From Job"><select value={workOrder.job_id ? String(workOrder.job_id) : ''} onChange={(e) => fillWorkOrderFromJob(e.target.value)} style={styles.input}><option value="">Select Job</option>{jobs.map((j) => <option key={j.id} value={j.id}>{j.customer} - {j.service}</option>)}</select></Field>
                  <Input label="Work Order No" value={workOrder.work_order_no} onChange={(v: string) => setWorkOrder({ ...workOrder, work_order_no: v })} />
                  <Input label="Customer" value={workOrder.customer} onChange={(v: string) => setWorkOrder({ ...workOrder, customer: v })} />
                  <Input label="Service" value={workOrder.service} onChange={(v: string) => setWorkOrder({ ...workOrder, service: v })} />
                  <Input label="Technician / Assigned To" value={workOrder.technician} onChange={(v: string) => setWorkOrder({ ...workOrder, technician: v })} />
                  <Input label="Scheduled Date" type="date" value={workOrder.scheduled_date} onChange={(v: string) => setWorkOrder({ ...workOrder, scheduled_date: v })} />
                  <Input label="Start Time" type="time" value={workOrder.start_time} onChange={(v: string) => setWorkOrder({ ...workOrder, start_time: v })} />
                  <Input label="End Time" type="time" value={workOrder.end_time} onChange={(v: string) => setWorkOrder({ ...workOrder, end_time: v })} />
                  <Field label="Status"><select value={workOrder.status} onChange={(e) => setWorkOrder({ ...workOrder, status: e.target.value })} style={styles.input}><option>Scheduled</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select></Field>
                  <Input label="Notes" value={workOrder.notes} onChange={(v: string) => setWorkOrder({ ...workOrder, notes: v })} />
                </div>
                <ButtonRow>
                  <button onClick={saveWorkOrder} style={styles.primaryBtn}>{editingWorkOrderId ? 'Update Work Order' : 'Save Work Order'}</button>
                  {editingWorkOrderId && <button onClick={() => { setWorkOrder(emptyWorkOrder); setEditingWorkOrderId(null); }} style={styles.grayBtn}>Cancel</button>}
                </ButtonRow>
              </SectionCard>

              <DataTable title="Work Orders" headers={['WO #', 'Date', 'Time', 'Customer', 'Service', 'Technician', 'Status', 'Actions']}>
                {filteredWorkOrders.map((wo) => (
                  <tr key={wo.id}>
                    <Td>{wo.work_order_no}</Td>
                    <Td>{wo.scheduled_date}</Td>
                    <Td>{wo.start_time} - {wo.end_time}</Td>
                    <Td>{wo.customer}</Td>
                    <Td>{wo.service}</Td>
                    <Td>{wo.technician}</Td>
                    <Td><select value={wo.status} onChange={(e) => quickWorkOrderStatus(wo.id, e.target.value, wo.job_id)} style={styles.smallSelect}><option>Scheduled</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select></Td>
                    <Td><button style={styles.smallBtn} onClick={() => editWorkOrder(wo)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteWorkOrder(wo.id)}>Delete</button></Td>
                  </tr>
                ))}
              </DataTable>
            </>
          )}

          {(activeTab === 'calendar') && (
            <>
              <SectionCard title="Calendar / Daily Schedule">
                <div style={styles.cards}>
                  <Card title="Today" value={todaysWorkOrders} />
                  <Card title="Scheduled / In Progress" value={scheduledWorkOrders} />
                  <Card title="Completed Work Orders" value={workOrders.filter((wo) => wo.status === 'Completed').length} />
                </div>
              </SectionCard>

              <DataTable title="Upcoming Schedule" headers={['Date', 'Time', 'Customer', 'Service', 'Technician', 'Status']}>
                {workOrders
                  .filter((wo) => wo.status !== 'Cancelled')
                  .sort((a, b) => String(a.scheduled_date + a.start_time).localeCompare(String(b.scheduled_date + b.start_time)))
                  .map((wo) => <tr key={wo.id}><Td>{wo.scheduled_date}</Td><Td>{wo.start_time} - {wo.end_time}</Td><Td>{wo.customer}</Td><Td>{wo.service}</Td><Td>{wo.technician}</Td><Td><StatusBadge status={wo.status} /></Td></tr>)}
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


          {(activeTab === 'expenses') && (
            <>
              <SectionCard title={editingExpenseId ? 'Edit Expense' : 'Add Expense'}>
                <div style={styles.formGrid2}>
                  <Input label="Expense No" value={expense.expense_no} onChange={(v: string) => setExpense({ ...expense, expense_no: v })} />
                  <Input label="Date" type="date" value={expense.expense_date} onChange={(v: string) => setExpense({ ...expense, expense_date: v })} />
                  <Field label="Vendor">
                    <select value={expense.vendor} onChange={(e) => setExpense({ ...expense, vendor: e.target.value })} style={styles.input}>
                      <option value="">Select Vendor</option>
                      {vendors.map((v) => <option key={v.id} value={v.vendor_name}>{v.vendor_name}</option>)}
                    </select>
                  </Field>
                  <Field label="Category"><select value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })} style={styles.input}><option>Materials</option><option>Tools</option><option>Fuel</option><option>Labor</option><option>Subcontractor</option><option>Insurance</option><option>Marketing</option><option>Office Expense</option><option>Vehicle Expense</option><option>Other</option></select></Field>
                  <Input label="Description" value={expense.description} onChange={(v: string) => setExpense({ ...expense, description: v })} />
                  <Input label="Amount" value={expense.amount} onChange={(v: string) => setExpense({ ...expense, amount: v })} />
                  <Field label="Payment Method"><select value={expense.payment_method} onChange={(e) => setExpense({ ...expense, payment_method: e.target.value })} style={styles.input}><option>Cash</option><option>Check</option><option>Zelle</option><option>Credit Card</option><option>Bank Transfer</option><option>Other</option></select></Field>
                  <Field label="Status"><select value={expense.status} onChange={(e) => setExpense({ ...expense, status: e.target.value })} style={styles.input}><option>Draft</option><option>Submitted</option><option>Approved</option><option>Paid</option></select></Field>
                </div>
                <ButtonRow>
                  <button onClick={saveExpense} style={styles.primaryBtn}>{editingExpenseId ? 'Update Expense' : 'Save Expense'}</button>
                  {editingExpenseId && <button onClick={() => { setExpense(emptyExpense); setEditingExpenseId(null); }} style={styles.grayBtn}>Cancel</button>}
                </ButtonRow>
              </SectionCard>

              <DataTable title="Expenses" headers={['Expense #', 'Date', 'Vendor', 'Category', 'Description', 'Amount', 'Method', 'Status', 'Actions']}>
                {filteredExpenses.map((e) => <tr key={e.id}><Td>{e.expense_no}</Td><Td>{e.expense_date}</Td><Td>{e.vendor}</Td><Td>{e.category}</Td><Td>{e.description}</Td><Td>${Number(e.amount || 0).toFixed(2)}</Td><Td>{e.payment_method}</Td><Td><StatusBadge status={e.status} /></Td><Td><button style={styles.smallBtn} onClick={() => editExpense(e)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteExpense(e.id)}>Delete</button></Td></tr>)}
              </DataTable>
            </>
          )}

          {(activeTab === 'reports') && (
            <>
              <SectionCard title="Profit & Loss Summary">
                <div style={styles.cards}>
                  <Card title="Paid Revenue" value={`$${paidRevenue.toFixed(2)}`} />
                  <Card title="Total Expenses" value={`$${totalExpenses.toFixed(2)}`} />
                  <Card title="Net Profit" value={`$${netProfit.toFixed(2)}`} />
                  <Card title="Outstanding AR" value={`$${outstanding.toFixed(2)}`} />
                  <Card title="Approved/Paid Expenses" value={`$${approvedExpenses.toFixed(2)}`} />
                  <Card title="Draft/Submitted Expenses" value={`$${draftExpenses.toFixed(2)}`} />
                </div>
              </SectionCard>

              <DataTable title="Revenue Report" headers={['Invoice #', 'Customer', 'Date', 'Amount', 'Paid', 'Balance', 'Status']}>
                {filteredInvoices.map((i) => <tr key={i.id}><Td>{i.invoice_no}</Td><Td>{i.customer}</Td><Td>{i.invoice_date}</Td><Td>${Number(i.amount || 0).toFixed(2)}</Td><Td>${invoicePaidAmount(i.id, i.invoice_no).toFixed(2)}</Td><Td>${invoiceBalance(i).toFixed(2)}</Td><Td><StatusBadge status={i.status} /></Td></tr>)}
              </DataTable>

              <DataTable title="Expense Report" headers={['Expense #', 'Date', 'Vendor', 'Category', 'Amount', 'Status']}>
                {filteredExpenses.map((e) => <tr key={e.id}><Td>{e.expense_no}</Td><Td>{e.expense_date}</Td><Td>{e.vendor}</Td><Td>{e.category}</Td><Td>${Number(e.amount || 0).toFixed(2)}</Td><Td><StatusBadge status={e.status} /></Td></tr>)}
              </DataTable>
            </>
          )}

          {(activeTab === 'masters') && (
            <>
              <SectionCard title="Company Details">
                <div style={styles.formGrid2}>
                  <Input label="Company Name" value={company.company_name} onChange={(v: string) => setCompany({ ...company, company_name: v })} />
                  <Input label="Phone" value={company.phone} onChange={(v: string) => setCompany({ ...company, phone: v })} />
                  <Input label="Email" value={company.email} onChange={(v: string) => setCompany({ ...company, email: v })} />
                  <Input label="Website" value={company.website} onChange={(v: string) => setCompany({ ...company, website: v })} />
                  <Input label="Address" value={company.address} onChange={(v: string) => setCompany({ ...company, address: v })} />
                  <Input label="Logo URL / Path" value={company.logo_url} onChange={(v: string) => setCompany({ ...company, logo_url: v })} />
                  <Input label="Tax Rate %" value={company.tax_rate} onChange={(v: string) => setCompany({ ...company, tax_rate: v })} />
                  <Input label="Payment Terms" value={company.payment_terms} onChange={(v: string) => setCompany({ ...company, payment_terms: v })} />
                  <Input label="Payment Instructions" value={company.payment_instructions} onChange={(v: string) => setCompany({ ...company, payment_instructions: v })} />
                </div>
                <ButtonRow><button onClick={saveCompany} style={styles.primaryBtn}>Save Company Details</button><button onClick={loadDefaultMasters} style={styles.greenBtn}>Load Sample Defaults</button></ButtonRow>
              </SectionCard>

              <SectionCard title={editingSequenceId ? 'Edit Number Sequence' : 'Number Sequence Setup'}>
                <div style={styles.formGrid2}>
                  <Field label="Document Type"><select value={sequence.document_type} onChange={(e) => setSequence({ ...sequence, document_type: e.target.value })} style={styles.input}><option value="">Select Type</option><option>Customer</option><option>Job</option><option>Quote</option><option>Invoice</option><option>Payment</option></select></Field>
                  <Input label="Prefix" value={sequence.prefix} onChange={(v: string) => setSequence({ ...sequence, prefix: v })} />
                  <Input label="Next Number" value={sequence.next_number} onChange={(v: string) => setSequence({ ...sequence, next_number: v })} />
                  <Input label="Padding" value={sequence.padding} onChange={(v: string) => setSequence({ ...sequence, padding: v })} />
                </div>
                <ButtonRow><button onClick={saveSequence} style={styles.primaryBtn}>{editingSequenceId ? 'Update Sequence' : 'Save Sequence'}</button>{editingSequenceId && <button onClick={() => { setSequence(emptySequence); setEditingSequenceId(null); }} style={styles.grayBtn}>Cancel</button>}</ButtonRow>
              </SectionCard>
              <DataTable title="Number Sequences" headers={['Document Type', 'Prefix', 'Next Number', 'Padding', 'Actions']}>
                {sequences.map((s) => <tr key={s.id}><Td>{s.document_type}</Td><Td>{s.prefix}</Td><Td>{s.next_number}</Td><Td>{s.padding}</Td><Td><button style={styles.smallBtn} onClick={() => editSequence(s)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteSequence(s.id)}>Delete</button></Td></tr>)}
              </DataTable>

              <SectionCard title={editingAccountId ? 'Edit Chart of Account' : 'Chart of Accounts'}>
                <div style={styles.formGrid2}>
                  <Input label="Account Code" value={account.account_code} onChange={(v: string) => setAccount({ ...account, account_code: v })} />
                  <Input label="Account Name" value={account.account_name} onChange={(v: string) => setAccount({ ...account, account_name: v })} />
                  <Field label="Account Type"><select value={account.account_type} onChange={(e) => setAccount({ ...account, account_type: e.target.value })} style={styles.input}><option>Asset</option><option>Liability</option><option>Equity</option><option>Revenue</option><option>Expense</option><option>COGS</option></select></Field>
                  <Field label="Normal Balance"><select value={account.normal_balance} onChange={(e) => setAccount({ ...account, normal_balance: e.target.value })} style={styles.input}><option>Debit</option><option>Credit</option></select></Field>
                  <Field label="Active"><select value={account.is_active ? 'Yes' : 'No'} onChange={(e) => setAccount({ ...account, is_active: e.target.value === 'Yes' })} style={styles.input}><option>Yes</option><option>No</option></select></Field>
                </div>
                <ButtonRow><button onClick={saveAccount} style={styles.primaryBtn}>{editingAccountId ? 'Update Account' : 'Save Account'}</button>{editingAccountId && <button onClick={() => { setAccount(emptyAccount); setEditingAccountId(null); }} style={styles.grayBtn}>Cancel</button>}</ButtonRow>
              </SectionCard>
              <DataTable title="Chart of Accounts" headers={['Code', 'Name', 'Type', 'Normal Balance', 'Active', 'Actions']}>
                {accounts.map((a) => <tr key={a.id}><Td>{a.account_code}</Td><Td>{a.account_name}</Td><Td>{a.account_type}</Td><Td>{a.normal_balance}</Td><Td>{a.is_active ? 'Yes' : 'No'}</Td><Td><button style={styles.smallBtn} onClick={() => editAccount(a)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteAccount(a.id)}>Delete</button></Td></tr>)}
              </DataTable>

              <SectionCard title="Email Setup">
                <div style={styles.formGrid2}>
                  <Input label="From Name" value={emailSettings.from_name} onChange={(v: string) => setEmailSettings({ ...emailSettings, from_name: v })} />
                  <Input label="From Email" value={emailSettings.from_email} onChange={(v: string) => setEmailSettings({ ...emailSettings, from_email: v })} />
                  <Input label="Reply-To Email" value={emailSettings.reply_to_email} onChange={(v: string) => setEmailSettings({ ...emailSettings, reply_to_email: v })} />
                  <Input label="BCC Email" value={emailSettings.bcc_email} onChange={(v: string) => setEmailSettings({ ...emailSettings, bcc_email: v })} />
                </div>
                <ButtonRow><button onClick={saveEmailSettings} style={styles.primaryBtn}>Save Email Setup</button></ButtonRow>
              </SectionCard>

              <SectionCard title={editingTemplateId ? 'Edit Email Template' : 'Email Templates'}>
                <div style={styles.formGrid2}>
                  <Field label="Template Name"><select value={template.template_name} onChange={(e) => setTemplate({ ...template, template_name: e.target.value })} style={styles.input}><option value="">Select Template</option><option>Invoice Email</option><option>Quote Email</option><option>Payment Receipt Email</option><option>Overdue Reminder Email</option></select></Field>
                  <Input label="Subject" value={template.subject} onChange={(v: string) => setTemplate({ ...template, subject: v })} />
                </div>
                <Field label="Body"><textarea value={template.body} onChange={(e) => setTemplate({ ...template, body: e.target.value })} style={{ ...styles.input, minHeight: 150, resize: 'vertical' }} /></Field>
                <ButtonRow><button onClick={saveTemplate} style={styles.primaryBtn}>{editingTemplateId ? 'Update Template' : 'Save Template'}</button>{editingTemplateId && <button onClick={() => { setTemplate(emptyTemplate); setEditingTemplateId(null); }} style={styles.grayBtn}>Cancel</button>}</ButtonRow>
              </SectionCard>
              <DataTable title="Email Templates" headers={['Template Name', 'Subject', 'Actions']}>
                {templates.map((t) => <tr key={t.id}><Td>{t.template_name}</Td><Td>{t.subject}</Td><Td><button style={styles.smallBtn} onClick={() => editTemplate(t)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteTemplate(t.id)}>Delete</button></Td></tr>)}
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
                <img src={company.logo_url || LOGO_SRC} className="invoice-logo" alt="Aashan & Co LLC" />
                <h1>{company.company_name || 'Aashan & Co LLC'}</h1>
                <p>{company.website || 'Quality Work Through Dedication'}</p>
              </div>
              <div className="invoice-company">
                <p><b>Phone:</b> {company.phone || '(832) 210-4248'}</p>
                <p><b>Email:</b> {company.email || 'support@aashan.co'}</p>
                <p><b>Address:</b> {company.address || 'Dallas, Texas'}</p>
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
  greenSmallBtn: { background: '#059669', color: 'white', padding: '7px 10px', border: 0, borderRadius: 7, marginRight: 6, cursor: 'pointer' },
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
