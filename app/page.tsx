'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type Customer = {
  id?: number;
  name: string;
  phone: string;
  email: string;
  address: string;
};

type Job = {
  id?: number;
  customer: string;
  service: string;
  job_date: string;
  amount: string;
  status: string;
};

const emptyCustomer: Customer = { name: '', phone: '', email: '', address: '' };
const emptyJob: Job = { customer: '', service: '', job_date: '', amount: '', status: 'New' };

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [job, setJob] = useState<Job>(emptyJob);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .order('id', { ascending: false });

    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .order('id', { ascending: false });

    if (customerError) alert(customerError.message);
    if (jobError) alert(jobError.message);

    setCustomers(customerData || []);
    setJobs(jobData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveCustomer() {
    if (!customer.name.trim()) return alert('Enter customer name');

    if (editingCustomerId) {
      const { error } = await supabase.from('customers').update(customer).eq('id', editingCustomerId);
      if (error) return alert(error.message);
    } else {
      const { error } = await supabase.from('customers').insert([customer]);
      if (error) return alert(error.message);
    }

    setCustomer(emptyCustomer);
    setEditingCustomerId(null);
    loadData();
  }

  function editCustomer(c: Customer) {
    setCustomer(c);
    setEditingCustomerId(c.id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteCustomer(id?: number) {
    if (!id) return;
    if (!confirm('Delete this customer?')) return;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) return alert(error.message);
    loadData();
  }

  async function saveJob() {
    if (!job.customer.trim() || !job.service.trim()) return alert('Enter customer and service');

    if (editingJobId) {
      const { error } = await supabase.from('jobs').update(job).eq('id', editingJobId);
      if (error) return alert(error.message);
    } else {
      const { error } = await supabase.from('jobs').insert([job]);
      if (error) return alert(error.message);
    }

    setJob(emptyJob);
    setEditingJobId(null);
    loadData();
  }

  function editJob(j: Job) {
    setJob(j);
    setEditingJobId(j.id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteJob(id?: number) {
    if (!id) return;
    if (!confirm('Delete this job?')) return;
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

  function exportCsv(filename: string, rows: string[][]) {
    const csv = rows.map((r) => r.map((v) => `"${String(v || '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter((c) =>
      [c.name, c.phone, c.email, c.address].join(' ').toLowerCase().includes(q)
    );
  }, [customers, search]);

  const filteredJobs = useMemo(() => {
    const q = search.toLowerCase();
    return jobs.filter((j) =>
      [j.customer, j.service, j.status, j.job_date, j.amount].join(' ').toLowerCase().includes(q)
    );
  }, [jobs, search]);

  const revenue = jobs.reduce((sum, j) => sum + Number(j.amount || 0), 0);
  const openJobs = jobs.filter((j) => j.status !== 'Paid').length;

  return (
    <main style={{ fontFamily: 'Arial', background: '#f4f6f8', minHeight: '100vh' }}>
      <header style={{ background: '#0f172a', color: 'white', padding: 20 }}>
        <h1 style={{ margin: 0 }}>Aashan ERP Web</h1>
        <p>Aashan & Co LLC - Phase 2 Customer & Job Management</p>
      </header>

      <section style={{ maxWidth: 1250, margin: '30px auto', padding: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          <button style={pill}>Dashboard</button>
          <button style={pill}>Customers</button>
          <button style={pill}>Jobs</button>
          <button style={pill}>Invoices</button>
          <button style={pill} onClick={() => exportCsv('customers.csv', [['Name', 'Phone', 'Email', 'Address'], ...customers.map(c => [c.name, c.phone, c.email, c.address])])}>Export Customers</button>
          <button style={pill} onClick={() => exportCsv('jobs.csv', [['Customer', 'Service', 'Date', 'Amount', 'Status'], ...jobs.map(j => [j.customer, j.service, j.job_date, j.amount, j.status])])}>Export Jobs</button>
        </div>

        <input
          placeholder="Search customers, jobs, phone, email, status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...input, maxWidth: 500, background: 'white' }}
        />

        {loading && <p>Loading...</p>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <Card title="Total Customers" value={customers.length} />
          <Card title="Total Jobs" value={jobs.length} />
          <Card title="Open Jobs / Invoices" value={openJobs} />
          <Card title="Revenue" value={`$${revenue.toFixed(2)}`} />
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
              <option>New</option>
              <option>Quoted</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Invoiced</option>
              <option>Paid</option>
            </select>
            <button onClick={saveJob} style={buttonGreen}>{editingJobId ? 'Update Job' : 'Save Job'}</button>
            {editingJobId && <button onClick={() => { setJob(emptyJob); setEditingJobId(null); }} style={buttonGray}>Cancel</button>}
          </div>
        </div>

        <div style={{ ...box, marginTop: 25 }}>
          <h2>Customer List</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Email</th>
                  <th style={th}>Address</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td style={td}>{c.name}</td>
                    <td style={td}>{c.phone}</td>
                    <td style={td}>{c.email}</td>
                    <td style={td}>{c.address}</td>
                    <td style={td}>
                      <button style={smallBtn} onClick={() => editCustomer(c)}>Edit</button>
                      <button style={dangerBtn} onClick={() => deleteCustomer(c.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ ...box, marginTop: 25 }}>
          <h2>Jobs & Invoices</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Customer</th>
                  <th style={th}>Service</th>
                  <th style={th}>Date</th>
                  <th style={th}>Amount</th>
                  <th style={th}>Status</th>
                  <th style={th}>Quick Status</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((j) => (
                  <tr key={j.id}>
                    <td style={td}>{j.customer}</td>
                    <td style={td}>{j.service}</td>
                    <td style={td}>{j.job_date}</td>
                    <td style={td}>${Number(j.amount || 0).toFixed(2)}</td>
                    <td style={td}><span style={badge}>{j.status}</span></td>
                    <td style={td}>
                      <select value={j.status} onChange={(e) => quickStatus(j.id, e.target.value)} style={{ padding: 6 }}>
                        <option>New</option>
                        <option>Quoted</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                        <option>Invoiced</option>
                        <option>Paid</option>
                      </select>
                    </td>
                    <td style={td}>
                      <button style={smallBtn} onClick={() => editJob(j)}>Edit</button>
                      <button style={dangerBtn} onClick={() => deleteJob(j.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function Card({ title, value }: { title: string; value: any }) {
  return <div style={box}><b>{title}</b><h1>{value}</h1></div>;
}

function Input({ label, value, onChange, type = 'text' }: any) {
  return (
    <>
      <label>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={input} />
    </>
  );
}

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
