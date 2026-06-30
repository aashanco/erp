'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Line = { description: string; qty: string; unit_price: string; discount: string; tax_rate: string };
const LOGO_FALLBACK = '/aashan-logo.png';

function money(value: any) { return `$${Number(value || 0).toFixed(2)}`; }
function visibleNotes(value?: string) { return String(value || '').split('LINES_JSON:')[0].trim(); }
function parseLines(notes?: string): Line[] {
  const raw = String(notes || '');
  if (!raw.includes('LINES_JSON:')) return [];
  try {
    const parsed = JSON.parse(raw.split('LINES_JSON:')[1]?.trim() || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map((l: any) => ({
      description: String(l.description || ''),
      qty: String(l.qty ?? '1'),
      unit_price: String(l.unit_price ?? '0'),
      discount: String(l.discount ?? '0'),
      tax_rate: l.tax_rate === null || l.tax_rate === undefined ? '' : String(l.tax_rate),
    }));
  } catch { return []; }
}
function lineCalc(line: Line) {
  const gross = Number(line.qty || 0) * Number(line.unit_price || 0);
  const discount = Number(line.discount || 0);
  const taxable = Math.max(gross - discount, 0);
  const tax = taxable * (line.tax_rate === '' ? 0 : Number(line.tax_rate || 0)) / 100;
  return { gross, discount, taxable, tax, total: taxable + tax };
}

export default function PublicDocumentView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [company, setCompany] = useState<any>({});
  const [customer, setCustomer] = useState<any>({});
  const [doc, setDoc] = useState<any>({});

  const params = useMemo(() => {
    if (typeof window === 'undefined') return { type: '', no: '' };
    const search = new URLSearchParams(window.location.search);
    return { type: String(search.get('type') || '').toLowerCase(), no: String(search.get('no') || '') };
  }, []);

  useEffect(() => { loadDocument(); }, []);

  async function loadDocument() {
    setLoading(true);
    try {
      const type = params.type;
      const no = params.no;
      if (!type || !no) throw new Error('Document link is missing type or number.');
      const isQuote = type.includes('quote');
      const isReceipt = type.includes('receipt');
      const table = isQuote ? 'quotes' : isReceipt ? 'receipts' : 'invoices';
      const numberColumn = isQuote ? 'quote_no' : isReceipt ? 'receipt_no' : 'invoice_no';
      const [{ data: companyRow }, { data: document, error: docError }] = await Promise.all([
        supabase.from('company_settings').select('*').limit(1).maybeSingle(),
        supabase.from(table).select('*').eq(numberColumn, no).maybeSingle(),
      ]);
      if (docError) throw docError;
      if (!document) throw new Error('Document not found.');
      const { data: customerRow } = document.customer
        ? await supabase.from('customers').select('*').eq('name', document.customer).maybeSingle()
        : { data: {} as any };
      setCompany(companyRow || {});
      setCustomer(customerRow || {});
      setDoc(document || {});
    } catch (err: any) { setError(err?.message || 'Unable to open document.'); }
    setLoading(false);
  }

  if (loading) return <main style={styles.center}>Loading document...</main>;
  if (error) return <main style={styles.center}><div style={styles.errorCard}><h1>Unable to Open Document</h1><p>{error}</p></div></main>;

  const isQuote = params.type.includes('quote');
  const isReceipt = params.type.includes('receipt');
  const title = isQuote ? 'QUOTE' : isReceipt ? 'RECEIPT' : 'INVOICE';
  const docNo = isQuote ? doc.quote_no : isReceipt ? doc.receipt_no : doc.invoice_no;
  const docDate = isQuote ? doc.quote_date : isReceipt ? doc.receipt_date : doc.invoice_date;
  const lines = isReceipt ? [] : (parseLines(doc.notes || doc.service) || []);
  const displayLines = lines.length ? lines : [{
    description: visibleNotes(doc.service || doc.description || doc.notes) || 'Service',
    qty: String(doc.qty || '1'),
    unit_price: String(doc.unit_price || doc.amount || '0'),
    discount: String(doc.discount || '0'),
    tax_rate: doc.tax_rate === null || doc.tax_rate === undefined ? '' : String(doc.tax_rate || ''),
  }];
  const totals = displayLines.reduce((a, l) => { const c = lineCalc(l); a.gross += c.gross; a.discount += c.discount; a.subtotal += c.taxable; a.tax += c.tax; a.total += c.total; return a; }, { gross: 0, discount: 0, subtotal: 0, tax: 0, total: 0 });
  const total = isReceipt ? Number(doc.amount || 0) : Number(doc.total_amount ?? doc.amount ?? totals.total);
  const subtotal = isReceipt ? Number(doc.amount || 0) : Number(doc.subtotal ?? totals.subtotal);
  const tax = isReceipt ? 0 : Number(doc.tax_amount ?? totals.tax);

  return (
    <main style={styles.page}>
      <div style={styles.actions}><button style={styles.printBtn} onClick={() => window.print()}>Print / Save PDF</button></div>
      <section style={styles.document}>
        <header style={styles.header}>
          <div style={styles.brand}>
            <img src={company.logo_url || LOGO_FALLBACK} style={styles.logo} alt="Aashan & Co LLC" />
            <div><h1 style={styles.companyName}>{company.company_name || 'Aashan & Co LLC'}</h1><p style={styles.sub}>{company.website || 'www.aashan.co'}</p></div>
          </div>
          <div style={styles.contact}><p>{company.address || 'Dallas–Fort Worth metroplex'}</p><p>{company.email || 'support@aashan.co'}</p><p>{company.phone || '(832) 210-4248'}</p></div>
        </header>
        <div style={styles.line} />
        <div style={styles.titleRow}>
          <div><h2 style={styles.title}>{title}</h2><p><b>{title === 'QUOTE' ? 'Quote #' : title === 'INVOICE' ? 'Invoice #' : 'Receipt #'}:</b> {docNo}</p><p><b>Status:</b> {doc.status || ''}</p></div>
          <div style={styles.dateBox}><p><b>Date</b><span>{docDate}</span></p>{!isQuote && !isReceipt && <p><b>Due date</b><span>{doc.due_date}</span></p>}{isReceipt && <p><b>Invoice #</b><span>{doc.invoice_no}</span></p>}</div>
        </div>
        <div style={styles.billBox}><h3>{isReceipt ? 'Received From' : isQuote ? 'Quote To' : 'Bill To'}</h3><p><b>{doc.customer}</b></p><p>{doc.customer_address || customer.address || ''}</p><p>{doc.customer_phone || customer.phone || ''}</p><p>{doc.customer_email || customer.email || ''}</p></div>
        {isReceipt ? (
          <table style={styles.table}><thead><tr><th style={styles.th}>Description</th><th style={styles.thRight}>Amount Received</th></tr></thead><tbody><tr><td style={styles.td}>Payment received for invoice {doc.invoice_no}</td><td style={styles.tdRight}>{money(doc.amount)}</td></tr></tbody></table>
        ) : (
          <table style={styles.table}><thead><tr><th style={styles.th}>Description</th><th style={styles.thRight}>Qty</th><th style={styles.thRight}>Unit Price</th><th style={styles.thRight}>Discount</th><th style={styles.thRight}>Tax</th><th style={styles.thRight}>Amount</th></tr></thead><tbody>{displayLines.map((l, idx) => { const c = lineCalc(l); return <tr key={idx}><td style={styles.td}>{visibleNotes(l.description)}</td><td style={styles.tdRight}>{l.qty || '1'}</td><td style={styles.tdRight}>{money(l.unit_price)}</td><td style={styles.tdRight}>{money(l.discount)}</td><td style={styles.tdRight}>{l.tax_rate === '' ? 'No tax' : `${l.tax_rate || 0}%`}</td><td style={styles.tdRight}>{money(c.total)}</td></tr>; })}</tbody></table>
        )}
        <div style={styles.totals}><p><span>Subtotal</span><b>{money(subtotal)}</b></p>{totals.discount > 0 && <p><span>Discount</span><b>-{money(totals.discount)}</b></p>}<p><span>Tax</span><b>{money(tax)}</b></p><p style={styles.grand}><span>Total</span><b>{money(total)}</b></p>{!isQuote && !isReceipt && <p><span>Balance due</span><b>{money(doc.balance ?? total)}</b></p>}</div>
        {visibleNotes(doc.notes) && <div style={styles.notes}><b>Notes</b><p>{visibleNotes(doc.notes)}</p></div>}
        <footer style={styles.footer}>Thank you for choosing {company.company_name || 'Aashan & Co LLC'}.</footer>
      </section>
    </main>
  );
}

const styles: Record<string, any> = {
  page: { background: '#eef2f7', minHeight: '100vh', padding: 24, fontFamily: 'Arial, sans-serif' },
  center: { minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Arial, sans-serif' },
  errorCard: { background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 20px 60px rgba(15,23,42,0.16)' },
  actions: { maxWidth: 900, margin: '0 auto 16px', textAlign: 'right' },
  printBtn: { background: '#2563eb', color: 'white', border: 0, borderRadius: 10, padding: '11px 16px', fontWeight: 900, cursor: 'pointer' },
  document: { maxWidth: 900, minHeight: 1040, margin: '0 auto', background: 'white', padding: 44, boxShadow: '0 22px 80px rgba(15,23,42,0.16)' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' },
  brand: { display: 'flex', gap: 18, alignItems: 'center' },
  logo: { width: 96, height: 96, objectFit: 'contain' },
  companyName: { margin: 0, fontSize: 27, color: '#0f172a' },
  sub: { margin: '6px 0 0', color: '#334155' },
  contact: { textAlign: 'right', fontSize: 13, lineHeight: 1.45 },
  line: { borderTop: '4px solid #0f172a', margin: '22px 0' },
  titleRow: { display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' },
  title: { fontSize: 38, letterSpacing: '0.06em', margin: 0 },
  dateBox: { minWidth: 220 },
  billBox: { border: '1px solid #cbd5e1', borderRadius: 8, padding: 16, maxWidth: 420, margin: '24px 0' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { background: '#0f172a', color: 'white', padding: 10, border: '1px solid #334155', textAlign: 'left' },
  thRight: { background: '#0f172a', color: 'white', padding: 10, border: '1px solid #334155', textAlign: 'right' },
  td: { padding: 11, border: '1px solid #94a3b8', verticalAlign: 'top' },
  tdRight: { padding: 11, border: '1px solid #94a3b8', textAlign: 'right', verticalAlign: 'top' },
  totals: { width: 280, marginLeft: 'auto', marginTop: 14, border: '1px solid #94a3b8' },
  grand: { background: '#0f172a', color: 'white', fontWeight: 900 },
  notes: { marginTop: 24, border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, background: '#f8fafc' },
  footer: { marginTop: 36, borderTop: '1px solid #cbd5e1', paddingTop: 18, textAlign: 'center', fontWeight: 800 },
};
