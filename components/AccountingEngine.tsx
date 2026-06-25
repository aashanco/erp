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

type JournalLine = {
  account_code: string;
  debit: string;
  credit: string;
  memo: string;
};

const emptyAccount: GLAccount = {
  account_code: '',
  account_name: '',
  account_type: 'Asset',
  normal_balance: 'Debit',
  is_active: true,
};

const emptyLines: JournalLine[] = [
  { account_code: '', debit: '', credit: '', memo: '' },
  { account_code: '', debit: '', credit: '', memo: '' },
];

export default function AccountingEngine() {
  const [view, setView] = useState<'trial' | 'pl' | 'bs' | 'journal' | 'accounts'>('trial');
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [account, setAccount] = useState<GLAccount>(emptyAccount);
  const [journalDate, setJournalDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalLine[]>(emptyLines);
  const [trial, setTrial] = useState<any[]>([]);
  const [pl, setPl] = useState<any[]>([]);
  const [bs, setBs] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data: acc } = await supabase.from('gl_accounts').select('*').order('account_code');
    const { data: tb } = await supabase.from('v_trial_balance').select('*');
    const { data: pnl } = await supabase.from('v_profit_loss').select('*');
    const { data: bal } = await supabase.from('v_balance_sheet').select('*');
    setAccounts(acc || []);
    setTrial(tb || []);
    setPl(pnl || []);
    setBs(bal || []);
  }

  async function saveAccount() {
    if (!account.account_code || !account.account_name) return alert('Account code and name required.');
    const { error } = await supabase.from('gl_accounts').upsert(account, { onConflict: 'account_code' });
    if (error) return alert(error.message);
    setAccount(emptyAccount);
    await loadData();
  }

  function updateLine(index: number, field: keyof JournalLine, value: string) {
    const copy = [...lines];
    copy[index] = { ...copy[index], [field]: value };
    setLines(copy);
  }

  function addLine() {
    setLines([...lines, { account_code: '', debit: '', credit: '', memo: '' }]);
  }

  async function postJournal() {
    const valid = lines.filter(l => l.account_code && (Number(l.debit || 0) > 0 || Number(l.credit || 0) > 0));
    const totalDebit = valid.reduce((s,l)=>s+Number(l.debit||0),0);
    const totalCredit = valid.reduce((s,l)=>s+Number(l.credit||0),0);

    if (valid.length < 2) return alert('Enter at least two journal lines.');
    if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) return alert('Debit and Credit must match.');

    const { data: journal, error } = await supabase.from('gl_journals').insert([{
      journal_no: `GL-${Date.now().toString().slice(-8)}`,
      journal_date: journalDate,
      source_type: 'Manual',
      description,
      total_debit: totalDebit,
      total_credit: totalCredit,
      status: 'Posted',
    }]).select().single();

    if (error) return alert(error.message);

    const payload = valid.map(l => {
      const acc = accounts.find(a => a.account_code === l.account_code);
      return {
        journal_id: journal.id,
        account_code: l.account_code,
        account_name: acc?.account_name || '',
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
        memo: l.memo || '',
      };
    });

    const { error: lineError } = await supabase.from('gl_journal_lines').insert(payload);
    if (lineError) return alert(lineError.message);

    setDescription('');
    setLines(emptyLines);
    await loadData();
    alert('Journal posted.');
  }

  const debit = lines.reduce((s,l)=>s+Number(l.debit||0),0);
  const credit = lines.reduce((s,l)=>s+Number(l.credit||0),0);

  return (
    <div style={{display:'grid',gap:16}}>
      <div style={styles.hero}>
        <h2 style={{margin:0}}>Accounting Engine</h2>
        <b>Phase 19</b>
      </div>

      <div style={styles.tabs}>
        {['trial','pl','bs','journal','accounts'].map(v => (
          <button key={v} style={view===v?styles.activeTab:styles.tab} onClick={()=>setView(v as any)}>
            {v === 'pl' ? 'Profit & Loss' : v === 'bs' ? 'Balance Sheet' : v === 'trial' ? 'Trial Balance' : v}
          </button>
        ))}
      </div>

      {view === 'accounts' && (
        <div style={styles.card}>
          <h3>GL Accounts</h3>
          <div style={styles.grid}>
            <input style={styles.input} placeholder="Code" value={account.account_code} onChange={e=>setAccount({...account, account_code:e.target.value})}/>
            <input style={styles.input} placeholder="Name" value={account.account_name} onChange={e=>setAccount({...account, account_name:e.target.value})}/>
            <select style={styles.input} value={account.account_type} onChange={e=>setAccount({...account, account_type:e.target.value})}>
              <option>Asset</option><option>Liability</option><option>Equity</option><option>Revenue</option><option>Expense</option>
            </select>
           <select style={styles.input} value={account.normal_balance} onChange={e=>setAccount({...account, normal_balance:e.target.value})}>
           <option>Debit</option> <option>Credit</option> <option>Both</option>
           </select>
          </div>
          <button style={styles.primary} onClick={saveAccount}>Save Account</button>
          <Report rows={accounts} columns={['account_code','account_name','account_type','normal_balance']} />
        </div>
      )}

      {view === 'journal' && (
        <div style={styles.card}>
          <h3>Manual Journal Entry</h3>
          <div style={styles.grid}>
            <input style={styles.input} type="date" value={journalDate} onChange={e=>setJournalDate(e.target.value)}/>
            <input style={styles.input} placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)}/>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={styles.table}>
              <thead><tr><th>Account</th><th>Debit</th><th>Credit</th><th>Memo</th></tr></thead>
              <tbody>
                {lines.map((l,i)=>(
                  <tr key={i}>
                    <td><select style={styles.input} value={l.account_code} onChange={e=>updateLine(i,'account_code',e.target.value)}>
                      <option value="">Select</option>
                      {accounts.map(a=><option key={a.account_code} value={a.account_code}>{a.account_code} - {a.account_name}</option>)}
                    </select></td>
                    <td><input style={styles.input} value={l.debit} onChange={e=>updateLine(i,'debit',e.target.value)}/></td>
                    <td><input style={styles.input} value={l.credit} onChange={e=>updateLine(i,'credit',e.target.value)}/></td>
                    <td><input style={styles.input} value={l.memo} onChange={e=>updateLine(i,'memo',e.target.value)}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p><b>Debit:</b> ${debit.toFixed(2)} &nbsp; <b>Credit:</b> ${credit.toFixed(2)} &nbsp; <b>Difference:</b> ${(debit-credit).toFixed(2)}</p>
          <button style={styles.secondary} onClick={addLine}>Add Line</button>{' '}
          <button style={styles.primary} onClick={postJournal}>Post Journal</button>
        </div>
      )}

      {view === 'trial' && <ReportCard title="Trial Balance" rows={trial} columns={['account_code','account_name','account_type','debit','credit','net_balance']} />}
      {view === 'pl' && <ReportCard title="Profit & Loss" rows={pl} columns={['account_type','account_code','account_name','amount']} />}
      {view === 'bs' && <ReportCard title="Balance Sheet" rows={bs} columns={['account_type','account_code','account_name','amount']} />}
    </div>
  );
}

