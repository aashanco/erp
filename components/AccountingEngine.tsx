'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Header = {
  id: number;
  transaction_no: string;
  transaction_date: string;
  source_type: string;
  source_no: string;
  description: string;
  status: string;
  total_debit: number;
  total_credit: number;
  created_at: string;
};

type Line = {
  id: number;
  header_id: number;
  line_no: number;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description: string;
};

export default function AccountingEngine() {
  const [headers, setHeaders] = useState<Header[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedHeaderId, setSelectedHeaderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAccounting() {
    setLoading(true);

    const { data: headerData, error: headerError } = await supabase
      .from('gl_transaction_headers')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('id', { ascending: false });

    if (headerError) {
      alert(headerError.message);
      setLoading(false);
      return;
    }

    const { data: lineData, error: lineError } = await supabase
      .from('gl_transaction_lines')
      .select('*')
      .order('header_id', { ascending: false })
      .order('line_no', { ascending: true });

    if (lineError) {
      alert(lineError.message);
      setLoading(false);
      return;
    }

    setHeaders((headerData || []) as Header[]);
    setLines((lineData || []) as Line[]);
    setSelectedHeaderId((headerData || [])[0]?.id || null);
    setLoading(false);
  }

  useEffect(() => {
    loadAccounting();
  }, []);

  const selectedLines = lines.filter((l) => Number(l.header_id) === Number(selectedHeaderId));
  const totalDebit = headers.reduce((sum, h) => sum + Number(h.total_debit || 0), 0);
  const totalCredit = headers.reduce((sum, h) => sum + Number(h.total_credit || 0), 0);

  if (loading) {
    return <p style={styles.muted}>Loading accounting entries...</p>;
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <span>Total Transactions</span>
          <b>{headers.length}</b>
        </div>
        <div style={styles.summaryCard}>
          <span>Total Debit</span>
          <b>${totalDebit.toFixed(2)}</b>
        </div>
        <div style={styles.summaryCard}>
          <span>Total Credit</span>
          <b>${totalCredit.toFixed(2)}</b>
        </div>
        <button style={styles.refreshBtn} onClick={loadAccounting}>Refresh</button>
      </div>

      {headers.length === 0 ? (
        <div style={styles.empty}>
          <h3>No accounting entries yet</h3>
          <p>When you create invoices, receipts, or payments, posted ledger transactions will appear here.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          <div style={styles.card}>
            <h3>General Ledger Transactions</h3>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Transaction</th>
                    <th style={styles.th}>Source</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.thRight}>Debit</th>
                    <th style={styles.thRight}>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h) => (
                    <tr
                      key={h.id}
                      onClick={() => setSelectedHeaderId(h.id)}
                      style={Number(selectedHeaderId) === Number(h.id) ? styles.selectedRow : styles.row}
                    >
                      <td style={styles.td}>{h.transaction_date}</td>
                      <td style={styles.td}>{h.transaction_no}</td>
                      <td style={styles.td}>{h.source_type} {h.source_no}</td>
                      <td style={styles.td}>{h.description}</td>
                      <td style={styles.tdRight}>${Number(h.total_debit || 0).toFixed(2)}</td>
                      <td style={styles.tdRight}>${Number(h.total_credit || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={styles.card}>
            <h3>Transaction Lines</h3>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Account</th>
                    <th style={styles.th}>Description</th>
                    <th style={styles.thRight}>Debit</th>
                    <th style={styles.thRight}>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedLines.map((l) => (
                    <tr key={l.id}>
                      <td style={styles.td}>{l.account_code} - {l.account_name}</td>
                      <td style={styles.td}>{l.description}</td>
                      <td style={styles.tdRight}>${Number(l.debit || 0).toFixed(2)}</td>
                      <td style={styles.tdRight}>${Number(l.credit || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, any> = {
  wrap: { display: 'grid', gap: 16 },
  muted: { color: '#64748b' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, alignItems: 'stretch' },
  summaryCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 },
  refreshBtn: { background: '#2563eb', color: 'white', border: 0, borderRadius: 12, padding: 12, fontWeight: 900, cursor: 'pointer' },
  empty: { background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 16, padding: 22, color: '#475569' },
  grid: { display: 'grid', gap: 16 },
  card: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { background: 'white', textAlign: 'left', padding: 10, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  thRight: { background: 'white', textAlign: 'right', padding: 10, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' },
  td: { padding: 10, borderBottom: '1px solid #e2e8f0' },
  tdRight: { padding: 10, borderBottom: '1px solid #e2e8f0', textAlign: 'right' },
  row: { cursor: 'pointer' },
  selectedRow: { cursor: 'pointer', background: '#dbeafe' },
};
