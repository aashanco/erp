'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Customer = { id?: number; name: string; phone: string; email: string; address: string };
type Job = { id?: number; customer: string; service: string; job_date: string; amount: string; status: string };

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', email: '', address: '' });
  const [job, setJob] = useState<Job>({ customer: '', service: '', job_date: '', amount: '', status: 'New' });

  async function loadData() {
    const { data: customerData } = await supabase.from('customers').select('*').order('id', { ascending: false });
    const { data: jobData } = await supabase.from('jobs').select('*').order('id', { ascending: false });
    setCustomers(customerData || []);
    setJobs(jobData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveCustomer() {
    if (!customer.name) return alert('Enter customer name');
    const { error } = await supabase.from('customers').insert([customer]);
    if (error) return alert(error.message);
    setCustomer({ name: '', phone: '', email: '', address: '' });
    loadData();
  }

  async function saveJob() {
    if (!job.customer || !job.service) return alert('Enter customer and service');
    const { error } = await supabase.from('jobs').insert([job]);
    if (error) return alert(error.message);
    setJob({ customer: '', service: '', job_date: '', amount: '', status: 'New' });
    loadData();
  }

  const revenue = jobs.reduce((sum, j) => sum + Number(j.amount || 0), 0);

  return (
    <main style={{ fontFamily: 'Arial', background: '#f4f6f8', minHeight: '100vh' }}>
      <header style={{ background: '#0f172a', color: 'white', padding: 20 }}>
        <h1>Aashan ERP Web</h1>
        <p>Aashan & Co LLC - Service, Quotes, Invoices & Manager.io Export</p>
      </header>

      <section style={{ maxWidth: 1200, margin: '30px auto', padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          <Card title="Total Customers" value={customers.length} />
          <Card title="Total Jobs" value={jobs.length} />
          <Card title="Open Invoices" value={jobs.length} />
          <Card title="Revenue" value={`$${revenue.toFixed(2)}`} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 25 }}>
          <div style={box}>
            <h2>Add Customer</h2>
            <Input label="Name" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} />
            <Input label="Phone" value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })} />
            <Input label="Email" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} />
            <Input label="Address" value={customer.address} onChange={(v) => setCustomer({ ...customer, address: v })} />
            <button onClick={saveCustomer} style={buttonBlue}>Save Customer</button>
          </div>

          <div style={box}>
            <h2>Add Job / Quote</h2>
            <Input label="Customer" value={job.customer} onChange={(v) => setJob({ ...job, customer: v })} />
            <Input label="Service" value={job.service} onChange={(v) => setJob({ ...job, service: v })} />
            <Input label="Date" type="date" value={job.job_date} onChange={(v) => setJob({ ...job, job_date: v })} />
            <Input label="Amount" value={job.amount} onChange={(v) => setJob({ ...job, amount: v })} />
            <label>Status</label>
            <select value={job.status} onChange={(e) => setJob({ ...job, status: e.target.value })} style={input}>
              <option>New</option>
              <option>Quoted</option>
              <option>Completed</option>
              <option>Invoiced</option>
              <option>Paid</option>
            </select>
            <button onClick={saveJob} style={buttonGreen}>Save Job</button>
          </div>
        </div>

        <div style={{ ...box, marginTop: 25 }}>
          <h2>Customers</h2>
          {customers.map((c) => (
            <p key={c.id}><b>{c.name}</b> - {c.phone} - {c.email}</p>
          ))}

          <h2>Jobs & Invoices</h2>
          {jobs.map((j) => (
            <p key={j.id}><b>{j.customer}</b> - {j.service} - ${j.amount} - {j.status}</p>
          ))}
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
const input = { width: '100%', padding: 10, margin: '8px 0 15px', border: '1px solid #ccc', borderRadius: 6 };
const buttonBlue = { background: '#2563eb', color: 'white', padding: '10px 15px', border: 0, borderRadius: 6 };
const buttonGreen = { background: '#059669', color: 'white', padding: '10px 15px', border: 0, borderRadius: 6 };
