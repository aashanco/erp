'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type Customer = { id?: number; name: string; phone?: string; email?: string; address?: string };
type Lead = {
  id?: number;
  lead_no: string;
  lead_name: string;
  phone: string;
  email: string;
  address: string;
  service_interest: string;
  source: string;
  stage: string;
  estimated_value: string;
  next_follow_up: string;
  notes: string;
  created_at?: string;
};
type Activity = {
  id?: number;
  customer_id?: number | null;
  lead_id?: number | null;
  activity_date: string;
  activity_type: string;
  subject: string;
  notes: string;
  next_action: string;
  created_at?: string;
};
type Opportunity = {
  id?: number;
  opportunity_no: string;
  customer_id?: number | null;
  lead_id?: number | null;
  name: string;
  stage: string;
  estimated_value: string;
  probability: string;
  expected_close_date: string;
  notes: string;
};

const emptyLead: Lead = {
  lead_no: '',
  lead_name: '',
  phone: '',
  email: '',
  address: '',
  service_interest: '',
  source: 'Referral',
  stage: 'New',
  estimated_value: '',
  next_follow_up: '',
  notes: '',
};

const emptyActivity: Activity = {
  customer_id: null,
  lead_id: null,
  activity_date: new Date().toISOString().slice(0, 10),
  activity_type: 'Call',
  subject: '',
  notes: '',
  next_action: '',
};

const emptyOpportunity: Opportunity = {
  opportunity_no: '',
  customer_id: null,
  lead_id: null,
  name: '',
  stage: 'Open',
  estimated_value: '',
  probability: '50',
  expected_close_date: '',
  notes: '',
};

