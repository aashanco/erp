'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

type GLAccount = {
  id?: number;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  is_active: boolean;
};

type JournalHeader = {
  id?: number;
  journal_no: string;
  journal_date: string;
  description: string;
  status: 'Draft' | 'Posted' | 'Voided';
  total_debit?: number;
  total_credit?: number;
  created_at?: string;
};

type JournalLine = {
  id?: number;
  journal_id?: number;
  line_no: number;
  account_code: string;
  account_name: string;
  debit: string;
  credit: string;
  description: string;
};

type LedgerRow = {
  id?: number;
  journal_no: string;
  journal_date: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description: string;
  source_type: string;
  source_id?: number | null;
};

const emptyHeader: JournalHeader = {
  journal_no: '',
  journal_date: new Date().toISOString().slice(0, 10),
  description: '',
  status: 'Draft',
};

const emptyLine: JournalLine = {
  line_no: 1,
  account_code: '',
  account_name: '',
  debit: '',
  credit: '',
  description: '',
};

const defaultAccounts: GLAccount[] = [
  { account_code: '1000', account_name: 'Cash on Hand', account_type: 'Asset', normal_balance: 'Debit', is_active: true },
  { account_code: '1010', account_name: 'Bank Account', account_type: 'Asset', normal_balance: 'Debit', is_active: true },
  { account_code: '1100', account_name: 'Accounts Receivable', account_type: 'Asset', normal_balance: 'Debit', is_active: true },
  { account_code: '1200', account_name: 'Inventory', account_type: 'Asset', normal_balance: 'Debit', is_active: true },
  { account_code: '2000', account_name: 'Accounts Payable', account_type: 'Liability', normal_balance: 'Credit', is_active: true },
  { account_code: '2100', account_name: 'Sales Tax Payable', account_type: 'Liability', normal_balance: 'Credit', is_active: true },
  { account_code: '3000', account_name: 'Owner Equity', account_type: 'Equity', normal_balance: 'Credit', is_active: true },
  { account_code: '4000', account_name: 'Service Revenue', account_type: 'Revenue', normal_balance: 'Credit', is_active: true },
  { account_code: '4100', account_name: 'Installation Revenue', account_type: 'Revenue', normal_balance: 'Credit', is_active: true },
  { account_code: '5000', account_name: 'Materials Expense', account_type: 'Expense', normal_balance: 'Debit', is_active: true },
  { account_code: '5100', account_name: 'Labor Expense', account_type: 'Expense', normal_balance: 'Debit', is_active: true },
  { account_code: '5200', account_name: 'Fuel & Transportation Expense', account_type: 'Expense', normal_balance: 'Debit', is_active: true },
  { account_code: '5300', account_name: 'Tools & Supplies Expense', account_type: 'Expense', normal_balance: 'Debit', is_active: true },
];