function ReportCard({title, rows, columns}:{title:string; rows:any[]; columns:string[]}) {
  return <div style={styles.card}><h3>{title}</h3><Report rows={rows} columns={columns}/></div>;
}

function Report({rows, columns}:{rows:any[]; columns:string[]}) {
  return <div style={{overflowX:'auto'}}><table style={styles.table}>
    <thead><tr>{columns.map(c=><th key={c} style={styles.th}>{c.replaceAll('_',' ').toUpperCase()}</th>)}</tr></thead>
    <tbody>{rows.map((r,i)=><tr key={i}>{columns.map(c=><td key={c} style={styles.td}>{String(r[c] ?? '')}</td>)}</tr>)}</tbody>
  </table></div>;
}

const styles: Record<string, React.CSSProperties> = {
  hero:{background:'linear-gradient(135deg,#0f172a,#1d4ed8)',color:'white',borderRadius:18,padding:18,display:'flex',justifyContent:'space-between'},
  tabs:{display:'flex',flexWrap:'wrap',gap:8},
  tab:{background:'white',border:'1px solid #cbd5e1',borderRadius:999,padding:'9px 12px',fontWeight:800},
  activeTab:{background:'#2563eb',color:'white',border:'1px solid #2563eb',borderRadius:999,padding:'9px 12px',fontWeight:800},
  card:{background:'white',borderRadius:18,padding:18,boxShadow:'0 10px 30px rgba(15,23,42,.08)'},
  grid:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginBottom:12},
  input:{border:'1px solid #cbd5e1',borderRadius:12,padding:'10px 11px',width:'100%',boxSizing:'border-box'},
  primary:{background:'#2563eb',color:'white',border:0,borderRadius:12,padding:'10px 14px',fontWeight:900},
  secondary:{background:'#64748b',color:'white',border:0,borderRadius:12,padding:'10px 14px',fontWeight:900},
  table:{width:'100%',borderCollapse:'collapse',marginTop:12},
  th:{textAlign:'left',padding:10,borderBottom:'1px solid #e5e7eb',whiteSpace:'nowrap'},
  td:{padding:10,borderBottom:'1px solid #e5e7eb',whiteSpace:'nowrap'},
};
