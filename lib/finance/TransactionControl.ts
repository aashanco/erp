// Aashan ERP Phase 26.1 - Transaction Control

export function isDocumentLocked(status?: string) {
  const s = String(status || '').toLowerCase();
  return [
    'posted',
    'converted',
    'paid',
    'partially paid',
    'cancelled',
    'voided',
    'completed',
    'invoiced',
  ].includes(s);
}

export function canDeleteDocument(status?: string) {
  return !isDocumentLocked(status);
}

export function canEditDocument(status?: string) {
  const s = String(status || '').toLowerCase();
  return !['posted', 'converted', 'paid', 'cancelled', 'voided'].includes(s);
}

export function receiptPaidAmount(receipts: any[], invoiceNo?: string) {
  return receipts
    .filter((r) => String(r.invoice_no || '') === String(invoiceNo || ''))
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
}

export function invoicePaidAmount(payments: any[], receipts: any[], invoiceId?: number, invoiceNo?: string) {
  const paymentTotal = payments
    .filter((p) => Number(p.invoice_id) === Number(invoiceId) || String(p.invoice_no || '') === String(invoiceNo || ''))
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const receiptTotal = receiptPaidAmount(receipts, invoiceNo);
  return paymentTotal + receiptTotal;
}

export function invoiceBalance(invoice: any, payments: any[], receipts: any[]) {
  const total = Number(invoice.total_amount || invoice.amount || 0);
  return Math.max(total - invoicePaidAmount(payments, receipts, invoice.id, invoice.invoice_no), 0);
}

export function invoiceStatusFromBalance(invoice: any, payments: any[], receipts: any[]) {
  const total = Number(invoice.total_amount || invoice.amount || 0);
  const paid = invoicePaidAmount(payments, receipts, invoice.id, invoice.invoice_no);
  if (paid <= 0) return invoice.status === 'Posted' ? 'Posted' : invoice.status || 'Draft';
  if (paid >= total) return 'Paid';
  return 'Partially Paid';
}