function money(value: any) {
  return Number(value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export default function CRMEngine() {
  const [tab, setTab] = useState<'dashboard' | 'leads' | 'activities' | 'opportunities' | 'portal'>('dashboard');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [lead, setLead] = useState<Lead>(emptyLead);
  const [activity, setActivity] = useState<Activity>(emptyActivity);
  const [opportunity, setOpportunity] = useState<Opportunity>(emptyOpportunity);
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [editingOpportunityId, setEditingOpportunityId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    const { data: customerData } = await supabase.from('customers').select('*').order('name', { ascending: true });
    const { data: leadData } = await supabase.from('crm_leads').select('*').order('id', { ascending: false });
    const { data: activityData } = await supabase.from('crm_activities').select('*').order('activity_date', { ascending: false });
    const { data: oppData } = await supabase.from('crm_opportunities').select('*').order('id', { ascending: false });

    setCustomers(customerData || []);
    setLeads((leadData || []).map((l: any) => ({ ...l, estimated_value: String(l.estimated_value || '') })));
    setActivities(activityData || []);
    setOpportunities((oppData || []).map((o: any) => ({ ...o, estimated_value: String(o.estimated_value || ''), probability: String(o.probability || '0') })));
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function nextLeadNo() {
    return `LEAD-${String(leads.length + 1).padStart(4, '0')}`;
  }

  function nextOpportunityNo() {
    return `OPP-${String(opportunities.length + 1).padStart(4, '0')}`;
  }

  async function saveLead() {
    if (!lead.lead_name.trim()) return alert('Enter lead name.');

    const payload = {
      lead_no: lead.lead_no || nextLeadNo(),
      lead_name: lead.lead_name,
      phone: lead.phone,
      email: lead.email,
      address: lead.address,
      service_interest: lead.service_interest,
      source: lead.source,
      stage: lead.stage,
      estimated_value: Number(lead.estimated_value || 0),
      next_follow_up: lead.next_follow_up || null,
      notes: lead.notes,
    };

    const res = editingLeadId
      ? await supabase.from('crm_leads').update(payload).eq('id', editingLeadId)
      : await supabase.from('crm_leads').insert([payload]);

    if (res.error) return alert(res.error.message);
    setLead(emptyLead);
    setEditingLeadId(null);
    await loadData();
  }

  function editLead(l: Lead) {
    setLead({ ...l, estimated_value: String(l.estimated_value || '') });
    setEditingLeadId(l.id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteLead(id?: number) {
    if (!id || !confirm('Delete this lead?')) return;
    const { error } = await supabase.from('crm_leads').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function convertLeadToCustomer(l: Lead) {
    const { error } = await supabase.from('customers').insert([{
      name: l.lead_name,
      phone: l.phone,
      email: l.email,
      address: l.address,
    }]);

    if (error) return alert(error.message);
    if (l.id) await supabase.from('crm_leads').update({ stage: 'Converted' }).eq('id', l.id);
    await loadData();
    alert('Lead converted to customer.');
  }

  async function saveActivity() {
    if (!activity.subject.trim()) return alert('Enter activity subject.');

    const payload = {
      customer_id: activity.customer_id || null,
      lead_id: activity.lead_id || null,
      activity_date: activity.activity_date || new Date().toISOString().slice(0, 10),
      activity_type: activity.activity_type,
      subject: activity.subject,
      notes: activity.notes,
      next_action: activity.next_action,
    };

    const res = editingActivityId
      ? await supabase.from('crm_activities').update(payload).eq('id', editingActivityId)
      : await supabase.from('crm_activities').insert([payload]);

    if (res.error) return alert(res.error.message);
    setActivity(emptyActivity);
    setEditingActivityId(null);
    await loadData();
  }

  function editActivity(a: Activity) {
    setActivity(a);
    setEditingActivityId(a.id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteActivity(id?: number) {
    if (!id || !confirm('Delete this activity?')) return;
    const { error } = await supabase.from('crm_activities').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function saveOpportunity() {
    if (!opportunity.name.trim()) return alert('Enter opportunity name.');

    const payload = {
      opportunity_no: opportunity.opportunity_no || nextOpportunityNo(),
      customer_id: opportunity.customer_id || null,
      lead_id: opportunity.lead_id || null,
      name: opportunity.name,
      stage: opportunity.stage,
      estimated_value: Number(opportunity.estimated_value || 0),
      probability: Number(opportunity.probability || 0),
      expected_close_date: opportunity.expected_close_date || null,
      notes: opportunity.notes,
    };

    const res = editingOpportunityId
      ? await supabase.from('crm_opportunities').update(payload).eq('id', editingOpportunityId)
      : await supabase.from('crm_opportunities').insert([payload]);

    if (res.error) return alert(res.error.message);
    setOpportunity(emptyOpportunity);
    setEditingOpportunityId(null);
    await loadData();
  }

  function editOpportunity(o: Opportunity) {
    setOpportunity({ ...o, estimated_value: String(o.estimated_value || ''), probability: String(o.probability || '') });
    setEditingOpportunityId(o.id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteOpportunity(id?: number) {
    if (!id || !confirm('Delete this opportunity?')) return;
    const { error } = await supabase.from('crm_opportunities').delete().eq('id', id);
    if (error) return alert(error.message);
    await loadData();
  }

  const filteredLeads = leads.filter((l) =>
    `${l.lead_name} ${l.phone} ${l.email} ${l.service_interest} ${l.stage}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredActivities = activities.filter((a) =>
    `${a.subject} ${a.notes} ${a.next_action} ${a.activity_type}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOpps = opportunities.filter((o) =>
    `${o.opportunity_no} ${o.name} ${o.stage}`.toLowerCase().includes(search.toLowerCase())
  );

  const openLeads = leads.filter((l) => !['Converted', 'Lost'].includes(l.stage)).length;
  const followUpsDue = leads.filter((l) => l.next_follow_up && l.next_follow_up <= new Date().toISOString().slice(0, 10) && !['Converted', 'Lost'].includes(l.stage)).length;
  const pipelineValue = opportunities.filter((o) => !['Won', 'Lost'].includes(o.stage)).reduce((sum, o) => sum + Number(o.estimated_value || 0), 0);
  const weightedPipeline = opportunities.filter((o) => !['Won', 'Lost'].includes(o.stage)).reduce((sum, o) => sum + Number(o.estimated_value || 0) * (Number(o.probability || 0) / 100), 0);
  const wonValue = opportunities.filter((o) => o.stage === 'Won').reduce((sum, o) => sum + Number(o.estimated_value || 0), 0);

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>CRM</h2>
          <p style={styles.subtitle}>Lead tracking, customer follow-ups, opportunity pipeline, and customer portal foundation.</p>
        </div>
        <input style={styles.search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search CRM..." />
      </div>

      <div style={styles.tabBar}>
        <Tab label="Dashboard" active={tab === 'dashboard'} onClick={() => setTab('dashboard')} />
        <Tab label="Leads" active={tab === 'leads'} onClick={() => setTab('leads')} />
        <Tab label="Activities" active={tab === 'activities'} onClick={() => setTab('activities')} />
        <Tab label="Opportunities" active={tab === 'opportunities'} onClick={() => setTab('opportunities')} />
        <Tab label="Customer Portal" active={tab === 'portal'} onClick={() => setTab('portal')} />
      </div>

      {tab === 'dashboard' && (
        <>
          <div style={styles.cards}>
            <Card title="Open Leads" value={openLeads} />
            <Card title="Follow-Ups Due" value={followUpsDue} tone="red" />
            <Card title="Pipeline Value" value={money(pipelineValue)} />
            <Card title="Weighted Pipeline" value={money(weightedPipeline)} tone="green" />
            <Card title="Won Opportunities" value={money(wonValue)} tone="green" />
            <Card title="CRM Activities" value={activities.length} />
          </div>

          <div style={styles.grid2}>
            <Panel title="Follow-Ups Due">
              {leads.filter((l) => l.next_follow_up && l.next_follow_up <= new Date().toISOString().slice(0, 10) && !['Converted', 'Lost'].includes(l.stage)).slice(0, 8).map((l) => (
                <div key={l.id} style={styles.timelineItem}>
                  <b>{l.lead_name}</b>
                  <span>{l.next_follow_up} - {l.service_interest}</span>
                </div>
              ))}
              {followUpsDue === 0 && <p style={styles.help}>No follow-ups due today.</p>}
            </Panel>

            <Panel title="Pipeline by Stage">
              {['Open', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'].map((stage) => {
                const value = opportunities.filter((o) => o.stage === stage).reduce((sum, o) => sum + Number(o.estimated_value || 0), 0);
                return <div key={stage} style={styles.pipelineRow}><span>{stage}</span><b>{money(value)}</b></div>;
              })}
            </Panel>
          </div>
        </>
      )}

      {tab === 'leads' && (
        <>
          <Panel title={editingLeadId ? 'Edit Lead' : 'New Lead'}>
            <div style={styles.formGrid}>
              <Input label="Lead No" value={lead.lead_no} onChange={(v: string) => setLead({ ...lead, lead_no: v })} placeholder={nextLeadNo()} />
              <Input label="Lead Name" value={lead.lead_name} onChange={(v: string) => setLead({ ...lead, lead_name: v })} />
              <Input label="Phone" value={lead.phone} onChange={(v: string) => setLead({ ...lead, phone: v })} />
              <Input label="Email" value={lead.email} onChange={(v: string) => setLead({ ...lead, email: v })} />
              <Input label="Address" value={lead.address} onChange={(v: string) => setLead({ ...lead, address: v })} />
              <Input label="Service Interest" value={lead.service_interest} onChange={(v: string) => setLead({ ...lead, service_interest: v })} />
              <Field label="Source"><select style={styles.input} value={lead.source} onChange={(e) => setLead({ ...lead, source: e.target.value })}><option>Referral</option><option>Facebook</option><option>Google</option><option>Website</option><option>Existing Customer</option><option>Other</option></select></Field>
              <Field label="Stage"><select style={styles.input} value={lead.stage} onChange={(e) => setLead({ ...lead, stage: e.target.value })}><option>New</option><option>Contacted</option><option>Estimate Scheduled</option><option>Quote Sent</option><option>Converted</option><option>Lost</option></select></Field>
              <Input label="Estimated Value" type="number" value={lead.estimated_value} onChange={(v: string) => setLead({ ...lead, estimated_value: v })} />
              <Input label="Next Follow-Up" type="date" value={lead.next_follow_up} onChange={(v: string) => setLead({ ...lead, next_follow_up: v })} />
            </div>
            <Field label="Notes"><textarea style={{ ...styles.input, minHeight: 90 }} value={lead.notes} onChange={(e) => setLead({ ...lead, notes: e.target.value })} /></Field>
            <div style={styles.actions}>
              <button style={styles.primaryBtn} onClick={saveLead}>{editingLeadId ? 'Update Lead' : 'Save Lead'}</button>
              {editingLeadId && <button style={styles.grayBtn} onClick={() => { setLead(emptyLead); setEditingLeadId(null); }}>Cancel</button>}
            </div>
          </Panel>

          <DataTable title="Leads" headers={['Lead #', 'Name', 'Phone', 'Service', 'Source', 'Stage', 'Value', 'Follow-Up', 'Actions']}>
            {filteredLeads.map((l) => (
              <tr key={l.id}>
                <td>{l.lead_no}</td><td>{l.lead_name}</td><td>{l.phone}</td><td>{l.service_interest}</td><td>{l.source}</td><td><Badge text={l.stage} /></td><td>{money(l.estimated_value)}</td><td>{l.next_follow_up}</td>
                <td><button style={styles.smallBtn} onClick={() => editLead(l)}>Edit</button><button style={styles.greenBtn} onClick={() => convertLeadToCustomer(l)}>Convert</button><button style={styles.dangerBtn} onClick={() => deleteLead(l.id)}>Delete</button></td>
              </tr>
            ))}
          </DataTable>
        </>
      )}

      {tab === 'activities' && (
        <>
          <Panel title={editingActivityId ? 'Edit Activity' : 'New Activity'}>
            <div style={styles.formGrid}>
              <Field label="Customer"><select style={styles.input} value={activity.customer_id || ''} onChange={(e) => setActivity({ ...activity, customer_id: e.target.value ? Number(e.target.value) : null })}><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              <Field label="Lead"><select style={styles.input} value={activity.lead_id || ''} onChange={(e) => setActivity({ ...activity, lead_id: e.target.value ? Number(e.target.value) : null })}><option value="">Select lead</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.lead_name}</option>)}</select></Field>
              <Input label="Date" type="date" value={activity.activity_date} onChange={(v: string) => setActivity({ ...activity, activity_date: v })} />
              <Field label="Type"><select style={styles.input} value={activity.activity_type} onChange={(e) => setActivity({ ...activity, activity_type: e.target.value })}><option>Call</option><option>Email</option><option>Text</option><option>Site Visit</option><option>Follow-Up</option><option>Note</option></select></Field>
              <Input label="Subject" value={activity.subject} onChange={(v: string) => setActivity({ ...activity, subject: v })} />
              <Input label="Next Action" value={activity.next_action} onChange={(v: string) => setActivity({ ...activity, next_action: v })} />
            </div>
            <Field label="Notes"><textarea style={{ ...styles.input, minHeight: 90 }} value={activity.notes} onChange={(e) => setActivity({ ...activity, notes: e.target.value })} /></Field>
            <div style={styles.actions}>
              <button style={styles.primaryBtn} onClick={saveActivity}>{editingActivityId ? 'Update Activity' : 'Save Activity'}</button>
              {editingActivityId && <button style={styles.grayBtn} onClick={() => { setActivity(emptyActivity); setEditingActivityId(null); }}>Cancel</button>}
            </div>
          </Panel>

          <DataTable title="Activities" headers={['Date', 'Type', 'Subject', 'Notes', 'Next Action', 'Actions']}>
            {filteredActivities.map((a) => (
              <tr key={a.id}>
                <td>{a.activity_date}</td><td>{a.activity_type}</td><td>{a.subject}</td><td>{a.notes}</td><td>{a.next_action}</td>
                <td><button style={styles.smallBtn} onClick={() => editActivity(a)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteActivity(a.id)}>Delete</button></td>
              </tr>
            ))}
          </DataTable>
        </>
      )}

      {tab === 'opportunities' && (
        <>
          <Panel title={editingOpportunityId ? 'Edit Opportunity' : 'New Opportunity'}>
            <div style={styles.formGrid}>
              <Input label="Opportunity No" value={opportunity.opportunity_no} onChange={(v: string) => setOpportunity({ ...opportunity, opportunity_no: v })} placeholder={nextOpportunityNo()} />
              <Input label="Name" value={opportunity.name} onChange={(v: string) => setOpportunity({ ...opportunity, name: v })} />
              <Field label="Customer"><select style={styles.input} value={opportunity.customer_id || ''} onChange={(e) => setOpportunity({ ...opportunity, customer_id: e.target.value ? Number(e.target.value) : null })}><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              <Field label="Lead"><select style={styles.input} value={opportunity.lead_id || ''} onChange={(e) => setOpportunity({ ...opportunity, lead_id: e.target.value ? Number(e.target.value) : null })}><option value="">Select lead</option>{leads.map((l) => <option key={l.id} value={l.id}>{l.lead_name}</option>)}</select></Field>
              <Field label="Stage"><select style={styles.input} value={opportunity.stage} onChange={(e) => setOpportunity({ ...opportunity, stage: e.target.value })}><option>Open</option><option>Proposal Sent</option><option>Negotiation</option><option>Won</option><option>Lost</option></select></Field>
              <Input label="Estimated Value" type="number" value={opportunity.estimated_value} onChange={(v: string) => setOpportunity({ ...opportunity, estimated_value: v })} />
              <Input label="Probability %" type="number" value={opportunity.probability} onChange={(v: string) => setOpportunity({ ...opportunity, probability: v })} />
              <Input label="Expected Close Date" type="date" value={opportunity.expected_close_date} onChange={(v: string) => setOpportunity({ ...opportunity, expected_close_date: v })} />
            </div>
            <Field label="Notes"><textarea style={{ ...styles.input, minHeight: 90 }} value={opportunity.notes} onChange={(e) => setOpportunity({ ...opportunity, notes: e.target.value })} /></Field>
            <div style={styles.actions}>
              <button style={styles.primaryBtn} onClick={saveOpportunity}>{editingOpportunityId ? 'Update Opportunity' : 'Save Opportunity'}</button>
              {editingOpportunityId && <button style={styles.grayBtn} onClick={() => { setOpportunity(emptyOpportunity); setEditingOpportunityId(null); }}>Cancel</button>}
            </div>
          </Panel>

          <DataTable title="Opportunities" headers={['Opp #', 'Name', 'Stage', 'Value', 'Probability', 'Weighted', 'Close Date', 'Actions']}>
            {filteredOpps.map((o) => (
              <tr key={o.id}>
                <td>{o.opportunity_no}</td><td>{o.name}</td><td><Badge text={o.stage} /></td><td>{money(o.estimated_value)}</td><td>{o.probability}%</td><td>{money(Number(o.estimated_value || 0) * (Number(o.probability || 0) / 100))}</td><td>{o.expected_close_date}</td>
                <td><button style={styles.smallBtn} onClick={() => editOpportunity(o)}>Edit</button><button style={styles.dangerBtn} onClick={() => deleteOpportunity(o.id)}>Delete</button></td>
              </tr>
            ))}
          </DataTable>
        </>
      )}

      {tab === 'portal' && (
        <Panel title="Customer Portal Foundation">
          <p style={styles.help}>This phase creates the CRM foundation. Customer Portal is ready for the next step where customers can log in, view quotes/invoices/receipts, approve quotes, and request service.</p>
          <div style={styles.cards}>
            <Card title="Customers" value={customers.length} />
            <Card title="Portal Users" value="Next Phase" />
            <Card title="Quote Approval" value="Next Phase" />
            <Card title="Service Requests" value="Next Phase" />
          </div>
        </Panel>
      )}
    </div>
  );
}

function Tab({ label, active, onClick }: any) {
  return <button style={active ? styles.tabActive : styles.tab} onClick={onClick}>{label}</button>;
}

function Card({ title, value, tone }: any) {
  const color = tone === 'green' ? '#16a34a' : tone === 'red' ? '#dc2626' : '#2563eb';
  return <div style={{ ...styles.card, borderLeft: `6px solid ${color}` }}><span>{title}</span><b>{value}</b></div>;
}

function Panel({ title, children }: any) {
  return <div style={styles.panel}><h3 style={styles.panelTitle}>{title}</h3>{children}</div>;
}

function Field({ label, children }: any) {
  return <label style={styles.field}><span>{label}</span>{children}</label>;
}

function Input({ label, value, onChange, type = 'text', placeholder = '' }: any) {
  return <Field label={label}><input style={styles.input} type={type} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></Field>;
}

function DataTable({ title, headers, children }: any) {
  return <Panel title={title}><div style={styles.tableWrap}><table style={styles.table}><thead><tr>{headers.map((h: string) => <th key={h} style={styles.th}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div></Panel>;
}

function Badge({ text }: { text: string }) {
  const color = text === 'Won' || text === 'Converted' ? '#16a34a' : text === 'Lost' ? '#dc2626' : text === 'New' ? '#2563eb' : '#64748b';
  return <span style={{ ...styles.badge, background: color }}>{text}</span>;
}

const styles: Record<string, any> = {
  wrapper: { display: 'grid', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  title: { margin: 0, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', color: '#64748b' },
  search: { padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: 12, minWidth: 280 },
  tabBar: { display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: 10 },
  tab: { border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', padding: '9px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 },
  tabActive: { border: '1px solid #2563eb', background: '#2563eb', color: 'white', padding: '9px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 800 },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 },
  card: { background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 12px 30px rgba(15,23,42,0.08)', display: 'grid', gap: 8 },
  panel: { background: 'white', borderRadius: 18, padding: 18, boxShadow: '0 12px 30px rgba(15,23,42,0.08)', marginBottom: 14 },
  panelTitle: { marginTop: 0, color: '#0f172a' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  field: { display: 'grid', gap: 5, fontWeight: 700, color: '#0f172a' },
  input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, fontSize: 14 },
  actions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14, flexWrap: 'wrap' },
  primaryBtn: { background: '#2563eb', color: 'white', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' },
  grayBtn: { background: '#64748b', color: 'white', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' },
  smallBtn: { background: '#2563eb', color: 'white', border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer', marginRight: 5 },
  greenBtn: { background: '#16a34a', color: 'white', border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer', marginRight: 5 },
  dangerBtn: { background: '#dc2626', color: 'white', border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 850 },
  th: { background: '#f8fafc', color: '#0f172a', textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0' },
  badge: { color: 'white', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 800 },
  help: { color: '#64748b', lineHeight: 1.6 },
  timelineItem: { display: 'grid', gap: 4, borderBottom: '1px solid #e2e8f0', padding: '10px 0' },
  pipelineRow: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', padding: '10px 0' },
};