function money(value: number | string | undefined | null) {
  const n = Number(value || 0);
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AccountingEngine() {
  const [tab, setTab] = useState<'dashboard' | 'coa' | 'journal' | 'ledger' | 'trial' | 'pl' | 'balance'>('dashboard');
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [journalHeaders, setJournalHeaders] = useState<JournalHeader[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [header, setHeader] = useState<JournalHeader>(emptyHeader);
  const [lines, setLines] = useState<JournalLine[]>([
    { ...emptyLine, line_no: 1 },
    { ...emptyLine, line_no: 2 },
  ]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(today());

  async function loadData() {
    setLoading(true);

    const { data: accountData, error: accountError } = await supabase
      .from('gl_accounts')
      .select('*')
      .order('account_code', { ascending: true });

    const { data: headerData } = await supabase
      .from('gl_journal_headers')
      .select('*')
      .order('id', { ascending: false });

    const { data: ledgerData } = await supabase
      .from('gl_ledger_entries')
      .select('*')
      .gte('journal_date', fromDate || '1900-01-01')
      .lte('journal_date', toDate || '2999-12-31')
      .order('journal_date', { ascending: false })
      .order('id', { ascending: false });

    if (accountError) {
      console.warn(accountError.message);
    }

    setAccounts((accountData || []) as GLAccount[]);
    setJournalHeaders((headerData || []) as JournalHeader[]);
    setLedger((ledgerData || []) as LedgerRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [fromDate, toDate]);

  function nextJournalNo() {
    const maxNo = journalHeaders.reduce((max, j) => {
      const num = Number(String(j.journal_no || '').replace(/[^0-9]/g, ''));
      return Number.isFinite(num) && num > max ? num : max;
    }, 1000);

    return `JE-${String(maxNo + 1).padStart(4, '0')}`;
  }

  function setLineAccount(index: number, accountCode: string) {
    const account = accounts.find((a) => a.account_code === accountCode);
    setLines((old) =>
      old.map((line, i) =>
        i === index
          ? { ...line, account_code: accountCode, account_name: account?.account_name || '' }
          : line
      )
    );
  }

  function updateLine(index: number, field: keyof JournalLine, value: string) {
    setLines((old) =>
      old.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  }

  function addLine() {
    setLines((old) => [...old, { ...emptyLine, line_no: old.length + 1 }]);
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return alert('Journal must have at least two lines.');
    setLines((old) => old.filter((_, i) => i !== index).map((l, i) => ({ ...l, line_no: i + 1 })));
  }

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  const outOfBalance = Math.round((totalDebit - totalCredit) * 100) / 100;

  async function saveAndPostJournal() {
    const validLines = lines.filter((line) => line.account_code && (Number(line.debit || 0) > 0 || Number(line.credit || 0) > 0));

    if (!header.description.trim()) return alert('Enter journal description.');
    if (validLines.length < 2) return alert('Journal must have at least two valid lines.');
    if (Math.abs(outOfBalance) > 0.001) return alert(`Journal is not balanced. Difference: ${money(outOfBalance)}`);

    const journalNo = header.journal_no || nextJournalNo();
    const journalDate = header.journal_date || today();

    const { data: insertedHeader, error: headerError } = await supabase
      .from('gl_journal_headers')
      .insert([{
        journal_no: journalNo,
        journal_date: journalDate,
        description: header.description,
        status: 'Posted',
        total_debit: totalDebit,
        total_credit: totalCredit,
      }])
      .select()
      .single();

    if (headerError) return alert(headerError.message);

    const linePayload = validLines.map((line, idx) => ({
      journal_id: insertedHeader.id,
      line_no: idx + 1,
      account_code: line.account_code,
      account_name: line.account_name,
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      description: line.description || header.description,
    }));

    const { error: lineError } = await supabase.from('gl_journal_lines').insert(linePayload);
    if (lineError) return alert(lineError.message);

    const ledgerPayload = validLines.map((line) => ({
      journal_no: journalNo,
      journal_date: journalDate,
      account_code: line.account_code,
      account_name: line.account_name,
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      description: line.description || header.description,
      source_type: 'Journal',
      source_id: insertedHeader.id,
    }));

    const { error: ledgerError } = await supabase.from('gl_ledger_entries').insert(ledgerPayload);
    if (ledgerError) return alert(ledgerError.message);

    setHeader({ ...emptyHeader, journal_date: today() });
    setLines([{ ...emptyLine, line_no: 1 }, { ...emptyLine, line_no: 2 }]);
    await loadData();
    alert(`Journal ${journalNo} posted successfully.`);
  }

  async function installDefaultAccounts() {
    const payload = defaultAccounts.map((a) => ({ ...a }));
    const { error } = await supabase.from('gl_accounts').upsert(payload, { onConflict: 'account_code' });
    if (error) return alert(error.message);
    await loadData();
    alert('Default chart of accounts installed.');
  }

  const trialRows = useMemo(() => {
    const map = new Map<string, { account_code: string; account_name: string; account_type: string; debit: number; credit: number; balance: number }>();

    accounts.forEach((a) => {
      map.set(a.account_code, {
        account_code: a.account_code,
        account_name: a.account_name,
        account_type: a.account_type,
        debit: 0,
        credit: 0,
        balance: 0,
      });
    });

    ledger.forEach((row) => {
      const existing = map.get(row.account_code) || {
        account_code: row.account_code,
        account_name: row.account_name,
        account_type: accounts.find((a) => a.account_code === row.account_code)?.account_type || '',
        debit: 0,
        credit: 0,
        balance: 0,
      };

      existing.debit += Number(row.debit || 0);
      existing.credit += Number(row.credit || 0);
      existing.balance = existing.debit - existing.credit;
      map.set(row.account_code, existing);
    });

    return Array.from(map.values()).filter((r) => r.debit || r.credit || r.balance);
  }, [accounts, ledger]);

  const trialDebit = trialRows.reduce((sum, r) => sum + r.debit, 0);
  const trialCredit = trialRows.reduce((sum, r) => sum + r.credit, 0);

  const revenue = trialRows
    .filter((r) => r.account_type === 'Revenue')
    .reduce((sum, r) => sum + (r.credit - r.debit), 0);

  const expenses = trialRows
    .filter((r) => r.account_type === 'Expense' || r.account_type === 'Cost of Goods Sold')
    .reduce((sum, r) => sum + (r.debit - r.credit), 0);

  const netIncome = revenue - expenses;

  const assets = trialRows
    .filter((r) => r.account_type === 'Asset')
    .reduce((sum, r) => sum + (r.debit - r.credit), 0);

  const liabilities = trialRows
    .filter((r) => r.account_type === 'Liability')
    .reduce((sum, r) => sum + (r.credit - r.debit), 0);

  const equity = trialRows
    .filter((r) => r.account_type === 'Equity')
    .reduce((sum, r) => sum + (r.credit - r.debit), 0);

  const equityPlusIncome = equity + netIncome;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Finance Foundation</h2>
          <p style={styles.subtitle}>General Ledger, journal posting, trial balance, P&L, and balance sheet.</p>
        </div>
        <button style={styles.primaryBtn} onClick={installDefaultAccounts}>Install Default COA</button>
      </div>

      <div style={styles.tabBar}>
        <TabButton label="Dashboard" active={tab === 'dashboard'} onClick={() => setTab('dashboard')} />
        <TabButton label="Chart of Accounts" active={tab === 'coa'} onClick={() => setTab('coa')} />
        <TabButton label="Journal Entry" active={tab === 'journal'} onClick={() => setTab('journal')} />
        <TabButton label="General Ledger" active={tab === 'ledger'} onClick={() => setTab('ledger')} />
        <TabButton label="Trial Balance" active={tab === 'trial'} onClick={() => setTab('trial')} />
        <TabButton label="P&L" active={tab === 'pl'} onClick={() => setTab('pl')} />
        <TabButton label="Balance Sheet" active={tab === 'balance'} onClick={() => setTab('balance')} />
      </div>

      <div style={styles.filters}>
        <label>From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={styles.input} /></label>
        <label>To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={styles.input} /></label>
        <button style={styles.grayBtn} onClick={loadData}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>

      {tab === 'dashboard' && (
        <>
          <div style={styles.cards}>
            <Card title="Assets" value={money(assets)} />
            <Card title="Liabilities" value={money(liabilities)} />
            <Card title="Equity + Income" value={money(equityPlusIncome)} />
            <Card title="Revenue" value={money(revenue)} />
            <Card title="Expenses" value={money(expenses)} />
            <Card title="Net Income" value={money(netIncome)} highlight={netIncome >= 0 ? 'green' : 'red'} />
          </div>

          <div style={styles.panel}>
            <h3>Accounting Health Check</h3>
            <p><b>Trial Balance Debit:</b> {money(trialDebit)}</p>
            <p><b>Trial Balance Credit:</b> {money(trialCredit)}</p>
            <p><b>Difference:</b> {money(trialDebit - trialCredit)}</p>
            <p style={Math.abs(trialDebit - trialCredit) < 0.01 ? styles.good : styles.bad}>
              {Math.abs(trialDebit - trialCredit) < 0.01 ? 'Balanced' : 'Out of balance'}
            </p>
          </div>
        </>
      )}

      {tab === 'coa' && (
        <div style={styles.panel}>
          <h3>Chart of Accounts</h3>
          <p style={styles.help}>This uses the same gl_accounts table as Master COA, so both screens stay synchronized.</p>
          <Table headers={['Code', 'Account', 'Type', 'Normal Balance', 'Active']}>
            {accounts.map((a) => (
              <tr key={a.id || a.account_code}>
                <td>{a.account_code}</td>
                <td>{a.account_name}</td>
                <td>{a.account_type}</td>
                <td>{a.normal_balance}</td>
                <td>{a.is_active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {tab === 'journal' && (
        <div style={styles.panel}>
          <h3>Post Journal Entry</h3>
          <div style={styles.formGrid}>
            <label>Journal No<input style={styles.input} value={header.journal_no} onChange={(e) => setHeader({ ...header, journal_no: e.target.value })} placeholder={nextJournalNo()} /></label>
            <label>Date<input type="date" style={styles.input} value={header.journal_date} onChange={(e) => setHeader({ ...header, journal_date: e.target.value })} /></label>
            <label>Description<input style={styles.input} value={header.description} onChange={(e) => setHeader({ ...header, description: e.target.value })} placeholder="Journal description" /></label>
          </div>

          <Table headers={['#', 'Account', 'Description', 'Debit', 'Credit', 'Action']}>
            {lines.map((line, index) => (
              <tr key={index}>
                <td>{line.line_no}</td>
                <td>
                  <select style={styles.tableInput} value={line.account_code} onChange={(e) => setLineAccount(index, e.target.value)}>
                    <option value="">Select account</option>
                    {accounts.filter((a) => a.is_active).map((a) => (
                      <option key={a.account_code} value={a.account_code}>{a.account_code} - {a.account_name}</option>
                    ))}
                  </select>
                </td>
                <td><input style={styles.tableInput} value={line.description} onChange={(e) => updateLine(index, 'description', e.target.value)} /></td>
                <td><input style={styles.tableInput} type="number" value={line.debit} onChange={(e) => updateLine(index, 'debit', e.target.value)} /></td>
                <td><input style={styles.tableInput} type="number" value={line.credit} onChange={(e) => updateLine(index, 'credit', e.target.value)} /></td>
                <td><button style={styles.dangerBtn} onClick={() => removeLine(index)}>Remove</button></td>
              </tr>
            ))}
          </Table>

          <div style={styles.totalBox}>
            <span>Total Debit: <b>{money(totalDebit)}</b></span>
            <span>Total Credit: <b>{money(totalCredit)}</b></span>
            <span style={Math.abs(outOfBalance) < 0.01 ? styles.good : styles.bad}>Difference: <b>{money(outOfBalance)}</b></span>
          </div>

          <div style={styles.actions}>
            <button style={styles.grayBtn} onClick={addLine}>Add Line</button>
            <button style={styles.primaryBtn} onClick={saveAndPostJournal}>Post Journal</button>
          </div>
        </div>
      )}

      {tab === 'ledger' && (
        <div style={styles.panel}>
          <h3>General Ledger</h3>
          <Table headers={['Date', 'Journal #', 'Account', 'Description', 'Debit', 'Credit', 'Source']}>
            {ledger.map((r) => (
              <tr key={r.id}>
                <td>{r.journal_date}</td>
                <td>{r.journal_no}</td>
                <td>{r.account_code} - {r.account_name}</td>
                <td>{r.description}</td>
                <td>{money(r.debit)}</td>
                <td>{money(r.credit)}</td>
                <td>{r.source_type}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}

      {tab === 'trial' && (
        <div style={styles.panel}>
          <h3>Trial Balance</h3>
          <Table headers={['Account', 'Type', 'Debit', 'Credit', 'Balance']}>
            {trialRows.map((r) => (
              <tr key={r.account_code}>
                <td>{r.account_code} - {r.account_name}</td>
                <td>{r.account_type}</td>
                <td>{money(r.debit)}</td>
                <td>{money(r.credit)}</td>
                <td>{money(r.balance)}</td>
              </tr>
            ))}
            <tr>
              <td><b>Total</b></td>
              <td></td>
              <td><b>{money(trialDebit)}</b></td>
              <td><b>{money(trialCredit)}</b></td>
              <td><b>{money(trialDebit - trialCredit)}</b></td>
            </tr>
          </Table>
        </div>
      )}

      {tab === 'pl' && (
        <div style={styles.panel}>
          <h3>Profit & Loss</h3>
          <FinancialLine label="Revenue" amount={revenue} />
          <FinancialLine label="Expenses" amount={expenses} />
          <div style={styles.statementTotal}><span>Net Income</span><b>{money(netIncome)}</b></div>
        </div>
      )}

      {tab === 'balance' && (
        <div style={styles.panel}>
          <h3>Balance Sheet</h3>
          <FinancialLine label="Assets" amount={assets} />
          <FinancialLine label="Liabilities" amount={liabilities} />
          <FinancialLine label="Equity" amount={equity} />
          <FinancialLine label="Current Net Income" amount={netIncome} />
          <div style={styles.statementTotal}><span>Total Liabilities + Equity</span><b>{money(liabilities + equityPlusIncome)}</b></div>
          <p style={Math.abs(assets - (liabilities + equityPlusIncome)) < 0.01 ? styles.good : styles.bad}>
            Difference: {money(assets - (liabilities + equityPlusIncome))}
          </p>
        </div>
      )}
    </div>
  );
}

function TabButton({ label, active, onClick }: any) {
  return <button style={active ? styles.tabActive : styles.tab} onClick={onClick}>{label}</button>;
}

function Card({ title, value, highlight }: any) {
  const border = highlight === 'green' ? '#16a34a' : highlight === 'red' ? '#dc2626' : '#2563eb';
  return (
    <div style={{ ...styles.card, borderLeft: `6px solid ${border}` }}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}

function Table({ headers, children }: any) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>{headers.map((h: string) => <th key={h} style={styles.th}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function FinancialLine({ label, amount }: { label: string; amount: number }) {
  return <div style={styles.statementLine}><span>{label}</span><b>{money(amount)}</b></div>;
}

const styles: Record<string, any> = {
  wrapper: { display: 'grid', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  title: { margin: 0, color: '#0f172a' },
  subtitle: { margin: '4px 0 0', color: '#64748b' },
  tabBar: { display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: 10 },
  tab: { border: '1px solid #cbd5e1', background: 'white', color: '#0f172a', padding: '9px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 },
  tabActive: { border: '1px solid #2563eb', background: '#2563eb', color: 'white', padding: '9px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 800 },
  filters: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' },
  input: { display: 'block', width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, marginTop: 4 },
  tableInput: { width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8 },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 },
  card: { background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 12px 30px rgba(15,23,42,0.08)' },
  cardTitle: { color: '#64748b', fontSize: 13, fontWeight: 800 },
  cardValue: { color: '#0f172a', fontSize: 24, fontWeight: 900, marginTop: 8 },
  panel: { background: 'white', borderRadius: 18, padding: 18, boxShadow: '0 12px 30px rgba(15,23,42,0.08)' },
  help: { color: '#64748b' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 14 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 700 },
  th: { background: '#f8fafc', color: '#0f172a', textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0' },
  totalBox: { display: 'flex', justifyContent: 'flex-end', gap: 20, flexWrap: 'wrap', marginTop: 14, padding: 14, background: '#f8fafc', borderRadius: 12 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  primaryBtn: { background: '#2563eb', color: 'white', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' },
  grayBtn: { background: '#64748b', color: 'white', border: 0, borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' },
  dangerBtn: { background: '#dc2626', color: 'white', border: 0, borderRadius: 8, padding: '7px 10px', fontWeight: 700, cursor: 'pointer' },
  good: { color: '#15803d', fontWeight: 900 },
  bad: { color: '#dc2626', fontWeight: 900 },
  statementLine: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', padding: '12px 0', fontSize: 16 },
  statementTotal: { display: 'flex', justifyContent: 'space-between', marginTop: 14, padding: 14, background: '#0f172a', color: 'white', borderRadius: 12, fontSize: 18 },
};
