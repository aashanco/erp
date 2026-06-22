'use client';
import { useState } from 'react';

type Customer = { name: string; phone: string; email: string; address: string };
type Job = { customer: string; service: string; date: string; status: string; amount: string };

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([{ name: 'Sample Customer', phone: '832-210-4248', email: 'customer@email.com', address: 'Dallas, TX' }]);
  const [jobs, setJobs] = useState<Job[]>([{ customer: 'Sample Customer', service: 'TV Installation', date: '2026-06-22', status: 'Quoted', amount: '250' }]);
  const [customer, setCustomer] = useState<Customer>({ name: '', phone: '', email: '', address: '' });
  const [job, setJob] = useState<Job>({ customer: '', service: '', date: '', status: 'New', amount: '' });

  function addCustomer() {
    if (!customer.name) return alert('Enter customer name');
    setCustomers([...customers, customer]);
    setCustomer({ name: '', phone: '', email: '', address: '' });
  }

  function addJob() {
    if (!job.customer || !job.service) return alert('Enter customer and service');
    setJobs([...jobs, job]);
    setJob({ customer: '', service: '', date: '', status: 'New', amount: '' });
  }

  function downloadCsv(filename: string, rows: string[][]) {
    const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  }

  function exportCustomers() {
    downloadCsv('manager-customers.csv', [['Name','Email','Phone','Address'], ...customers.map(c => [c.name,c.email,c.phone,c.address])]);
  }

  function exportInvoices() {
    downloadCsv('manager-invoices.csv', [['Customer','Invoice Number','Date','Description','Amount','Status'], ...jobs.map((j,i) => [j.customer, `ASH-2026-${String(i+1).padStart(4,'0')}`, j.date, j.service, j.amount, j.status])]);
  }

  const totalRevenue = jobs.reduce((sum, j) => sum + Number(j.amount || 0), 0);

  return (
    <main>
      <div className="header">
        <div><h1>Aashan ERP Web</h1><p>Aashan & Co LLC - Service, Quotes, Invoices & Manager.io Export</p></div>
        <div>Phase 1</div>
      </div>
      <div className="container">
        <div className="nav"><span>Dashboard</span><span>Customers</span><span>Jobs</span><span>Invoices</span><span>CSV Export</span></div>
        <div className="grid">
          <div className="card"><h3>Total Customers</h3><div className="big">{customers.length}</div></div>
          <div className="card"><h3>Total Jobs</h3><div className="big">{jobs.length}</div></div>
          <div className="card"><h3>Open Invoices</h3><div className="big">{jobs.filter(j => j.status !== 'Paid').length}</div></div>
          <div className="card"><h3>Revenue</h3><div className="big">${totalRevenue.toFixed(2)}</div></div>
        </div>
        <div className="two">
          <div className="card">
            <h2>Add Customer</h2>
            <label>Name</label><input value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})}/>
            <label>Phone</label><input value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})}/>
            <label>Email</label><input value={customer.email} onChange={e=>setCustomer({...customer,email:e.target.value})}/>
            <label>Address</label><textarea value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})}/>
            <button className="button" onClick={addCustomer}>Save Customer</button>
          </div>
          <div className="card">
            <h2>Add Job / Quote</h2>
            <label>Customer</label><input value={job.customer} onChange={e=>setJob({...job,customer:e.target.value})}/>
            <label>Service</label><input value={job.service} onChange={e=>setJob({...job,service:e.target.value})}/>
            <label>Date</label><input type="date" value={job.date} onChange={e=>setJob({...job,date:e.target.value})}/>
            <label>Amount</label><input value={job.amount} onChange={e=>setJob({...job,amount:e.target.value})}/>
            <label>Status</label><select value={job.status} onChange={e=>setJob({...job,status:e.target.value})}><option>New</option><option>Quoted</option><option>Completed</option><option>Invoiced</option><option>Paid</option></select>
            <button className="button secondary" onClick={addJob}>Save Job</button>
          </div>
        </div>
        <div className="card" style={{marginTop:16}}>
          <h2>Jobs & Invoices</h2>
          <table><thead><tr><th>Customer</th><th>Service</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{jobs.map((j,i)=><tr key={i}><td>{j.customer}</td><td>{j.service}</td><td>{j.date}</td><td>${j.amount}</td><td><span className="badge">{j.status}</span></td></tr>)}</tbody></table>
          <br/><button className="button" onClick={exportCustomers}>Export Customers CSV</button>{' '}<button className="button secondary" onClick={exportInvoices}>Export Invoices CSV</button>
        </div>
      </div>
    </main>
  );
}
