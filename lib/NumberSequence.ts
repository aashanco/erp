// Aashan ERP Phase 26 - Modular Finance

export type CompanySettingsLike = { tax_rate?: string | number };
export type CustomerLike = { customer_no?: string };
export type PricingDocument = {
  qty?: any;
  unit_price?: any;
  discount?: any;
  tax_rate?: any;
  amount?: any;
  subtotal?: any;
  tax_amount?: any;
  total_amount?: any;
};

export function padNumber(value: number, padding: number | string = 4) {
  return String(value).padStart(Number(padding || 4), '0');
}

export function getNextCustomerNo(customers: CustomerLike[]) {
  const maxNo = customers.reduce((max, c) => {
    const num = Number(String(c.customer_no || '').replace(/[^0-9]/g, ''));
    return Number.isFinite(num) && num > max ? num : max;
  }, 0);
  return `CUST-${padNumber(maxNo + 1, 6)}`;
}

export function getDefaultTaxRate(company: CompanySettingsLike) {
  return String(company?.tax_rate ?? '0');
}

export function calculateLineAmount(doc: PricingDocument) {
  const qty = Number(doc.qty || 0);
  const unitPrice = Number(doc.unit_price || 0);
  const discount = Number(doc.discount || 0);
  const taxRate = Number(doc.tax_rate || 0);
  const subtotal = qty * unitPrice;
  const taxableAmount = Math.max(subtotal - discount, 0);
  const taxAmount = taxableAmount * (taxRate / 100);
  const totalAmount = taxableAmount + taxAmount;

  return {
    qty,
    unit_price: unitPrice,
    discount,
    tax_rate: taxRate,
    subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    amount: totalAmount,
  };
}

export function applyQuoteCalculation<T extends PricingDocument>(nextQuote: T): T {
  const calc = calculateLineAmount(nextQuote);
  return {
    ...nextQuote,
    qty: String(nextQuote.qty ?? '1'),
    unit_price: String(nextQuote.unit_price ?? ''),
    discount: String(nextQuote.discount ?? '0'),
    tax_rate: String(nextQuote.tax_rate ?? '0'),
    subtotal: String(calc.subtotal || 0),
    tax_amount: String(calc.tax_amount || 0),
    total_amount: String(calc.total_amount || 0),
    amount: String(calc.total_amount || 0),
  };
}

export function applyInvoiceCalculation<T extends PricingDocument>(nextInvoice: T): T {
  const calc = calculateLineAmount(nextInvoice);
  return {
    ...nextInvoice,
    qty: String(nextInvoice.qty ?? '1'),
    unit_price: String(nextInvoice.unit_price ?? ''),
    discount: String(nextInvoice.discount ?? '0'),
    tax_rate: String(nextInvoice.tax_rate ?? '0'),
    subtotal: String(calc.subtotal || 0),
    tax_amount: String(calc.tax_amount || 0),
    total_amount: String(calc.total_amount || 0),
    amount: String(calc.total_amount || 0),
  };
}
