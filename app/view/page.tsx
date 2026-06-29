'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type DocumentData = {
  type: string;
  no: string;
  company?: any;
  customer?: any;
  document?: any;
};

const LOGO_FALLBACK = '/aashan-logo.png';

function money(value: any) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function PublicDocumentView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<DocumentData>({ type: '', no: '' });

  const params = useMemo(() => {
    if (typeof window === 'undefined') return { type: '', no: '' };
    const search = new URLSearchParams(window.location.search);
    return {
      type: String(search.get('type') || '').toLowerCase(),
      no: String(search.get('no') || ''),
    };
  }, []);

  useEffect(() => {
    loadDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCompany() {
    const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
    return data || {};
  }

  async function loadCustomer(name: string) {
    if (!name) return {};
    const { data } = await supabase.from('customers').select('*').eq('name', name).maybeSingle();
    return data || {};
  }

  async function loadDocument() {
    setLoading(true);

    try {
      const type = params.type;
      const no = params.no;

      if (!type || !no) {
        setError('Document link is missing type or number.');
        setLoading(false);
        return;
      }

      let table = '';
      let numberColumn = '';

      if (type.includes('quote')) {
        table = 'quotes';
        numberColumn = 'quote_no';
      } else if (type.includes('invoice')) {
        table = 'invoices';
        numberColumn = 'invoice_no';
      } else if (type.includes('receipt')) {
        table = 'receipts';
        numberColumn = 'receipt_no';
      } else {
        setError('Document type is not supported.');
        setLoading(false);
        return;
      }

      const { data: document, error: docError } = await supabase
        .from(table)
        .select('*')
        .eq(numberColumn, no)
        .maybeSingle();

      if (docError) throw docError;
      if (!document) {
        setError('Document not found.');
        setLoading(false);
        return;
      }

      const company = await loadCompany();
      const customer = await loadCustomer(document.customer);

      setData({ type, no, company, customer, document });
    } catch (err: any) {
      setError(err?.message || 'Unable to open document.');
    }

    setLoading(false);
  }

  if (loading) {
    return <main style={styles.center}>Loading document...</main>;
  }

  if (error) {
    return (
      <main style={styles.center}>
        <div style={styles.errorCard}>
          <h1>Unable to Open Document</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  const doc = data.document || {};
  const company = data.company || {};
  const customer = data.customer || {};
  const isQuote = data.type.includes('quote');
  const isReceipt = data.type.includes('receipt');
  const title = isQuote ? 'QUOTE' : isReceipt ? 'RECEIPT' : 'INVOICE';
  const docNo = isQuote ? doc.quote_no : isReceipt ? doc.receipt_no : doc.invoice_no;
  const docDate = isQuote ? doc.quote_date : isReceipt ? doc.receipt_date : doc.invoice_date;
  const subtotal = Number(doc.subtotal || doc.amount || 0);
  const discount = Number(doc.discount || 0);
  const taxAmount = Number(doc.tax_amount || 0);
  const total = Number(doc.total_amount || doc.amount || 0);

  return (
    <main style={styles.page}>
      <div style={styles.actions}>
        <button style={styles.printBtn} onClick={() => window.print()}>Print / Save PDF</button>
      </div>

      <section style={styles.document}>
        <header style={styles.header}>
          <div style={styles.brand}>
            <img src={company.logo_url || LOGO_FALLBACK} style={styles.logo} alt="Aashan & Co LLC" />
            <div>
              <h1 style={styles.companyName}>{company.company_name || 'Aashan & Co LLC'}</h1>
              <p style={styles.sub}>Field Service & Accounting</p>
            </div>
          </div>

          <div style={styles.contact}>
            <p>{company.address || 'Dallas–Fort Worth metroplex'}</p>
            <p>{company.email || 'support@aashan.co'}</p>
            <p>{company.website || 'www.aashan.co'}</p>
            <p>{company.phone || '(832) 210-4248'}</p>
          </div>
        </header>

        <div style={styles.line} />

        <div style={styles.titleRow}>
          <div>
            <h2 style={styles.title}>{title}</h2>
            <p><b>{title === 'QUOTE' ? 'Quote #' : title === 'INVOICE' ? 'Invoice #' : 'Receipt #'}:</b> {docNo}</p>
            <p><b>Status:</b> {doc.status || ''}</p>
          </div>
          <div style={styles.dateBox}>
            <p><b>Date</b><span>{docDate}</span></p>
            {!isQuote && !isReceipt && <p><b>Due date</b><span>{doc.due_date}</span></p>}
          </div>
        </div>

        <div style={styles.billBox}>
          <h3>{isQuote ? 'Quote To' : 'Bill To'}</h3>
          <p><b>{doc.customer}</b></p>
          <p>{doc.customer_address || customer.address || ''}</p>
          <p>{doc.customer_phone || customer.phone || ''}</p>
          <p>{doc.customer_email || customer.email || ''}</p>
        </div>

        <h3 style={styles.service}>{doc.service || doc.notes || 'Service'}</h3>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Description</th>
              <th style={styles.thRight}>Qty</th>
              <th style={styles.thRight}>Unit Price</th>
              <th style={styles.thRight}>Discount</th>
              <th style={styles.thRight}>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}>{doc.service || doc.notes || 'Service'}</td>
              <td style={styles.tdRight}>{Number(doc.qty || 1).toFixed(0)}</td>
              <td style={styles.tdRight}>{money(doc.unit_price || doc.amount)}</td>
              <td style={styles.tdRight}>{money(discount)}</td>
              <td style={styles.tdRight}>{money(total)}</td>
            </tr>
          </tbody>
        </table>

        <div style={styles.totals}>
          <p><span>Sub-total</span><b>{money(subtotal - discount)}</b></p>
          <p><span>Tax {Number(doc.tax_rate || 0).toFixed(2)}%</span><b>{money(taxAmount)}</b></p>
          <p style={styles.grand}><span>Total</span><b>{money(total)}</b></p>
        </div>

        <footer style={styles.footer}>
          Thank you for choosing {company.company_name || 'Aashan & Co LLC'}.
        </footer>
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
  header: { display: 'flex', justifyContent: 'space-between', gap: 24 },
  brand: { display: 'flex', gap: 18, alignItems: 'center' },
  logo: { width: 96, height: 96, objectFit: 'contain' },
  companyName: { margin: 0, fontSize: 27, color: '#0f172a' },
  sub: { margin: '6px 0 0', color: '#334155' },
  contact: { textAlign: 'right', fontSize: 13, lineHeight: 1.45 },
  line: { borderTop: '4px solid #0f172a', margin: '22px 0' },
  titleRow: { display: 'flex', justifyContent: 'space-between', gap: 20 },
  title: { fontSize: 38, letterSpacing: '0.06em', margin: 0 },
  dateBox: { minWidth: 220 },
  billBox: { border: '1px solid #cbd5e1', borderRadius: 8, padding: 16, width: 380, margin: '24px 0' },
  service: { margin: '0 0 12px', color: '#0f172a' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { background: '#0f172a', color: 'white', padding: 10, border: '1px solid #334155', textAlign: 'left' },
  thRight: { background: '#0f172a', color: 'white', padding: 10, border: '1px solid #334155', textAlign: 'right' },
  td: { padding: 11, border: '1px solid #94a3b8', verticalAlign: 'top' },
  tdRight: { padding: 11, border: '1px solid #94a3b8', textAlign: 'right', verticalAlign: 'top' },
  totals: { width: 260, marginLeft: 'auto', marginTop: 14, border: '1px solid #94a3b8' },
  grand: { background: '#0f172a', color: 'white', fontWeight: 900 },
  footer: { marginTop: 36, borderTop: '1px solid #cbd5e1', paddingTop: 18, textAlign: 'center', fontWeight: 800 },
};

