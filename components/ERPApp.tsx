"use client";

import AccountingEngine from "./AccountingEngine";
import UserManagement from "./UserManagement";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";
import {
  canDeleteDocument,
  canEditDocument,
  invoiceBalance as calcInvoiceBalance,
  invoicePaidAmount as calcInvoicePaidAmount,
  invoiceStatusFromBalance,
} from "../lib/finance/TransactionControl";
import {
  getNextCustomerNo,
  getDefaultTaxRate,
  calculateLineAmount,
  applyQuoteCalculation,
  applyInvoiceCalculation,
} from "../lib/finance/NumberSequence";

type Customer = {
  id?: number;
  customer_no?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
};
type Job = {
  id?: number;
  customer: string;
  service: string;
  job_date: string;
  amount: string;
  status: string;
};
type Quote = {
  id?: number;
  quote_no: string;
  customer: string;
  service: string;
  quote_date: string;
  amount: string;
  status: string;
  notes: string;
  qty?: string;
  unit_price?: string;
  discount?: string;
  tax_rate?: string;
  tax_amount?: string;
  subtotal?: string;
  total_amount?: string;
};
type WorkOrder = {
  id?: number;
  work_order_no: string;
  job_id?: number | null;
  customer: string;
  service: string;
  technician: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
};
type Invoice = {
  id?: number;
  invoice_no: string;
  customer: string;
  job_id?: number | null;
  quote_id?: number | null;
  amount: string;
  qty?: string;
  unit_price?: string;
  discount?: string;
  tax_rate?: string;
  tax_amount?: string;
  subtotal?: string;
  total_amount?: string;
  invoice_date: string;
  due_date: string;
  status: string;
  notes?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
};
type Payment = {
  id?: number;
  invoice_id?: number | null;
  invoice_no: string;
  customer: string;
  payment_date: string;
  amount: string;
  payment_method: string;
  bank_name?: string;
  notes: string;
  status?: string;
  posted_at?: string;
};

type Bank = {
  id?: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string;
  opening_balance: string;
  current_balance: string;
  is_active: boolean;
};
type Receipt = {
  id?: number;
  receipt_no: string;
  customer: string;
  invoice_no: string;
  receipt_date: string;
  amount: string;
  payment_method: string;
  bank_name: string;
  notes: string;
  status?: string;
  posted_at?: string;
};
type PurchaseInvoice = {
  id?: number;
  purchase_invoice_no: string;
  vendor: string;
  invoice_date: string;
  due_date: string;
  category: string;
  description: string;
  amount: string;
  status: string;
  bank_name: string;
  notes: string;
};
type JournalEntry = {
  id?: number;
  journal_no: string;
  journal_date: string;
  description: string;
  debit_account: string;
  credit_account: string;
  amount: string;
  notes: string;
};

type UserProfile = {
  id?: string;
  email: string;
  full_name?: string;
  role:
    | "Admin"
    | "Staff"
    | "Office Staff"
    | "Technician"
    | "Customer"
    | "Read Only";
  active?: boolean;
};

type Vendor = {
  id?: number;
  vendor_no: string;
  vendor_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  tax_id: string;
  notes: string;
  status: string;
};

type Expense = {
  id?: number;
  expense_no: string;
  expense_date: string;
  vendor: string;
  category: string;
  description: string;
  amount: string;
  payment_method: string;
  status: string;
};

type CompanySettings = {
  id?: number;
  company_name: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  logo_url: string;
  tax_rate: string;
  payment_terms: string;
  payment_instructions: string;
};
type NumberSequence = {
  id?: number;
  document_type: string;
  prefix: string;
  next_number: string;
  padding: string;
};
type Account = {
  id?: number;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  is_active: boolean;
};
type EmailSettings = {
  id?: number;
  from_name: string;
  from_email: string;
  reply_to_email: string;
  bcc_email: string;
};
type EmailTemplate = {
  id?: number;
  template_name: string;
  subject: string;
  body: string;
};
type TransactionLine = {
  description: string;
  qty: string;
  unit_price: string;
  discount: string;
  tax_rate: string;
};

type EmailDraft = {
  open: boolean;
  type: string;
  to: string;
  subject: string;
  body: string;
  html: string;
  data: Record<string, any>;
  attachmentName: string;
};

const LOGO_SRC = "/aashan-logo.png";
const FORCE_ADMIN_EMAILS = ["thomasmathew77@gmail.com", "support@aashan.co"];

const emptyCustomer: Customer = {
  customer_no: "",
  name: "",
  phone: "",
  email: "",
  address: "",
};
const emptyJob: Job = {
  customer: "",
  service: "",
  job_date: "",
  amount: "",
  status: "New",
};
const emptyQuote: Quote = {
  quote_no: "",
  customer: "",
  service: "",
  quote_date: "",
  amount: "",
  qty: "1",
  unit_price: "",
  discount: "0",
  tax_rate: "0",
  tax_amount: "0",
  subtotal: "0",
  total_amount: "0",
  status: "Draft",
  notes: "",
};
const emptyWorkOrder: WorkOrder = {
  work_order_no: "",
  job_id: null,
  customer: "",
  service: "",
  technician: "",
  scheduled_date: "",
  start_time: "",
  end_time: "",
  status: "Scheduled",
  notes: "",
};
const emptyInvoice: Invoice = {
  invoice_no: "",
  customer: "",
  job_id: null,
  quote_id: null,
  amount: "",
  qty: "1",
  unit_price: "",
  discount: "0",
  tax_rate: "0",
  tax_amount: "0",
  subtotal: "0",
  total_amount: "0",
  invoice_date: "",
  due_date: "",
  status: "Draft",
  notes: "Thank you for choosing Aashan & Co LLC.",
  customer_phone: "",
  customer_email: "",
  customer_address: "",
};
const emptyPayment: Payment = {
  invoice_id: null,
  invoice_no: "",
  customer: "",
  payment_date: "",
  amount: "",
  payment_method: "Cash",
  bank_name: "",
  notes: "",
};
const emptyBank: Bank = {
  bank_name: "",
  account_name: "",
  account_number: "",
  routing_number: "",
  opening_balance: "0",
  current_balance: "0",
  is_active: true,
};
const emptyReceipt: Receipt = {
  receipt_no: "",
  customer: "",
  invoice_no: "",
  receipt_date: "",
  amount: "",
  payment_method: "Cash",
  bank_name: "",
  notes: "",
};
const emptyPurchaseInvoice: PurchaseInvoice = {
  purchase_invoice_no: "",
  vendor: "",
  invoice_date: "",
  due_date: "",
  category: "Materials",
  description: "",
  amount: "",
  status: "Open",
  bank_name: "",
  notes: "",
};
const emptyJournalEntry: JournalEntry = {
  journal_no: "",
  journal_date: "",
  description: "",
  debit_account: "",
  credit_account: "",
  amount: "",
  notes: "",
};
const emptyVendor: Vendor = {
  vendor_no: "",
  vendor_name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  tax_id: "",
  notes: "",
  status: "Active",
};
const emptyExpense: Expense = {
  expense_no: "",
  expense_date: "",
  vendor: "",
  category: "Materials",
  description: "",
  amount: "",
  payment_method: "Cash",
  status: "Draft",
};
const emptyCompany: CompanySettings = {
  company_name: "Aashan & Co LLC",
  phone: "(832) 210-4248",
  email: "support@aashan.co",
  website: "www.aashan.co",
  address: "Dallas, Texas",
  logo_url: "/aashan-logo.png",
  tax_rate: "0",
  payment_terms: "Payment due within agreed terms.",
  payment_instructions: "Please contact Aashan & Co LLC for payment options.",
};
const emptySequence: NumberSequence = {
  document_type: "",
  prefix: "",
  next_number: "1001",
  padding: "4",
};
const emptyAccount: Account = {
  account_code: "",
  account_name: "",
  account_type: "Revenue",
  normal_balance: "Credit",
  is_active: true,
};
const emptyEmailSettings: EmailSettings = {
  from_name: "Aashan & Co LLC",
  from_email: "support@aashan.co",
  reply_to_email: "support@aashan.co",
  bcc_email: "",
};
const emptyTemplate: EmailTemplate = {
  template_name: "",
  subject: "",
  body: "",
};

const DEFAULT_EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  "Quote Email": {
    template_name: "Quote Email",
    subject: "Quote {{quote_no}} from Aashan & Co LLC",
    body: "Hi {{customer_name}},\n\nThank you for considering Aashan & Co LLC for your project.\n\nPlease find the attached quotation for your review. The quote outlines the proposed scope of work and estimated costs based on the information provided. We kindly ask that you review the details and let us know if you have any questions or require any modifications.\n\nPlease note that this quotation includes the labor and services specified. Any additional materials, transportation, permits, equipment rentals, or other project-related expenses not specifically listed may be charged separately.\n\nIf you would like to proceed with the work, simply reply to this email or contact us directly, and we will be happy to schedule your service.\n\nWe appreciate the opportunity to earn your business and look forward to working with you.\n\nThank you for choosing Aashan & Co LLC.\n\nBest Regards,\n\nAashan & Co LLC\n\nPhone: (832) 210-4248\nEmail: support@aashan.co\nWebsite: www.aashan.co",
  },
  "Invoice Email": {
    template_name: "Invoice Email",
    subject: "Invoice {{invoice_no}} from Aashan & Co LLC",
    body: "Hi {{customer_name}},\n\nThank you for choosing Aashan & Co LLC.\n\nPlease find your invoice attached for the services provided. We kindly request that you review the invoice.\n\nIf you have any questions regarding this invoice or require additional information, please do not hesitate to contact us. We are happy to assist you.\n\nWe appreciate your business and look forward to serving you again in the future.\n\nWe would also greatly appreciate your feedback. Please leave us a review on Facebook:\n\nhttps://www.facebook.com/profile.php?id=61584788072935&sk=reviews\n\nYour review helps us improve our services and assists other customers in making informed decisions.\n\nThank you for choosing Aashan & Co LLC.\n\nBest Regards,\n\nAashan & Co LLC\n\nPhone: (832) 210-4248\nEmail: support@aashan.co\nWebsite: www.aashan.co",
  },
  "Payment Receipt Email": {
    template_name: "Payment Receipt Email",
    subject: "Payment Receipt {{receipt_no}} from Aashan & Co LLC",
    body: "Hi {{customer_name}},\n\nThank you for your payment. We appreciate your business and the opportunity to serve you.\n\nThis email confirms that we have received your payment. Please retain this receipt for your records.\n\nIf you have any questions regarding your payment or require additional assistance, please feel free to contact us.\n\nWe would greatly appreciate your feedback. Please leave us a review on Facebook:\n\nhttps://www.facebook.com/profile.php?id=61584788072935&sk=reviews\n\nYour review helps us improve our services and assists other customers in making informed decisions.\n\nThank you for choosing Aashan & Co LLC.\n\nBest Regards,\nAashan & Co LLC",
  },
};
const emptyTransactionLine: TransactionLine = {
  description: "",
  qty: "1",
  unit_price: "",
  discount: "0",
  tax_rate: "",
};

const emptyEmailDraft: EmailDraft = {
  open: false,
  type: "",
  to: "",
  subject: "",
  body: "",
  html: "",
  data: {},
  attachmentName: "",
};

type PrintTemplate = {
  id?: number;
  document_type: string;
  header_title: string;
  header_subtitle: string;
  logo_url: string;
  logo_data_url: string;
  company_block: string;
  footer_text: string;
  terms_text: string;
  notes_text: string;
};

const emptyPrintTemplate: PrintTemplate = {
  document_type: "Invoice",
  header_title: "Aashan & Co LLC",
  header_subtitle: "Quality Work Through Dedication",
  logo_url: "/aashan-logo.png",
  logo_data_url: "",
  company_block:
    "Phone: (832) 210-4248\nEmail: support@aashan.co\nAddress: Dallas, Texas",
  footer_text: "Thank you for choosing Aashan & Co LLC.",
  terms_text: "Payment due within agreed terms.",
  notes_text: "",
};

export default function ERPApp() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);

  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "customers"
    | "vendors"
    | "accounting"
    | "quotes"
    | "jobs"
    | "workorders"
    | "technician"
    | "calendar"
    | "invoices"
    | "payments"
    | "receipts"
    | "expenses"
    | "purchases"
    | "journals"
    | "banks"
    | "reports"
    | "masters"
    | "import"
  >("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(
    [],
  );
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [job, setJob] = useState<Job>(emptyJob);
  const [quote, setQuote] = useState<Quote>(emptyQuote);
  const [workOrder, setWorkOrder] = useState<WorkOrder>(emptyWorkOrder);
  const [invoice, setInvoice] = useState<Invoice>(emptyInvoice);
  const [quoteLines, setQuoteLines] = useState<TransactionLine[]>([
    { ...emptyTransactionLine },
  ]);
  const [invoiceLines, setInvoiceLines] = useState<TransactionLine[]>([
    { ...emptyTransactionLine },
  ]);
  const [payment, setPayment] = useState<Payment>(emptyPayment);
  const [bank, setBank] = useState<Bank>(emptyBank);
  const [receipt, setReceipt] = useState<Receipt>(emptyReceipt);
  const [purchaseInvoice, setPurchaseInvoice] =
    useState<PurchaseInvoice>(emptyPurchaseInvoice);
  const [journalEntry, setJournalEntry] =
    useState<JournalEntry>(emptyJournalEntry);
  const [vendor, setVendor] = useState<Vendor>(emptyVendor);
  const [expense, setExpense] = useState<Expense>(emptyExpense);
  const [company, setCompany] = useState<CompanySettings>(emptyCompany);
  const [sequences, setSequences] = useState<NumberSequence[]>([]);
  const [sequence, setSequence] = useState<NumberSequence>(emptySequence);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [account, setAccount] = useState<Account>(emptyAccount);
  const [emailSettings, setEmailSettings] =
    useState<EmailSettings>(emptyEmailSettings);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [template, setTemplate] = useState<EmailTemplate>(emptyTemplate);
  const [emailDraft, setEmailDraft] = useState<EmailDraft>(emptyEmailDraft);
  const [emailSending, setEmailSending] = useState(false);
  const [printTemplates, setPrintTemplates] = useState<PrintTemplate[]>([]);
  const [printTemplate, setPrintTemplate] =
    useState<PrintTemplate>(emptyPrintTemplate);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [printQuote, setPrintQuote] = useState<Quote | null>(null);
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(
    null,
  );
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
  const [editingWorkOrderId, setEditingWorkOrderId] = useState<number | null>(
    null,
  );
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [editingBankId, setEditingBankId] = useState<number | null>(null);
  const [editingReceiptId, setEditingReceiptId] = useState<number | null>(null);
  const [editingPurchaseInvoiceId, setEditingPurchaseInvoiceId] = useState<
    number | null
  >(null);
  const [editingJournalEntryId, setEditingJournalEntryId] = useState<
    number | null
  >(null);
  const [editingVendorId, setEditingVendorId] = useState<number | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [editingSequenceId, setEditingSequenceId] = useState<number | null>(
    null,
  );
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(
    null,
  );
  const [editingPrintTemplateId, setEditingPrintTemplateId] = useState<
    number | null
  >(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [pendingImportType, setPendingImportType] = useState<
    | "customers"
    | "vendors"
    | "expenses"
    | "accounts"
    | "payments"
    | "receipts"
    | "invoices"
    | "purchase_invoices"
    | "journal_entries"
    | ""
  >("");

  const canEdit = profile?.role !== "Read Only";
  const canAdmin = profile?.role === "Admin";
  const isTechnician = profile?.role === "Technician";
  const isCustomer = profile?.role === "Customer";
  const hasFullAccess = !isTechnician && !isCustomer;

  function getAllowedTabsForRole(): Array<typeof activeTab> {
    if (isTechnician)
      return ["dashboard", "jobs", "workorders", "technician", "customers"];
    if (isCustomer) return ["dashboard", "quotes", "invoices", "receipts"];
    if (profile?.role === "Read Only")
      return [
        "dashboard",
        "customers",
        "quotes",
        "jobs",
        "workorders",
        "invoices",
        "receipts",
        "reports",
      ];
    return [
      "dashboard",
      "customers",
      "vendors",
      "accounting",
      "quotes",
      "jobs",
      "workorders",
      "technician",
      "calendar",
      "invoices",
      "payments",
      "receipts",
      "expenses",
      "purchases",
      "journals",
      "banks",
      "reports",
      "masters",
      "import",
    ];
  }

  async function loadUserProfile(user: any) {
    if (!user?.id) return;

    const { data: existingProfiles } = await supabase
      .from("user_profiles")
      .select("*")
      .limit(1);
    const firstUser = !existingProfiles || existingProfiles.length === 0;

    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const userEmail = String(user.email || "").toLowerCase();
    const shouldForceAdmin = FORCE_ADMIN_EMAILS.includes(userEmail);

    if (data) {
      const fixedProfile = {
        ...data,
        role: shouldForceAdmin ? "Admin" : data.role,
      } as UserProfile;
      setProfile(fixedProfile);
      if (shouldForceAdmin && data.role !== "Admin") {
        await supabase
          .from("user_profiles")
          .update({ role: "Admin", active: true })
          .eq("id", user.id);
      }
      return;
    }

    const newProfile = {
      id: user.id,
      email: user.email || "",
      full_name: user.email || "",
      role: shouldForceAdmin || firstUser ? "Admin" : "Staff",
      active: true,
    };

    const { data: inserted, error } = await supabase
      .from("user_profiles")
      .insert([newProfile])
      .select()
      .single();

    if (error) {
      console.warn(error.message);
      setProfile(newProfile as UserProfile);
    } else {
      setProfile(inserted as UserProfile);
    }
  }

  async function login() {
    if (!loginEmail || !loginPassword) return alert("Enter email and password");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) return alert(error.message);
    setSession(data.session);
    await loadUserProfile(data.user);
  }

  async function signUp() {
    if (!loginEmail || !loginPassword) return alert("Enter email and password");
    const { data, error } = await supabase.auth.signUp({
      email: loginEmail,
      password: loginPassword,
    });
    if (error) return alert(error.message);

    if (data.session) {
      setSession(data.session);
      await loadUserProfile(data.user);
    } else {
      alert("Account created. Please check your email to confirm, then login.");
      setAuthMode("login");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  async function loadData() {
    setLoading(true);
    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("*")
      .order("id", { ascending: false });
    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .order("id", { ascending: false });
    const { data: quoteData, error: quoteError } = await supabase
      .from("quotes")
      .select("*")
      .order("id", { ascending: false });
    const { data: workOrderData, error: workOrderError } = await supabase
      .from("work_orders")
      .select("*")
      .order("scheduled_date", { ascending: true });
    const { data: invoiceData, error: invoiceError } = await supabase
      .from("invoices")
      .select("*")
      .order("id", { ascending: false });
    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .order("id", { ascending: false });
    const { data: bankData, error: bankError } = await supabase
      .from("banks")
      .select("*")
      .order("id", { ascending: false });
    const { data: receiptData, error: receiptError } = await supabase
      .from("receipts")
      .select("*")
      .order("id", { ascending: false });
    const { data: purchaseInvoiceData, error: purchaseInvoiceError } =
      await supabase
        .from("purchase_invoices")
        .select("*")
        .order("id", { ascending: false });
    const { data: journalEntryData, error: journalEntryError } = await supabase
      .from("journal_entries")
      .select("*")
      .order("id", { ascending: false });
    const { data: vendorData, error: vendorError } = await supabase
      .from("vendors")
      .select("*")
      .order("id", { ascending: false });
    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .select("*")
      .order("id", { ascending: false });
    const { data: companyData } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1);
    const { data: sequenceData } = await supabase
      .from("number_sequences")
      .select("*")
      .order("id", { ascending: true });
    const { data: accountData } = await supabase
      .from("gl_accounts")
      .select("*")
      .order("account_code", { ascending: true });
    const { data: emailSettingsData } = await supabase
      .from("email_settings")
      .select("*")
      .limit(1);
    const { data: templateData } = await supabase
      .from("email_templates")
      .select("*")
      .order("template_name", { ascending: true });
    const { data: printTemplateData } = await supabase
      .from("print_templates")
      .select("*")
      .order("document_type", { ascending: true });
    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .order("email", { ascending: true });

    if (customerError) alert(customerError.message);
    if (jobError) alert(jobError.message);
    if (quoteError) alert(quoteError.message);
    if (workOrderError) alert(workOrderError.message);
    if (invoiceError) alert(invoiceError.message);
    if (paymentError) alert(paymentError.message);
    if (bankError) console.warn(bankError.message);
    if (receiptError) console.warn(receiptError.message);
    if (purchaseInvoiceError) console.warn(purchaseInvoiceError.message);
    if (journalEntryError) console.warn(journalEntryError.message);
    if (vendorError) alert(vendorError.message);
    if (expenseError) alert(expenseError.message);

    setCustomers(customerData || []);
    setJobs(
      (jobData || []).map((j: any) => ({
        ...j,
        amount: String(j.amount || ""),
      })),
    );
    setQuotes(
      (quoteData || []).map((q: any) => ({
        ...q,
        amount: String(q.amount || ""),
      })),
    );
    setWorkOrders(workOrderData || []);
    setInvoices(
      (invoiceData || []).map((i: any) => ({
        ...i,
        amount: String(i.amount || ""),
      })),
    );
    setPayments(
      (paymentData || []).map((p: any) => ({
        ...p,
        amount: String(p.amount || ""),
      })),
    );
    setBanks(
      (bankData || []).map((b: any) => ({
        ...b,
        opening_balance: String(b.opening_balance || 0),
        current_balance: String(b.current_balance || 0),
      })),
    );
    setReceipts(
      (receiptData || []).map((r: any) => ({
        ...r,
        amount: String(r.amount || ""),
      })),
    );
    setPurchaseInvoices(
      (purchaseInvoiceData || []).map((pi: any) => ({
        ...pi,
        amount: String(pi.amount || ""),
      })),
    );
    setJournalEntries(
      (journalEntryData || []).map((je: any) => ({
        ...je,
        amount: String(je.amount || ""),
      })),
    );
    setVendors(vendorData || []);
    setExpenses(
      (expenseData || []).map((e: any) => ({
        ...e,
        amount: String(e.amount || ""),
      })),
    );
    if (companyData && companyData.length > 0)
      setCompany({
        ...emptyCompany,
        ...companyData[0],
        tax_rate: String(companyData[0].tax_rate || 0),
      });
    setSequences(
      (sequenceData || []).map((s: any) => ({
        ...s,
        next_number: String(s.next_number || ""),
        padding: String(s.padding || 4),
      })),
    );
    setAccounts(accountData || []);
    if (emailSettingsData && emailSettingsData.length > 0)
      setEmailSettings({ ...emptyEmailSettings, ...emailSettingsData[0] });
    setTemplates(templateData || []);
    setPrintTemplates(printTemplateData || []);
    setUserProfiles(profileData || []);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadUserProfile(data.session.user);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) await loadUserProfile(newSession.user);
        if (!newSession) setProfile(null);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) loadData();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") loadData();
    };
    window.addEventListener("focus", loadData);
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      window.removeEventListener("focus", loadData);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [session]);

  useEffect(() => {
    if (!profile) return;
    const allowedTabs = getAllowedTabsForRole();
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab("dashboard");
    }
  }, [profile, activeTab]);

  useEffect(() => {
    if (printInvoice || printQuote || printReceipt) {
      const timer = setTimeout(() => window.print(), 900);
      return () => clearTimeout(timer);
    }
  }, [printInvoice, printQuote, printReceipt]);

  function nextQuoteNo() {
    const maxNo = quotes.reduce((max, q) => {
      const num = Number(String(q.quote_no || "").replace(/[^0-9]/g, ""));
      return Number.isFinite(num) && num > max ? num : max;
    }, 1000);
    return `Q-${String(maxNo + 1).padStart(4, "0")}`;
  }

  function nextCustomerNo() {
    return getNextCustomerNo(customers);
  }

  function defaultTaxRate() {
    return getDefaultTaxRate(company);
  }

  function nextWorkOrderNo() {
    const maxNo = workOrders.reduce((max, wo) => {
      const num = Number(String(wo.work_order_no || "").replace(/[^0-9]/g, ""));
      return Number.isFinite(num) && num > max ? num : max;
    }, 1000);
    return `WO-${String(maxNo + 1).padStart(4, "0")}`;
  }

  function nextReceiptNo() {
    return `RCPT-${String(receipts.length + 1).padStart(4, "0")}`;
  }

  function nextPurchaseInvoiceNo() {
    return `PINV-${String(purchaseInvoices.length + 1).padStart(4, "0")}`;
  }

  function nextJournalNo() {
    return `JE-${String(journalEntries.length + 1).padStart(4, "0")}`;
  }

  function nextInvoiceNo() {
    const maxNo = invoices.reduce((max, inv) => {
      const num = Number(String(inv.invoice_no || "").replace(/[^0-9]/g, ""));
      return Number.isFinite(num) && num > max ? num : max;
    }, 1000);
    return `INV-${String(maxNo + 1).padStart(4, "0")}`;
  }

  function invoicePaidAmount(invoiceId?: number, invoiceNo?: string) {
    return calcInvoicePaidAmount(payments, receipts, invoiceId, invoiceNo);
  }

  function invoiceBalance(inv: Invoice) {
    return calcInvoiceBalance(inv, payments, receipts);
  }

  async function updateBankCurrentBalance(bankName: string, delta: number) {
    if (!bankName || !delta) return;

    const bank = banks.find((b) => b.bank_name === bankName);
    if (!bank?.id) return;

    const newBalance = Number(bank.current_balance || 0) + Number(delta || 0);

    await supabase
      .from("banks")
      .update({ current_balance: newBalance })
      .eq("id", bank.id);
  }

  async function applyBankDelta(
    oldBankName: string,
    oldAmount: number,
    newBankName: string,
    newAmount: number,
  ) {
    if (oldBankName) {
      await updateBankCurrentBalance(oldBankName, -Number(oldAmount || 0));
    }

    if (newBankName) {
      await updateBankCurrentBalance(newBankName, Number(newAmount || 0));
    }
  }

  function findLedgerCode(
    nameContains: string,
    fallbackCode: string,
    fallbackName: string,
  ) {
    const found = accounts.find((a) =>
      String(a.account_name || "")
        .toLowerCase()
        .includes(nameContains.toLowerCase()),
    );

    return {
      account_code: found?.account_code || fallbackCode,
      account_name: found?.account_name || fallbackName,
    };
  }

  async function postAccountingEntry(
    sourceType: string,
    sourceId: number | null | undefined,
    sourceNo: string,
    transactionDate: string | null | undefined,
    description: string,
    lines: {
      account_code: string;
      account_name: string;
      debit: number;
      credit: number;
      description: string;
    }[],
  ) {
    if (!sourceNo || !lines.length) return;

    const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
    const totalCredit = lines.reduce(
      (sum, l) => sum + Number(l.credit || 0),
      0,
    );

    if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
      alert(
        `Accounting entry is not balanced for ${sourceNo}. Debit ${totalDebit.toFixed(2)} / Credit ${totalCredit.toFixed(2)}`,
      );
      return;
    }

    await supabase
      .from("gl_transaction_headers")
      .delete()
      .eq("source_type", sourceType)
      .eq("source_no", sourceNo);

    const transactionNo = `GL-${sourceType.replace(/[^A-Z0-9]/gi, "").toUpperCase()}-${sourceNo}`;
    const { data: header, error: headerError } = await supabase
      .from("gl_transaction_headers")
      .insert([
        {
          transaction_no: transactionNo,
          transaction_date:
            transactionDate || new Date().toISOString().slice(0, 10),
          source_type: sourceType,
          source_id: sourceId || null,
          source_no: sourceNo,
          description,
          status: "Posted",
          total_debit: totalDebit,
          total_credit: totalCredit,
        },
      ])
      .select("id")
      .single();

    if (headerError) {
      alert(headerError.message);
      return;
    }

    const detailRows = lines.map((line, index) => ({
      header_id: header.id,
      line_no: index + 1,
      account_code: line.account_code,
      account_name: line.account_name,
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      description: line.description || description,
    }));

    const { error: lineError } = await supabase
      .from("gl_transaction_lines")
      .insert(detailRows);

    if (lineError) alert(lineError.message);
  }

  async function postInvoiceAccounting(inv: any, sourceId?: number | null) {
    const ar = findLedgerCode("receivable", "1000", "Accounts Receivable");
    const revenue = findLedgerCode(
      "revenue",
      "4010",
      "Repair & Maintenance Revenue",
    );
    const tax = findLedgerCode("tax payable", "2100", "Tax Payable");

    const subtotal =
      Number(inv.subtotal || inv.amount || 0) - Number(inv.discount || 0);
    const taxAmount = Number(inv.tax_amount || 0);
    const total = Number(inv.total_amount || inv.amount || 0);

    const lines = [
      {
        ...ar,
        debit: total,
        credit: 0,
        description: `Invoice ${inv.invoice_no} - ${inv.customer}`,
      },
      {
        ...revenue,
        debit: 0,
        credit: subtotal,
        description: `Revenue ${inv.invoice_no}`,
      },
    ];

    if (taxAmount > 0) {
      lines.push({
        ...tax,
        debit: 0,
        credit: taxAmount,
        description: `Sales tax ${inv.invoice_no}`,
      });
    }

    await postAccountingEntry(
      "Invoice",
      sourceId,
      inv.invoice_no,
      inv.invoice_date,
      `Invoice ${inv.invoice_no} - ${inv.customer}`,
      lines,
    );
  }

  async function postReceiptAccounting(rcpt: any, sourceId?: number | null) {
    const bank = rcpt.bank_name
      ? findLedgerCode("bank", "1010", rcpt.bank_name)
      : findLedgerCode("cash", "1020", "Cash on Hand");
    const ar = findLedgerCode("receivable", "1000", "Accounts Receivable");
    const amount = Number(rcpt.amount || 0);

    await postAccountingEntry(
      "Receipt",
      sourceId,
      rcpt.receipt_no,
      rcpt.receipt_date,
      `Receipt ${rcpt.receipt_no} - ${rcpt.customer}`,
      [
        {
          ...bank,
          debit: amount,
          credit: 0,
          description: `Receipt ${rcpt.receipt_no}`,
        },
        {
          ...ar,
          debit: 0,
          credit: amount,
          description: `Receipt applied to invoice ${rcpt.invoice_no}`,
        },
      ],
    );
  }

  async function postCustomerPaymentAccounting(
    pay: any,
    sourceId?: number | null,
  ) {
    const bank = pay.bank_name
      ? findLedgerCode("bank", "1010", pay.bank_name)
      : findLedgerCode("cash", "1020", "Cash on Hand");
    const ar = findLedgerCode("receivable", "1000", "Accounts Receivable");
    const amount = Number(pay.amount || 0);

    await postAccountingEntry(
      "Customer Payment",
      sourceId,
      pay.invoice_no,
      pay.payment_date,
      `Customer payment ${pay.invoice_no} - ${pay.customer}`,
      [
        {
          ...bank,
          debit: amount,
          credit: 0,
          description: `Payment received ${pay.invoice_no}`,
        },
        {
          ...ar,
          debit: 0,
          credit: amount,
          description: `Payment applied to invoice ${pay.invoice_no}`,
        },
      ],
    );
  }

  function getCustomerByName(name: string) {
    return customers.find((c) => c.name === name);
  }

  function getJobById(jobId?: number | null) {
    return jobs.find((j) => Number(j.id) === Number(jobId));
  }

  async function refreshInvoicePaymentStatus(inv: Invoice) {
    if (!inv.id) return;
    const balance = invoiceBalance(inv);
    const paid = invoicePaidAmount(inv.id, inv.invoice_no);
    let status = inv.status;

    if (paid <= 0) status = inv.status === "Draft" ? "Draft" : "Sent";
    else if (balance <= 0) status = "Paid";
    else status = "Partially Paid";

    await supabase.from("invoices").update({ status }).eq("id", inv.id);

    if (inv.job_id && status === "Paid") {
      await supabase
        .from("jobs")
        .update({ status: "Paid" })
        .eq("id", inv.job_id);
    }
  }

  async function saveCustomer() {
    if (!customer.name.trim()) return alert("Enter customer name");

    const payload = {
      ...customer,
      customer_no: customer.customer_no || nextCustomerNo(),
    };

    const res = editingCustomerId
      ? await supabase
          .from("customers")
          .update(payload)
          .eq("id", editingCustomerId)
      : await supabase.from("customers").insert([payload]);

    if (res.error) return alert(res.error.message);
    setCustomer(emptyCustomer);
    setEditingCustomerId(null);
    await loadData();
  }

  function editCustomer(c: Customer) {
    setCustomer(c);
    setEditingCustomerId(c.id || null);
    setActiveTab("customers");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteCustomer(id?: number) {
    if (!id || !confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  function lineCalc(line: TransactionLine) {
    const qty = Number(line.qty || 0);
    const unit = Number(line.unit_price || 0);
    const discount = Number(line.discount || 0);
    const taxable = Math.max(qty * unit - discount, 0);
    const taxRate = line.tax_rate === "" ? 0 : Number(line.tax_rate || 0);
    const tax = (taxable * taxRate) / 100;
    return { subtotal: taxable, tax, total: taxable + tax };
  }

  function documentTotals(lines: TransactionLine[]) {
    return lines.reduce(
      (acc, line) => {
        const calc = lineCalc(line);
        acc.subtotal += calc.subtotal;
        acc.tax += calc.tax;
        acc.total += calc.total;
        return acc;
      },
      { subtotal: 0, tax: 0, total: 0 },
    );
  }

  function cleanLines(lines: TransactionLine[]) {
    return lines.filter(
      (line) =>
        line.description.trim() ||
        Number(line.qty || 0) ||
        Number(line.unit_price || 0),
    );
  }

  function visibleNotes(value?: string) {
    return String(value || "")
      .split("LINES_JSON:")[0]
      .trim();
  }

  function updateQuoteLine(
    index: number,
    field: keyof TransactionLine,
    value: string,
  ) {
    setQuoteLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  }

  function updateInvoiceLine(
    index: number,
    field: keyof TransactionLine,
    value: string,
  ) {
    setInvoiceLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  }

  function addQuoteLine() {
    setQuoteLines((prev) => [...prev, { ...emptyTransactionLine }]);
  }

  function addInvoiceLine() {
    setInvoiceLines((prev) => [...prev, { ...emptyTransactionLine }]);
  }

  function deleteQuoteLine(index: number) {
    setQuoteLines((prev) =>
      prev.length === 1
        ? [{ ...emptyTransactionLine }]
        : prev.filter((_, i) => i !== index),
    );
  }

  function deleteInvoiceLine(index: number) {
    setInvoiceLines((prev) =>
      prev.length === 1
        ? [{ ...emptyTransactionLine }]
        : prev.filter((_, i) => i !== index),
    );
  }

  function resetQuoteForm() {
    setQuote(emptyQuote);
    setQuoteLines([{ ...emptyTransactionLine }]);
    setEditingQuoteId(null);
  }

  function resetInvoiceForm() {
    setInvoice(emptyInvoice);
    setInvoiceLines([{ ...emptyTransactionLine }]);
    setEditingInvoiceId(null);
  }

  async function saveQuote() {
    const lines = cleanLines(quoteLines);
    if (!quote.customer.trim() || lines.length === 0)
      return alert("Select customer and enter at least one line");
    const today = new Date().toISOString().slice(0, 10);
    const totals = documentTotals(lines);
    const first = lines[0] || emptyTransactionLine;
    const payload = {
      quote_no: quote.quote_no || nextQuoteNo(),
      customer: quote.customer,
      service: lines
        .map((line) => line.description)
        .filter(Boolean)
        .join("; "),
      quote_date: quote.quote_date || today,
      qty: Number(first.qty || 0),
      unit_price: Number(first.unit_price || 0),
      discount: lines.reduce(
        (sum, line) => sum + Number(line.discount || 0),
        0,
      ),
      tax_rate: first.tax_rate === "" ? 0 : Number(first.tax_rate || 0),
      subtotal: Number(totals.subtotal.toFixed(2)),
      tax_amount: Number(totals.tax.toFixed(2)),
      total_amount: Number(totals.total.toFixed(2)),
      amount: Number(totals.total.toFixed(2)),
      status: quote.status,
      notes: `${quote.notes || ""}

LINES_JSON:${JSON.stringify(lines)}`.trim(),
    };

    const res = editingQuoteId
      ? await supabase.from("quotes").update(payload).eq("id", editingQuoteId)
      : await supabase.from("quotes").insert([payload]);

    if (res.error) return alert(res.error.message);
    resetQuoteForm();
    await loadData();
  }

  function editQuote(q: Quote) {
    const savedLines = String(q.notes || "").includes("LINES_JSON:")
      ? (() => {
          try {
            return JSON.parse(
              String(q.notes || "").split("LINES_JSON:")[1],
            ) as TransactionLine[];
          } catch {
            return null;
          }
        })()
      : null;
    setQuote({
      ...q,
      amount: String(q.amount || ""),
      qty: String(q.qty || "1"),
      unit_price: String(q.unit_price || q.amount || ""),
      discount: String(q.discount || "0"),
      tax_rate:
        q.tax_rate === null || q.tax_rate === undefined
          ? ""
          : String(q.tax_rate),
      subtotal: String(q.subtotal || 0),
      tax_amount: String(q.tax_amount || 0),
      total_amount: String(q.total_amount || q.amount || 0),
      notes: String(q.notes || "")
        .split("LINES_JSON:")[0]
        .trim(),
    });
    setQuoteLines(
      savedLines && savedLines.length
        ? savedLines
        : [
            {
              description: q.service || "",
              qty: String(q.qty || "1"),
              unit_price: String(q.unit_price || q.amount || ""),
              discount: String(q.discount || "0"),
              tax_rate:
                q.tax_rate === null || q.tax_rate === undefined
                  ? ""
                  : String(q.tax_rate),
            },
          ],
    );
    setEditingQuoteId(q.id || null);
    setActiveTab("quotes");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteQuote(id?: number) {
    const existing = quotes.find((q) => Number(q.id) === Number(id));
    if (existing && !canDeleteDocument(existing.status))
      return alert(
        "This quote is locked and cannot be deleted after conversion/posting.",
      );
    if (!id || !confirm("Delete this quote?")) return;
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function quickQuoteStatus(id: number | undefined, status: string) {
    if (!id) return;
    const { error } = await supabase
      .from("quotes")
      .update({ status })
      .eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function convertQuoteToJob(q: Quote) {
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      customer: q.customer,
      service: q.service,
      job_date: today,
      amount: Number(q.amount || 0),
      status: "New",
    };
    const res = await supabase.from("jobs").insert([payload]);
    if (res.error) return alert(res.error.message);
    if (q.id)
      await supabase
        .from("quotes")
        .update({ status: "Converted" })
        .eq("id", q.id);
    await loadData();
    alert("Quote converted to Job");
  }

  async function convertQuoteToInvoice(q: Quote) {
    const today = new Date().toISOString().slice(0, 10);
    const c = getCustomerByName(q.customer);
    const payload = {
      invoice_no: nextInvoiceNo(),
      customer: q.customer,
      job_id: null,
      quote_id: q.id || null,
      qty: Number(q.qty || 1),
      unit_price: Number(q.unit_price || q.amount || 0),
      discount: Number(q.discount || 0),
      tax_rate: Number(q.tax_rate || 0),
      subtotal: Number(q.subtotal || q.amount || 0),
      tax_amount: Number(q.tax_amount || 0),
      total_amount: Number(q.total_amount || q.amount || 0),
      amount: Number(q.total_amount || q.amount || 0),
      invoice_date: today,
      due_date: today,
      status: "Draft",
      notes: q.notes || "Thank you for choosing Aashan & Co LLC.",
      customer_phone: c?.phone || "",
      customer_email: c?.email || "",
      customer_address: c?.address || "",
    };
    const res = await supabase.from("invoices").insert([payload]);
    if (res.error) return alert(res.error.message);
    if (q.id)
      await supabase
        .from("quotes")
        .update({ status: "Approved" })
        .eq("id", q.id);
    await loadData();
    alert("Quote converted to Invoice");
  }

  async function saveJob() {
    if (!job.customer.trim() || !job.service.trim())
      return alert("Enter customer and service");
    const payload = {
      customer: job.customer,
      service: job.service,
      job_date: job.job_date || null,
      amount: Number(job.amount || 0),
      status: job.status,
    };
    const res = editingJobId
      ? await supabase.from("jobs").update(payload).eq("id", editingJobId)
      : await supabase.from("jobs").insert([payload]);
    if (res.error) return alert(res.error.message);
    setJob(emptyJob);
    setEditingJobId(null);
    await loadData();
  }

  function editJob(j: Job) {
    setJob({ ...j, amount: String(j.amount || "") });
    setEditingJobId(j.id || null);
    setActiveTab("jobs");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteJob(id?: number) {
    if (!id || !confirm("Delete this job?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function quickJobStatus(id: number | undefined, status: string) {
    if (!id) return;
    const { error } = await supabase
      .from("jobs")
      .update({ status })
      .eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  function fillWorkOrderFromJob(jobIdValue: string) {
    if (!jobIdValue) return setWorkOrder({ ...workOrder, job_id: null });
    const selected = jobs.find((j) => String(j.id) === jobIdValue);
    if (!selected) return;
    const today = new Date().toISOString().slice(0, 10);
    setWorkOrder({
      work_order_no: workOrder.work_order_no || nextWorkOrderNo(),
      job_id: selected.id || null,
      customer: selected.customer,
      service: selected.service,
      technician: workOrder.technician || "",
      scheduled_date: workOrder.scheduled_date || today,
      start_time: workOrder.start_time || "",
      end_time: workOrder.end_time || "",
      status: workOrder.status || "Scheduled",
      notes: workOrder.notes || "",
    });
  }

  async function saveWorkOrder() {
    if (!workOrder.customer.trim() || !workOrder.service.trim())
      return alert("Select job or enter customer and service");
    const payload = {
      work_order_no: workOrder.work_order_no || nextWorkOrderNo(),
      job_id: workOrder.job_id || null,
      customer: workOrder.customer,
      service: workOrder.service,
      technician: workOrder.technician,
      scheduled_date: workOrder.scheduled_date || null,
      start_time: workOrder.start_time,
      end_time: workOrder.end_time,
      status: workOrder.status,
      notes: workOrder.notes,
    };

    const res = editingWorkOrderId
      ? await supabase
          .from("work_orders")
          .update(payload)
          .eq("id", editingWorkOrderId)
      : await supabase.from("work_orders").insert([payload]);

    if (res.error) return alert(res.error.message);

    if (payload.job_id) {
      await supabase
        .from("jobs")
        .update({
          status: payload.status === "Completed" ? "Completed" : "In Progress",
        })
        .eq("id", payload.job_id);
    }

    setWorkOrder(emptyWorkOrder);
    setEditingWorkOrderId(null);
    await loadData();
  }

  function editWorkOrder(wo: WorkOrder) {
    setWorkOrder(wo);
    setEditingWorkOrderId(wo.id || null);
    setActiveTab("workorders");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteWorkOrder(id?: number) {
    if (!id || !confirm("Delete this work order?")) return;
    const { error } = await supabase.from("work_orders").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function quickWorkOrderStatus(
    id: number | undefined,
    status: string,
    jobId?: number | null,
  ) {
    if (!id) return;
    const { error } = await supabase
      .from("work_orders")
      .update({ status })
      .eq("id", id);
    if (error) return alert(error.message);
    if (jobId)
      await supabase
        .from("jobs")
        .update({
          status: status === "Completed" ? "Completed" : "In Progress",
        })
        .eq("id", jobId);
    await loadData();
  }

  function fillInvoiceFromQuote(quoteIdValue: string) {
    if (!quoteIdValue) return setInvoice({ ...invoice, quote_id: null });
    const selected = quotes.find((q) => String(q.id) === quoteIdValue);
    if (!selected) return;
    const today = new Date().toISOString().slice(0, 10);
    const c = getCustomerByName(selected.customer);
    setInvoice(
      applyInvoiceCalculation({
        ...invoice,
        quote_id: selected.id || null,
        job_id: null,
        customer: selected.customer,
        amount: String(selected.total_amount || selected.amount || ""),
        qty: String(selected.qty || "1"),
        unit_price: String(selected.unit_price || selected.amount || ""),
        discount: String(selected.discount || "0"),
        tax_rate: String(selected.tax_rate || "0"),
        subtotal: String(selected.subtotal || selected.amount || 0),
        tax_amount: String(selected.tax_amount || 0),
        total_amount: String(selected.total_amount || selected.amount || 0),
        invoice_date: invoice.invoice_date || today,
        due_date: invoice.due_date || today,
        notes:
          selected.service ||
          selected.notes ||
          "Thank you for choosing Aashan & Co LLC.",
        customer_phone: c?.phone || "",
        customer_email: c?.email || "",
        customer_address: c?.address || "",
      }),
    );
    setInvoiceLines([
      {
        description: selected.service || selected.notes || "",
        qty: String(selected.qty || "1"),
        unit_price: String(selected.unit_price || selected.amount || ""),
        discount: String(selected.discount || "0"),
        tax_rate:
          selected.tax_rate === null || selected.tax_rate === undefined
            ? ""
            : String(selected.tax_rate),
      },
    ]);
  }

  function fillInvoiceFromJob(jobIdValue: string) {
    if (!jobIdValue) return setInvoice({ ...invoice, job_id: null });
    const selected = jobs.find((j) => String(j.id) === jobIdValue);
    if (!selected) return;
    const today = new Date().toISOString().slice(0, 10);
    const c = getCustomerByName(selected.customer);

    setInvoice(
      applyInvoiceCalculation({
        invoice_no: invoice.invoice_no || nextInvoiceNo(),
        customer: selected.customer,
        job_id: selected.id || null,
        quote_id: null,
        amount: String(selected.amount || ""),
        qty: invoice.qty || "1",
        unit_price: invoice.unit_price || String(selected.amount || ""),
        discount: invoice.discount || "0",
        tax_rate: invoice.tax_rate === "" ? "0" : invoice.tax_rate,
        subtotal: invoice.subtotal || String(selected.amount || 0),
        tax_amount: invoice.tax_amount || "0",
        total_amount: invoice.total_amount || String(selected.amount || 0),
        invoice_date: invoice.invoice_date || today,
        due_date: invoice.due_date || today,
        status: invoice.status || "Draft",
        notes: invoice.notes || "Thank you for choosing Aashan & Co LLC.",
        customer_phone: c?.phone || "",
        customer_email: c?.email || "",
        customer_address: c?.address || "",
      }),
    );
    setInvoiceLines([
      {
        description: selected.service || "",
        qty: invoice.qty || "1",
        unit_price: invoice.unit_price || String(selected.amount || ""),
        discount: invoice.discount || "0",
        tax_rate:
          invoice.tax_rate === undefined ? "" : String(invoice.tax_rate || ""),
      },
    ]);
  }

  function fillInvoiceCustomer(customerName: string) {
    const c = getCustomerByName(customerName);
    setInvoice(
      applyInvoiceCalculation({
        ...invoice,
        customer: customerName,
        tax_rate: invoice.tax_rate === "" ? "0" : invoice.tax_rate,
        customer_phone: c?.phone || "",
        customer_email: c?.email || "",
        customer_address: c?.address || "",
      }),
    );
  }

  async function saveInvoice() {
    const lines = cleanLines(invoiceLines);
    if (!invoice.customer.trim()) return alert("Select customer");
    if (lines.length === 0) return alert("Enter at least one invoice line");

    const c = getCustomerByName(invoice.customer);
    const totals = documentTotals(lines);
    const first = lines[0] || emptyTransactionLine;
    const payload = {
      invoice_no: invoice.invoice_no || nextInvoiceNo(),
      customer: invoice.customer,
      job_id: invoice.job_id || null,
      quote_id: invoice.quote_id || null,
      qty: Number(first.qty || 0),
      unit_price: Number(first.unit_price || 0),
      discount: lines.reduce(
        (sum, line) => sum + Number(line.discount || 0),
        0,
      ),
      tax_rate: first.tax_rate === "" ? 0 : Number(first.tax_rate || 0),
      subtotal: Number(totals.subtotal.toFixed(2)),
      tax_amount: Number(totals.tax.toFixed(2)),
      total_amount: Number(totals.total.toFixed(2)),
      amount: Number(totals.total.toFixed(2)),
      invoice_date: invoice.invoice_date || null,
      due_date: invoice.due_date || null,
      status: invoice.status,
      notes: `${invoice.notes || ""}

LINES_JSON:${JSON.stringify(lines)}`.trim(),
      customer_phone: invoice.customer_phone || c?.phone || "",
      customer_email: invoice.customer_email || c?.email || "",
      customer_address: invoice.customer_address || c?.address || "",
    };

    const res = editingInvoiceId
      ? await supabase
          .from("invoices")
          .update(payload)
          .eq("id", editingInvoiceId)
          .select("id")
          .single()
      : await supabase.from("invoices").insert([payload]).select("id").single();

    if (res.error) return alert(res.error.message);

    await postInvoiceAccounting(payload, res.data?.id || editingInvoiceId);

    if (payload.job_id) {
      await supabase
        .from("jobs")
        .update({ status: payload.status === "Paid" ? "Paid" : "Invoiced" })
        .eq("id", payload.job_id);
    }

    if (payload.quote_id) {
      await supabase
        .from("quotes")
        .update({ status: "Converted" })
        .eq("id", payload.quote_id);
    }

    resetInvoiceForm();
    await loadData();
  }

  function editInvoice(inv: Invoice) {
    const c = getCustomerByName(inv.customer);
    const savedLines = String(inv.notes || "").includes("LINES_JSON:")
      ? (() => {
          try {
            return JSON.parse(
              String(inv.notes || "").split("LINES_JSON:")[1],
            ) as TransactionLine[];
          } catch {
            return null;
          }
        })()
      : null;
    setInvoice({
      ...inv,
      amount: String(inv.amount || ""),
      qty: String(inv.qty || "1"),
      unit_price: String(inv.unit_price || inv.amount || ""),
      discount: String(inv.discount || "0"),
      tax_rate:
        inv.tax_rate === null || inv.tax_rate === undefined
          ? ""
          : String(inv.tax_rate),
      subtotal: String(inv.subtotal || 0),
      tax_amount: String(inv.tax_amount || 0),
      total_amount: String(inv.total_amount || inv.amount || 0),
      notes: String(inv.notes || "")
        .split("LINES_JSON:")[0]
        .trim(),
      customer_phone: inv.customer_phone || c?.phone || "",
      customer_email: inv.customer_email || c?.email || "",
      customer_address: inv.customer_address || c?.address || "",
    });
    setInvoiceLines(
      savedLines && savedLines.length
        ? savedLines
        : [
            {
              description: inv.notes || "",
              qty: String(inv.qty || "1"),
              unit_price: String(inv.unit_price || inv.amount || ""),
              discount: String(inv.discount || "0"),
              tax_rate:
                inv.tax_rate === null || inv.tax_rate === undefined
                  ? ""
                  : String(inv.tax_rate),
            },
          ],
    );
    setEditingInvoiceId(inv.id || null);
    setActiveTab("invoices");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteInvoice(id?: number) {
    const existing = invoices.find((d: any) => Number(d.id) === Number(id));
    if (existing && !canDeleteDocument(existing.status || "Posted"))
      return alert(
        "This invoice is locked and cannot be deleted after posting/payment.",
      );
    if (!id || !confirm("Delete this document?")) return;
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function quickInvoiceStatus(id: number | undefined, status: string) {
    if (!id) return;
    const { error } = await supabase
      .from("invoices")
      .update({ status })
      .eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  function fillPaymentFromInvoice(invoiceIdValue: string) {
    if (!invoiceIdValue) return setPayment(emptyPayment);
    const selected = invoices.find((i) => String(i.id) === invoiceIdValue);
    if (!selected) return;
    const today = new Date().toISOString().slice(0, 10);
    setPayment({
      invoice_id: selected.id || null,
      invoice_no: selected.invoice_no,
      customer: selected.customer,
      payment_date: payment.payment_date || today,
      amount: String(invoiceBalance(selected) || ""),
      payment_method: payment.payment_method || "Cash",
      notes: payment.notes || "",
    });
  }

  async function savePayment() {
    if (!payment.invoice_id) return alert("Select invoice");
    if (!payment.amount) return alert("Enter payment amount");

    const oldPayment = editingPaymentId
      ? payments.find((p) => Number(p.id) === Number(editingPaymentId))
      : null;

    const payload = {
      invoice_id: payment.invoice_id,
      invoice_no: payment.invoice_no,
      customer: payment.customer,
      payment_date: payment.payment_date || null,
      amount: Number(payment.amount || 0),
      payment_method: payment.payment_method,
      bank_name: payment.bank_name || "",
      notes: payment.notes || "",
      status: "Posted",
    };

    const res = editingPaymentId
      ? await supabase
          .from("payments")
          .update(payload)
          .eq("id", editingPaymentId)
          .select("id")
          .single()
      : await supabase.from("payments").insert([payload]).select("id").single();

    if (res.error) return alert(res.error.message);

    await postCustomerPaymentAccounting(
      payload,
      res.data?.id || editingPaymentId,
    );

    await applyBankDelta(
      oldPayment?.bank_name || "",
      Number(oldPayment?.amount || 0),
      payload.bank_name,
      Number(payload.amount || 0),
    );

    const relatedInvoice = invoices.find(
      (i) => Number(i.id) === Number(payload.invoice_id),
    );
    setPayment(emptyPayment);
    setEditingPaymentId(null);
    await loadData();

    if (relatedInvoice) {
      setTimeout(async () => {
        await refreshInvoicePaymentStatus(relatedInvoice);
        await loadData();
      }, 300);
    }
  }

  function editPayment(p: Payment) {
    setPayment({
      ...p,
      amount: String(p.amount || ""),
      bank_name: p.bank_name || "",
    });
    setEditingPaymentId(p.id || null);
    setActiveTab("payments");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deletePayment(id?: number) {
    if (!id || !confirm("Delete this payment?")) return;
    const target = payments.find((p) => p.id === id);
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadData();

    if (target?.invoice_id) {
      const relatedInvoice = invoices.find(
        (i) => Number(i.id) === Number(target.invoice_id),
      );
      if (relatedInvoice) {
        setTimeout(async () => {
          await refreshInvoicePaymentStatus(relatedInvoice);
          await loadData();
        }, 300);
      }
    }
  }

  function nextVendorNo() {
    return `V-${String(vendors.length + 1).padStart(4, "0")}`;
  }

  function nextExpenseNo() {
    return `EXP-${String(expenses.length + 1).padStart(4, "0")}`;
  }

  async function saveVendor() {
    if (!vendor.vendor_name.trim()) return alert("Enter vendor name");
    const payload = {
      vendor_no: vendor.vendor_no || nextVendorNo(),
      vendor_name: vendor.vendor_name,
      contact_person: vendor.contact_person,
      phone: vendor.phone,
      email: vendor.email,
      address: vendor.address,
      tax_id: vendor.tax_id,
      notes: vendor.notes,
      status: vendor.status,
    };

    const res = editingVendorId
      ? await supabase.from("vendors").update(payload).eq("id", editingVendorId)
      : await supabase.from("vendors").insert([payload]);

    if (res.error) return alert(res.error.message);
    setVendor(emptyVendor);
    setEditingVendorId(null);
    await loadData();
  }

  function editVendor(v: Vendor) {
    setVendor(v);
    setEditingVendorId(v.id || null);
    setActiveTab("vendors");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteVendor(id?: number) {
    if (!id || !confirm("Delete this vendor?")) return;
    const { error } = await supabase.from("vendors").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function saveExpense() {
    if (!expense.description.trim()) return alert("Enter expense description");
    const payload = {
      expense_no: expense.expense_no || nextExpenseNo(),
      expense_date: expense.expense_date || null,
      vendor: expense.vendor,
      category: expense.category,
      description: expense.description,
      amount: Number(expense.amount || 0),
      payment_method: expense.payment_method,
      status: expense.status,
    };

    const res = editingExpenseId
      ? await supabase
          .from("expenses")
          .update(payload)
          .eq("id", editingExpenseId)
      : await supabase.from("expenses").insert([payload]);

    if (res.error) return alert(res.error.message);
    setExpense(emptyExpense);
    setEditingExpenseId(null);
    await loadData();
  }

  function editExpense(e: Expense) {
    setExpense({ ...e, amount: String(e.amount || "") });
    setEditingExpenseId(e.id || null);
    setActiveTab(activeTab === "payments" ? "payments" : "expenses");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteExpense(id?: number) {
    if (!id || !confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  function emailTemplateName(type: string) {
    const clean = String(type || "").toLowerCase();
    if (clean.includes("invoice")) return "Invoice Email";
    if (clean.includes("quote")) return "Quote Email";
    if (clean.includes("receipt") || clean.includes("payment"))
      return "Payment Receipt Email";
    if (clean.includes("overdue")) return "Overdue Reminder Email";
    return type;
  }

  function getEmailTemplate(type: string) {
    const name = emailTemplateName(type);
    return (
      templates.find((t) => t.template_name === name) ||
      DEFAULT_EMAIL_TEMPLATES[name]
    );
  }

  function replaceTemplateVariables(text: string, data: Record<string, any>) {
    let output = String(text || "");

    const merged = {
      company_name: company.company_name || "Aashan & Co LLC",
      company_phone: company.phone || "(832) 210-4248",
      company_email: company.email || "support@aashan.co",
      company_website: company.website || "www.aashan.co",
      company_address: company.address || "Dallas, Texas",
      facebook_review:
        "https://www.facebook.com/profile.php?id=61584788072935&sk=reviews",
      ...data,
      customer_name: data.customer_name || data.customer || "Customer",
    };

    Object.keys(merged).forEach((key) => {
      output = output
        .replaceAll(`{{${key}}}`, String(merged[key] ?? ""))
        .replaceAll(`{{ ${key} }}`, String(merged[key] ?? ""));
    });

    return output;
  }

  async function emailDocument(
    type: string,
    to: string,
    fallbackSubject: string,
    fallbackBody: string,
    data: Record<string, any> = {},
  ) {
    if (!to) return alert("Customer email is missing.");

    const masterTemplate = getEmailTemplate(type);
    const subject = replaceTemplateVariables(
      masterTemplate?.subject || fallbackSubject,
      data,
    );
    const body = replaceTemplateVariables(
      masterTemplate?.body || fallbackBody,
      data,
    );

    const htmlBody = String(body || "")
      .replaceAll("%0D%0A", "<br />")
      .replaceAll("\n", "<br />");

    const documentNo =
      data.document_no ||
      data.invoice_no ||
      data.quote_no ||
      data.receipt_no ||
      "";
    const viewUrl = `${window.location.origin}/view?type=${encodeURIComponent(type.toLowerCase())}&no=${encodeURIComponent(String(documentNo || ""))}`;
    const customerName = data.customer || data.customer_name || "";
    const safeCustomer = String(customerName || "Customer")
      .replace(/[^a-z0-9-_ ]/gi, "")
      .trim();
    const attachmentName = `${type} - ${documentNo} - ${safeCustomer}.pdf`;

    setEmailDraft({
      open: true,
      type,
      to,
      subject,
      body: String(body || "").replaceAll("%0D%0A", "\n"),
      html: htmlBody,
      data: {
        ...data,
        customer_name:
          data.customer_name || data.customer || customerName || "Customer",
        viewUrl,
        view_url: viewUrl,
      },
      attachmentName,
    });
  }

  async function sendEmailDraft() {
    if (!emailDraft.to) return alert("Recipient email is missing.");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) return alert("Please login again before sending email.");

    setEmailSending(true);

    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: emailDraft.to,
        subject: emailDraft.subject,
        html:
          emailDraft.html ||
          String(emailDraft.body || "").replaceAll("\n", "<br />"),
        text: emailDraft.body,
        documentType: emailDraft.type,
        templateName: emailTemplateName(emailDraft.type),
        customer:
          emailDraft.data.customer || emailDraft.data.customer_name || "",
        customerName:
          emailDraft.data.customer || emailDraft.data.customer_name || "",
        documentNo:
          emailDraft.data.document_no ||
          emailDraft.data.invoice_no ||
          emailDraft.data.quote_no ||
          emailDraft.data.receipt_no ||
          "",
        invoiceNo: emailDraft.data.invoice_no || "",
        quoteNo: emailDraft.data.quote_no || "",
        receiptNo: emailDraft.data.receipt_no || "",
        amount: emailDraft.data.amount || "",
        balance: emailDraft.data.balance || "",
        dueDate: emailDraft.data.due_date || "",
        viewUrl:
          emailDraft.data.view_url ||
          emailDraft.data.viewUrl ||
          `${window.location.origin}/view?type=${encodeURIComponent(emailDraft.type.toLowerCase())}&no=${encodeURIComponent(String(emailDraft.data.document_no || emailDraft.data.invoice_no || emailDraft.data.quote_no || emailDraft.data.receipt_no || ""))}`,
      }),
    });

    const result = await response.json().catch(() => ({}));
    setEmailSending(false);

    if (!response.ok) {
      return alert(result.error || "Email failed to send.");
    }

    alert(
      result.message || `${emailDraft.type} email sent to ${emailDraft.to}`,
    );
    setEmailDraft(emptyEmailDraft);
  }

  function openInvoicePrint(inv: Invoice) {
    setPrintQuote(null);
    setPrintReceipt(null);
    setPrintInvoice({ ...inv, notes: visibleNotes(inv.notes) });
  }

  function openQuotePrint(qt: Quote) {
    setPrintInvoice(null);
    setPrintReceipt(null);
    setPrintQuote({ ...qt, notes: visibleNotes(qt.notes) });
  }

  function openReceiptPrint(r: Receipt) {
    setPrintInvoice(null);
    setPrintQuote(null);
    setPrintReceipt(r);
  }

  function closePrintPreview() {
    setPrintInvoice(null);
    setPrintQuote(null);
    setPrintReceipt(null);
  }

  function getPrintTemplate(documentType: string) {
    return (
      printTemplates.find((pt) => pt.document_type === documentType) || {
        ...emptyPrintTemplate,
        document_type: documentType,
        header_title: company.company_name || "Aashan & Co LLC",
        header_subtitle: company.website || "Quality Work Through Dedication",
        logo_url: company.logo_url || LOGO_SRC,
        company_block: `Phone: ${company.phone || "(832) 210-4248"}\nEmail: ${company.email || "support@aashan.co"}\nAddress: ${company.address || "Dallas, Texas"}`,
        footer_text: `Thank you for choosing ${company.company_name || "Aashan & Co LLC"}.`,
        terms_text: company.payment_terms || "Payment due within agreed terms.",
      }
    );
  }

  function printLogo(documentType: string) {
    const pt = getPrintTemplate(documentType);
    return pt.logo_data_url || pt.logo_url || company.logo_url || LOGO_SRC;
  }

  function renderCompanyBlock(documentType: string) {
    const pt = getPrintTemplate(documentType);
    return (pt.company_block || "")
      .split("\n")
      .map((line, idx) => <p key={idx}>{line}</p>);
  }

  async function savePrintTemplate() {
    if (!printTemplate.document_type.trim())
      return alert("Select document type");

    const payload = {
      document_type: printTemplate.document_type,
      header_title: printTemplate.header_title,
      header_subtitle: printTemplate.header_subtitle,
      logo_url: printTemplate.logo_url,
      logo_data_url: printTemplate.logo_data_url,
      company_block: printTemplate.company_block,
      footer_text: printTemplate.footer_text,
      terms_text: printTemplate.terms_text,
      notes_text: printTemplate.notes_text,
    };

    const res = editingPrintTemplateId
      ? await supabase
          .from("print_templates")
          .update(payload)
          .eq("id", editingPrintTemplateId)
      : await supabase.from("print_templates").insert([payload]);

    if (res.error) return alert(res.error.message);
    setPrintTemplate(emptyPrintTemplate);
    setEditingPrintTemplateId(null);
    await loadData();
  }

  function editPrintTemplate(pt: PrintTemplate) {
    setPrintTemplate(pt);
    setEditingPrintTemplateId(pt.id || null);
  }

  async function deletePrintTemplate(id?: number) {
    if (!id || !confirm("Delete this print template?")) return;
    const { error } = await supabase
      .from("print_templates")
      .delete()
      .eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function pasteLogoFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = () =>
            setPrintTemplate({
              ...printTemplate,
              logo_data_url: String(reader.result || ""),
            });
          reader.readAsDataURL(blob);
          return;
        }
      }
      alert(
        "No image found in clipboard. You can paste a base64 data URL manually.",
      );
    } catch (err) {
      alert(
        "Browser blocked clipboard image access. Paste the PNG/base64 data URL into the Logo Data field.",
      );
    }
  }

  function loadPrintDefaults(type: string) {
    setPrintTemplate({
      ...emptyPrintTemplate,
      document_type: type,
      header_title: company.company_name || "Aashan & Co LLC",
      header_subtitle: company.website || "Quality Work Through Dedication",
      logo_url: company.logo_url || "/aashan-logo.png",
      company_block: `Phone: ${company.phone || "(832) 210-4248"}\nEmail: ${company.email || "support@aashan.co"}\nAddress: ${company.address || "Dallas, Texas"}`,
      footer_text: `Thank you for choosing ${company.company_name || "Aashan & Co LLC"}.`,
      terms_text: company.payment_terms || "Payment due within agreed terms.",
      notes_text: "",
    });
  }

  async function saveBank() {
    if (!bank.bank_name.trim()) return alert("Enter bank name");
    const payload = {
      bank_name: bank.bank_name,
      account_name: bank.account_name,
      account_number: bank.account_number,
      routing_number: bank.routing_number,
      opening_balance: Number(bank.opening_balance || 0),
      current_balance: Number(bank.current_balance || 0),
      is_active: bank.is_active,
    };
    const res = editingBankId
      ? await supabase.from("banks").update(payload).eq("id", editingBankId)
      : await supabase.from("banks").insert([payload]);
    if (res.error) return alert(res.error.message);
    setBank(emptyBank);
    setEditingBankId(null);
    await loadData();
  }

  function editBank(b: Bank) {
    setBank({
      ...b,
      opening_balance: String(b.opening_balance || 0),
      current_balance: String(b.current_balance || 0),
    });
    setEditingBankId(b.id || null);
    setActiveTab("banks");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteBank(id?: number) {
    if (!id || !confirm("Delete this bank?")) return;
    const { error } = await supabase.from("banks").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function refreshInvoiceStatusAfterReceipt(
    invoiceNo: string,
    receiptRowsOverride?: Receipt[],
  ) {
    const inv = invoices.find(
      (i) => String(i.invoice_no || "") === String(invoiceNo || ""),
    );
    if (!inv || !inv.id) return;

    const rowsForCalculation = receiptRowsOverride || receipts;
    const newStatus = invoiceStatusFromBalance(
      inv,
      payments,
      rowsForCalculation,
    );
    await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", inv.id);
  }

  async function saveReceipt() {
    if (!receipt.customer.trim()) return alert("Enter customer");
    if (!receipt.amount) return alert("Enter receipt amount");

    const oldReceipt = editingReceiptId
      ? receipts.find((r) => Number(r.id) === Number(editingReceiptId))
      : null;

    const payload = {
      receipt_no: receipt.receipt_no || nextReceiptNo(),
      customer: receipt.customer,
      invoice_no: receipt.invoice_no,
      receipt_date: receipt.receipt_date || null,
      amount: Number(receipt.amount || 0),
      payment_method: receipt.payment_method,
      bank_name: receipt.bank_name || "",
      notes: receipt.notes,
      status: "Posted",
    };

    const res = editingReceiptId
      ? await supabase
          .from("receipts")
          .update(payload)
          .eq("id", editingReceiptId)
          .select("id")
          .single()
      : await supabase.from("receipts").insert([payload]).select("id").single();

    if (res.error) return alert(res.error.message);

    await postReceiptAccounting(payload, res.data?.id || editingReceiptId);

    await applyBankDelta(
      oldReceipt?.bank_name || "",
      Number(oldReceipt?.amount || 0),
      payload.bank_name,
      Number(payload.amount || 0),
    );

    const savedReceiptRow = {
      ...payload,
      id: res.data?.id || editingReceiptId,
    } as any;
    const receiptRowsForCalculation = [
      ...receipts.filter((r) => Number(r.id) !== Number(savedReceiptRow.id)),
      savedReceiptRow,
    ];

    await refreshInvoiceStatusAfterReceipt(
      payload.invoice_no,
      receiptRowsForCalculation,
    );

    if (
      oldReceipt?.invoice_no &&
      oldReceipt.invoice_no !== payload.invoice_no
    ) {
      await refreshInvoiceStatusAfterReceipt(
        oldReceipt.invoice_no,
        receiptRowsForCalculation,
      );
    }

    setReceipt(emptyReceipt);
    setEditingReceiptId(null);
    await loadData();
  }

  function editReceipt(r: Receipt) {
    setReceipt({ ...r, amount: String(r.amount || "") });
    setEditingReceiptId(r.id || null);
    setActiveTab("receipts");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteReceipt(id?: number) {
    const existing = receipts.find((d: any) => Number(d.id) === Number(id));
    if (existing && !canDeleteDocument((existing as any).status || "Posted"))
      return alert(
        "This receipt is locked and cannot be deleted after posting.",
      );
    if (!id || !confirm("Delete this document?")) return;
    const { error } = await supabase.from("receipts").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  function fillReceiptFromInvoice(invoiceIdValue: string) {
    const selected = invoices.find((i) => String(i.id) === invoiceIdValue);
    if (!selected) return;
    setReceipt({
      receipt_no: receipt.receipt_no || nextReceiptNo(),
      customer: selected.customer,
      invoice_no: selected.invoice_no,
      receipt_date:
        receipt.receipt_date || new Date().toISOString().slice(0, 10),
      amount: String(invoiceBalance(selected) || selected.amount || ""),
      payment_method: receipt.payment_method || "Cash",
      bank_name: receipt.bank_name || "",
      notes: receipt.notes || "",
    });
  }

  async function savePurchaseInvoice() {
    if (!purchaseInvoice.vendor.trim()) return alert("Select vendor");
    const payload = {
      purchase_invoice_no:
        purchaseInvoice.purchase_invoice_no || nextPurchaseInvoiceNo(),
      vendor: purchaseInvoice.vendor,
      invoice_date: purchaseInvoice.invoice_date || null,
      due_date: purchaseInvoice.due_date || null,
      category: purchaseInvoice.category,
      description: purchaseInvoice.description,
      amount: Number(purchaseInvoice.amount || 0),
      status: purchaseInvoice.status,
      bank_name: purchaseInvoice.bank_name,
      notes: purchaseInvoice.notes,
    };
    const res = editingPurchaseInvoiceId
      ? await supabase
          .from("purchase_invoices")
          .update(payload)
          .eq("id", editingPurchaseInvoiceId)
      : await supabase.from("purchase_invoices").insert([payload]);
    if (res.error) return alert(res.error.message);
    setPurchaseInvoice(emptyPurchaseInvoice);
    setEditingPurchaseInvoiceId(null);
    await loadData();
  }

  function editPurchaseInvoice(pi: PurchaseInvoice) {
    setPurchaseInvoice({ ...pi, amount: String(pi.amount || "") });
    setEditingPurchaseInvoiceId(pi.id || null);
    setActiveTab("purchases");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deletePurchaseInvoice(id?: number) {
    const existing = purchaseInvoices.find(
      (d: any) => Number(d.id) === Number(id),
    );
    if (existing && !canDeleteDocument(existing.status || "Posted"))
      return alert(
        "This purchase invoice is locked and cannot be deleted after posting/payment.",
      );
    if (!id || !confirm("Delete this document?")) return;
    const { error } = await supabase
      .from("purchase_invoices")
      .delete()
      .eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function saveJournalEntry() {
    if (!journalEntry.debit_account || !journalEntry.credit_account)
      return alert("Select debit and credit accounts");
    const payload = {
      journal_no: journalEntry.journal_no || nextJournalNo(),
      journal_date: journalEntry.journal_date || null,
      description: journalEntry.description,
      debit_account: journalEntry.debit_account,
      credit_account: journalEntry.credit_account,
      amount: Number(journalEntry.amount || 0),
      notes: journalEntry.notes,
    };
    const res = editingJournalEntryId
      ? await supabase
          .from("journal_entries")
          .update(payload)
          .eq("id", editingJournalEntryId)
      : await supabase.from("journal_entries").insert([payload]);
    if (res.error) return alert(res.error.message);
    setJournalEntry(emptyJournalEntry);
    setEditingJournalEntryId(null);
    await loadData();
  }

  function editJournalEntry(je: JournalEntry) {
    setJournalEntry({ ...je, amount: String(je.amount || "") });
    setEditingJournalEntryId(je.id || null);
    setActiveTab("journals");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteJournalEntry(id?: number) {
    if (!id || !confirm("Delete this journal entry?")) return;
    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }

  async function saveCompany() {
    const payload = {
      company_name: company.company_name,
      phone: company.phone,
      email: company.email,
      website: company.website,
      address: company.address,
      logo_url: company.logo_url,
      tax_rate: Number(company.tax_rate || 0),
      payment_terms: company.payment_terms,
      payment_instructions: company.payment_instructions,
    };
    const res = company.id
      ? await supabase
          .from("company_settings")
          .update(payload)
          .eq("id", company.id)
      : await supabase.from("company_settings").insert([payload]);
    if (res.error) return alert(res.error.message);
    alert("Company settings saved");
    await loadData();
  }
  async function saveSequence() {
    if (!sequence.document_type.trim()) return alert("Enter document type");
    const payload = {
      document_type: sequence.document_type,
      prefix: sequence.prefix,
      next_number: Number(sequence.next_number || 1),
      padding: Number(sequence.padding || 4),
    };
    const res = editingSequenceId
      ? await supabase
          .from("number_sequences")
          .update(payload)
          .eq("id", editingSequenceId)
      : await supabase.from("number_sequences").insert([payload]);
    if (res.error) return alert(res.error.message);
    setSequence(emptySequence);
    setEditingSequenceId(null);
    await loadData();
  }
  function editSequence(s: NumberSequence) {
    setSequence({
      ...s,
      next_number: String(s.next_number || ""),
      padding: String(s.padding || 4),
    });
    setEditingSequenceId(s.id || null);
  }
  async function deleteSequence(id?: number) {
    if (!id || !confirm("Delete this number sequence?")) return;
    const { error } = await supabase
      .from("number_sequences")
      .delete()
      .eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }
  async function saveAccount() {
    if (!account.account_code.trim() || !account.account_name.trim())
      return alert("Enter account code and name");
    const payload = {
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      normal_balance: account.normal_balance,
      is_active: account.is_active,
    };
    const res = editingAccountId
      ? await supabase
          .from("gl_accounts")
          .update(payload)
          .eq("id", editingAccountId)
      : await supabase.from("gl_accounts").insert([payload]);
    if (res.error) return alert(res.error.message);
    setAccount(emptyAccount);
    setEditingAccountId(null);
    await loadData();
  }
  function editAccount(a: Account) {
    setAccount(a);
    setEditingAccountId(a.id || null);
  }
  async function deleteAccount(id?: number) {
    if (!id || !confirm("Delete this account?")) return;
    const { error } = await supabase.from("gl_accounts").delete().eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }
  async function saveEmailSettings() {
    const payload = {
      from_name: emailSettings.from_name,
      from_email: emailSettings.from_email,
      reply_to_email: emailSettings.reply_to_email,
      bcc_email: emailSettings.bcc_email,
    };
    const res = emailSettings.id
      ? await supabase
          .from("email_settings")
          .update(payload)
          .eq("id", emailSettings.id)
      : await supabase.from("email_settings").insert([payload]);
    if (res.error) return alert(res.error.message);
    alert("Email settings saved");
    await loadData();
  }
  async function saveTemplate() {
    if (!template.template_name.trim()) return alert("Enter template name");
    const payload = {
      template_name: template.template_name,
      subject: template.subject,
      body: template.body,
    };
    const res = editingTemplateId
      ? await supabase
          .from("email_templates")
          .update(payload)
          .eq("id", editingTemplateId)
      : await supabase.from("email_templates").insert([payload]);
    if (res.error) return alert(res.error.message);
    setTemplate(emptyTemplate);
    setEditingTemplateId(null);
    await loadData();
  }
  function editTemplate(t: EmailTemplate) {
    setTemplate(t);
    setEditingTemplateId(t.id || null);
  }
  async function deleteTemplate(id?: number) {
    if (!id || !confirm("Delete this template?")) return;
    const { error } = await supabase
      .from("email_templates")
      .delete()
      .eq("id", id);
    if (error) return alert(error.message);
    await loadData();
  }
  function loadDefaultMasters() {
    setCompany(emptyCompany);
    setSequence({
      document_type: "Invoice",
      prefix: "INV-",
      next_number: "1001",
      padding: "4",
    });
    setAccount({
      account_code: "4000",
      account_name: "Service Revenue",
      account_type: "Revenue",
      normal_balance: "Credit",
      is_active: true,
    });
    setEmailSettings(emptyEmailSettings);
    setTemplate({
      template_name: "Invoice Email",
      subject: "Invoice {{invoice_no}} from Aashan & Co LLC",
      body: "Hi {{customer}},\n\nPlease find your invoice {{invoice_no}} for ${{amount}}.\n\nDue Date: {{due_date}}\nBalance Due: ${{balance}}\n\nThank you for choosing Aashan & Co LLC.\n\nBest Regards,\nAashan & Co LLC",
    });
  }

  async function updateUserRole(userId: string | undefined, role: string) {
    if (!userId) return;
    const { error } = await supabase
      .from("user_profiles")
      .update({ role })
      .eq("id", userId);
    if (error) return alert(error.message);
    await loadData();
  }

  function parseCsv(text: string) {
    const rows: string[][] = [];
    let current = "";
    let row: string[] = [];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(current.trim());
        current = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (current || row.length) {
          row.push(current.trim());
          rows.push(row);
          row = [];
          current = "";
        }
        if (char === "\r" && next === "\n") i++;
      } else {
        current += char;
      }
    }

    if (current || row.length) {
      row.push(current.trim());
      rows.push(row);
    }

    return rows.filter((r) => r.some((c) => c));
  }

  function mapRows(rows: string[][]) {
    const headers = rows[0].map((h) => h.toLowerCase().trim());
    return rows.slice(1).map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx] || "";
      });
      return obj;
    });
  }

  function normalizeImportRows(records: any[]) {
    return records.map((r) => {
      const normalized: Record<string, string> = {};
      Object.keys(r).forEach((key) => {
        normalized[String(key).toLowerCase().trim()] = String(
          r[key] ?? "",
        ).trim();
      });
      return normalized;
    });
  }

  function validateImport(
    importType:
      | "customers"
      | "vendors"
      | "expenses"
      | "accounts"
      | "payments"
      | "receipts"
      | "invoices"
      | "purchase_invoices"
      | "journal_entries",
    records: any[],
  ) {
    const errors: string[] = [];

    records.forEach((r, idx) => {
      const row = idx + 2;

      if (
        importType === "customers" &&
        !(r.name || r.customer || r.customer_name)
      ) {
        errors.push(`Row ${row}: Customer name is required`);
      }

      if (importType === "vendors" && !(r.vendor_name || r.vendor || r.name)) {
        errors.push(`Row ${row}: Vendor name is required`);
      }

      if (importType === "expenses") {
        if (!(r.description || r.amount))
          errors.push(`Row ${row}: Description or amount is required`);
        if (r.amount && Number.isNaN(Number(r.amount)))
          errors.push(`Row ${row}: Amount must be numeric`);
      }

      if (importType === "accounts") {
        if (!r.account_code)
          errors.push(`Row ${row}: Account code is required`);
        if (!r.account_name)
          errors.push(`Row ${row}: Account name is required`);
      }
    });

    if (
      importType === "payments" &&
      records.some((r) => r.amount && Number.isNaN(Number(r.amount)))
    )
      errors.push("Payment import: Amount must be numeric");
    if (
      importType === "receipts" &&
      records.some((r) => r.amount && Number.isNaN(Number(r.amount)))
    )
      errors.push("Receipt import: Amount must be numeric");
    if (
      importType === "invoices" &&
      records.some((r) => r.amount && Number.isNaN(Number(r.amount)))
    )
      errors.push("Customer invoice import: Amount must be numeric");
    if (
      importType === "purchase_invoices" &&
      records.some((r) => r.amount && Number.isNaN(Number(r.amount)))
    )
      errors.push("Purchase invoice import: Amount must be numeric");
    if (
      importType === "journal_entries" &&
      records.some((r) => r.amount && Number.isNaN(Number(r.amount)))
    )
      errors.push("Journal import: Amount must be numeric");

    return errors;
  }

  async function previewImportFile(
    event: any,
    importType:
      | "customers"
      | "vendors"
      | "expenses"
      | "accounts"
      | "payments"
      | "receipts"
      | "invoices"
      | "purchase_invoices"
      | "journal_entries",
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];

    const records = normalizeImportRows(rawRows);
    const errors = validateImport(importType, records);

    setPendingImportType(importType);
    setImportPreview(records.slice(0, 20));
    setImportErrors(errors);

    event.target.value = "";
  }

  async function confirmImport() {
    if (!pendingImportType || importPreview.length === 0)
      return alert("No import file selected");
    if (importErrors.length > 0)
      return alert("Please fix errors before importing");

    const records = importPreview;

    if (pendingImportType === "customers") {
      const payload = records
        .map((r) => ({
          name: r.name || r.customer || r.customer_name || "",
          phone: r.phone || "",
          email: r.email || "",
          address: r.address || "",
        }))
        .filter((r) => r.name);

      const { error } = await supabase.from("customers").insert(payload);
      if (error) return alert(error.message);
    }

    if (pendingImportType === "vendors") {
      const payload = records
        .map((r, idx) => ({
          vendor_no:
            r.vendor_no ||
            r.vendor_number ||
            `V-${String(vendors.length + idx + 1).padStart(4, "0")}`,
          vendor_name: r.vendor_name || r.vendor || r.name || "",
          contact_person: r.contact_person || r.contact || "",
          phone: r.phone || "",
          email: r.email || "",
          address: r.address || "",
          tax_id: r.tax_id || "",
          notes: r.notes || "",
          status: r.status || "Active",
        }))
        .filter((r) => r.vendor_name);

      const { error } = await supabase.from("vendors").insert(payload);
      if (error) return alert(error.message);
    }

    if (pendingImportType === "expenses") {
      const payload = records
        .map((r, idx) => ({
          expense_no:
            r.expense_no ||
            r.expense_number ||
            `EXP-${String(expenses.length + idx + 1).padStart(4, "0")}`,
          expense_date: r.expense_date || r.date || null,
          vendor: r.vendor || "",
          category: r.category || "Other",
          description: r.description || "",
          amount: Number(r.amount || 0),
          payment_method: r.payment_method || r.method || "Cash",
          status: r.status || "Draft",
        }))
        .filter((r) => r.description || r.amount);

      const { error } = await supabase.from("expenses").insert(payload);
      if (error) return alert(error.message);
    }

    if (pendingImportType === "accounts") {
      const payload = records
        .map((r) => ({
          account_code: r.account_code || "",
          account_name: r.account_name || "",
          account_type: r.account_type || "Expense",
          normal_balance: r.normal_balance || "Both",
          is_active: String(r.is_active || "true").toLowerCase() !== "false",
        }))
        .filter((r) => r.account_code && r.account_name);

      const { error } = await supabase.from("gl_accounts").insert(payload);
      if (error) return alert(error.message);
    }

    if (pendingImportType === "payments") {
      const payload = records.map((r) => ({
        invoice_id: r.invoice_id || null,
        invoice_no: r.invoice_no || "",
        customer: r.customer || "",
        payment_date: r.payment_date || r.date || null,
        amount: Number(r.amount || 0),
        payment_method: r.payment_method || "Cash",
        notes: r.notes || "",
      }));
      const { error } = await supabase.from("payments").insert(payload);
      if (error) return alert(error.message);
    }

    if (pendingImportType === "receipts") {
      const payload = records.map((r, idx) => ({
        receipt_no:
          r.receipt_no ||
          `RCPT-${String(receipts.length + idx + 1).padStart(4, "0")}`,
        customer: r.customer || "",
        invoice_no: r.invoice_no || "",
        receipt_date: r.receipt_date || r.date || null,
        amount: Number(r.amount || 0),
        payment_method: r.payment_method || "Cash",
        bank_name: r.bank_name || "",
        notes: r.notes || "",
      }));
      const { error } = await supabase.from("receipts").insert(payload);
      if (error) return alert(error.message);
    }

    if (pendingImportType === "invoices") {
      const payload = records.map((r, idx) => ({
        invoice_no:
          r.invoice_no ||
          `INV-${String(invoices.length + idx + 1001).padStart(4, "0")}`,
        customer: r.customer || "",
        job_id: null,
        amount: Number(r.amount || 0),
        invoice_date: r.invoice_date || r.date || null,
        due_date: r.due_date || null,
        status: r.status || "Draft",
        notes: r.notes || "",
        customer_phone: r.customer_phone || "",
        customer_email: r.customer_email || "",
        customer_address: r.customer_address || "",
      }));
      const { error } = await supabase.from("invoices").insert(payload);
      if (error) return alert(error.message);
    }

    if (pendingImportType === "purchase_invoices") {
      const payload = records.map((r, idx) => ({
        purchase_invoice_no:
          r.purchase_invoice_no ||
          `PINV-${String(purchaseInvoices.length + idx + 1).padStart(4, "0")}`,
        vendor: r.vendor || "",
        invoice_date: r.invoice_date || r.date || null,
        due_date: r.due_date || null,
        category: r.category || "Other",
        description: r.description || "",
        amount: Number(r.amount || 0),
        status: r.status || "Open",
        bank_name: r.bank_name || "",
        notes: r.notes || "",
      }));
      const { error } = await supabase
        .from("purchase_invoices")
        .insert(payload);
      if (error) return alert(error.message);
    }

    if (pendingImportType === "journal_entries") {
      const payload = records.map((r, idx) => ({
        journal_no:
          r.journal_no ||
          `JE-${String(journalEntries.length + idx + 1).padStart(4, "0")}`,
        journal_date: r.journal_date || r.date || null,
        description: r.description || "",
        debit_account: r.debit_account || "",
        credit_account: r.credit_account || "",
        amount: Number(r.amount || 0),
        notes: r.notes || "",
      }));
      const { error } = await supabase.from("journal_entries").insert(payload);
      if (error) return alert(error.message);
    }

    setImportPreview([]);
    setImportErrors([]);
    setPendingImportType("");
    await loadData();
    alert("Excel import completed");
  }

  function downloadTemplate(
    type:
      | "customers"
      | "vendors"
      | "expenses"
      | "accounts"
      | "payments"
      | "receipts"
      | "invoices"
      | "purchase_invoices"
      | "journal_entries",
  ) {
    const templates: Record<string, any[]> = {
      customers: [
        {
          name: "John Smith",
          phone: "832-000-0000",
          email: "john@example.com",
          address: "Dallas, TX",
        },
      ],
      vendors: [
        {
          vendor_no: "V-0001",
          vendor_name: "Home Depot",
          contact_person: "",
          phone: "",
          email: "",
          address: "",
          tax_id: "",
          notes: "",
          status: "Active",
        },
      ],
      expenses: [
        {
          expense_no: "EXP-0001",
          expense_date: "2026-06-24",
          vendor: "Home Depot",
          category: "Materials",
          description: "TV Mount",
          amount: 45,
          payment_method: "Credit Card",
          status: "Paid",
        },
      ],
      accounts: [
        {
          account_code: "4000",
          account_name: "Service Revenue",
          account_type: "Revenue",
          normal_balance: "Both",
          is_active: true,
        },
      ],
      payments: [
        {
          invoice_no: "INV-1001",
          customer: "John Smith",
          payment_date: "2026-06-24",
          amount: 150,
          payment_method: "Cash",
          notes: "",
        },
      ],
      receipts: [
        {
          receipt_no: "RCPT-0001",
          customer: "John Smith",
          invoice_no: "INV-1001",
          receipt_date: "2026-06-24",
          amount: 150,
          payment_method: "Cash",
          bank_name: "Main Bank",
          notes: "",
        },
      ],
      invoices: [
        {
          invoice_no: "INV-1001",
          customer: "John Smith",
          invoice_date: "2026-06-24",
          due_date: "2026-06-24",
          amount: 150,
          status: "Draft",
          customer_phone: "",
          customer_email: "",
          customer_address: "",
        },
      ],
      purchase_invoices: [
        {
          purchase_invoice_no: "PINV-0001",
          vendor: "Home Depot",
          invoice_date: "2026-06-24",
          due_date: "2026-06-24",
          category: "Materials",
          description: "Materials",
          amount: 45,
          status: "Open",
          bank_name: "Main Bank",
        },
      ],
      journal_entries: [
        {
          journal_no: "JE-0001",
          journal_date: "2026-06-24",
          description: "Opening entry",
          debit_account: "Cash",
          credit_account: "Owner Equity",
          amount: 1000,
          notes: "",
        },
      ],
    };

    const ws = XLSX.utils.json_to_sheet(templates[type]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type);
    XLSX.writeFile(wb, `${type}-template.xlsx`);
  }

  async function importCsvFile(
    event: any,
    importType: "customers" | "vendors" | "expenses",
  ) {
    await previewImportFile(event, importType);
  }

  function exportCsv(filename: string, rows: any[][]) {
    const csv = rows
      .map((r) =>
        r.map((v) => `"${String(v || "").replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const q = search.toLowerCase();
  const filteredCustomers = customers.filter((c) =>
    [c.name, c.phone, c.email, c.address].join(" ").toLowerCase().includes(q),
  );
  const filteredJobs = jobs.filter((j) =>
    [j.customer, j.service, j.status, j.job_date, j.amount]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
  const filteredQuotes = quotes.filter((qt) =>
    [qt.quote_no, qt.customer, qt.service, qt.status, qt.quote_date, qt.amount]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
  const filteredWorkOrders = workOrders.filter((wo) =>
    [
      wo.work_order_no,
      wo.customer,
      wo.service,
      wo.technician,
      wo.scheduled_date,
      wo.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
  const filteredInvoices = invoices.filter((i) =>
    [i.invoice_no, i.customer, i.status, i.invoice_date, i.amount]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
  const filteredPayments = payments.filter((p) =>
    [
      p.invoice_no,
      p.customer,
      p.payment_date,
      p.payment_method,
      p.amount,
      p.notes,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
  const filteredVendors = vendors.filter((v) =>
    [v.vendor_no, v.vendor_name, v.contact_person, v.phone, v.email, v.status]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
  const filteredExpenses = expenses.filter((e) =>
    [
      e.expense_no,
      e.vendor,
      e.category,
      e.description,
      e.payment_method,
      e.status,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );

  const invoicedJobIds = invoices.map((i) => Number(i.job_id)).filter(Boolean);
  const availableInvoiceJobs = jobs.filter(
    (j) =>
      !invoicedJobIds.includes(Number(j.id)) ||
      Number(j.id) === Number(invoice.job_id),
  );
  const invoicedQuoteIds = invoices
    .map((i) => Number(i.quote_id))
    .filter(Boolean);
  const availableInvoiceQuotes = quotes.filter(
    (q) =>
      !invoicedQuoteIds.includes(Number(q.id)) ||
      Number(q.id) === Number(invoice.quote_id),
  );
  const payableInvoices = invoices.filter(
    (i) => invoiceBalance(i) > 0 || Number(i.id) === Number(payment.invoice_id),
  );
  const availableReceiptInvoices = invoices.filter(
    (i) =>
      i.status !== "Cancelled" &&
      (invoiceBalance(i) > 0 ||
        String(i.invoice_no || "") === String(receipt.invoice_no || "")),
  );

  const outstanding = invoices
    .filter((i) => i.status !== "Cancelled")
    .reduce((sum, i) => sum + invoiceBalance(i), 0);
  const paidRevenue = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );
  const openInvoices = invoices.filter(
    (i) => invoiceBalance(i) > 0 && i.status !== "Cancelled",
  ).length;
  const jobsInProgress = jobs.filter((j) => j.status === "In Progress").length;
  const openQuotes = quotes.filter((qt) =>
    ["Draft", "Sent"].includes(qt.status),
  ).length;
  const todayText = new Date().toISOString().slice(0, 10);
  const todaysWorkOrders = workOrders.filter(
    (wo) => wo.scheduled_date === todayText,
  ).length;
  const scheduledWorkOrders = workOrders.filter((wo) =>
    ["Scheduled", "In Progress"].includes(wo.status),
  ).length;
  const completedJobs = jobs.filter((j) =>
    ["Completed", "Invoiced", "Paid"].includes(j.status),
  ).length;
  const totalExpenses = expenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0,
  );
  const netProfit = paidRevenue - totalExpenses;
  const approvedExpenses = expenses
    .filter((e) => ["Approved", "Paid"].includes(e.status))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const draftExpenses = expenses
    .filter((e) => ["Draft", "Submitted"].includes(e.status))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Authentication is now handled by components/AuthGate.tsx.

  const accountsReceivable = outstanding;
  const accountsPayable = purchaseInvoices
    .filter((pi) => pi.status !== "Paid" && pi.status !== "Cancelled")
    .reduce((sum, pi) => sum + Number(pi.amount || 0), 0);

  const bankBalance = banks.reduce(
    (sum, b) => sum + Number(b.current_balance || 0),
    0,
  );

  const currentMonth = new Date().toISOString().slice(0, 7);
  const revenueMTD = payments
    .filter((p) => String(p.payment_date || "").slice(0, 7) === currentMonth)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const expensesMTD = expenses
    .filter((e) => String(e.expense_date || "").slice(0, 7) === currentMonth)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const profitMTD = revenueMTD - expensesMTD;
  const overdueInvoices = invoices.filter(
    (i) =>
      i.due_date &&
      i.status !== "Paid" &&
      i.status !== "Cancelled" &&
      i.due_date < todayText,
  ).length;
  const pendingInvoices = invoices.filter((i) =>
    ["Draft", "Sent", "Partially Paid"].includes(i.status),
  ).length;

  function monthKey(value: string) {
    return String(value || "").slice(0, 7);
  }

  const monthSet = new Set<string>();
  payments.forEach((p) => {
    if (p.payment_date) monthSet.add(monthKey(p.payment_date));
  });
  expenses.forEach((e) => {
    if (e.expense_date) monthSet.add(monthKey(e.expense_date));
  });

  const monthlySummary = Array.from(monthSet)
    .sort()
    .slice(-6)
    .map((month) => {
      const revenue = payments
        .filter((p) => monthKey(p.payment_date) === month)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const expense = expenses
        .filter((e) => monthKey(e.expense_date) === month)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      return { month, revenue, expense, profit: revenue - expense };
    });

  const chartMax = Math.max(
    1,
    ...monthlySummary.flatMap((m) => [
      m.revenue,
      m.expense,
      Math.abs(m.profit),
    ]),
  );

  const topCustomers = customers
    .map((c) => ({
      name: c.name,
      revenue: payments
        .filter((p) => p.customer === c.name)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0),
    }))
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  function greetingText() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }

  function openTab(tab: typeof activeTab) {
    const allowedTabs = getAllowedTabsForRole();
    if (!allowedTabs.includes(tab)) {
      alert("You do not have access to this module.");
      setMobileMenuOpen(false);
      setQuickAddOpen(false);
      return;
    }

    setActiveTab(tab);
    setMobileMenuOpen(false);
    setQuickAddOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function pageLabel(tab: typeof activeTab) {
    const labels: Record<string, string> = {
      dashboard: "Dashboard",
      customers: "Customers",
      vendors: "Vendors",
      accounting: "Accounting",
      quotes: "Sales Quotes",
      jobs: "Jobs",
      workorders: "Work Orders",
      technician: "Technician App",
      calendar: "Calendar",
      invoices: "Sales Invoices",
      payments: "Vendor Payments",
      receipts: "Customer Receipts",
      expenses: "Expenses",
      purchases: "Purchase Invoices (Bills)",
      journals: "Journal Entries",
      banks: "Banks",
      reports: "Reports",
      masters: "Masters",
      import: "Import / Export",
    };
    return labels[tab] || "Aashan & Co LLC";
  }

  return (
    <main style={styles.page}>
      <style>{`${printCss}

.bc-action-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 18px; border-bottom: 1px solid #d7dee8; padding-bottom: 12px; }
.bc-primary { background: #008b96; color: white; border: 0; border-radius: 9px; padding: 10px 18px; font-weight: 800; cursor: pointer; }
.bc-action { background: #f8fafc; color: #0f6270; border: 1px solid #cbd5e1; border-radius: 9px; padding: 10px 14px; font-weight: 800; cursor: pointer; }
.bc-general-grid { display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 14px 38px; margin-bottom: 24px; }
.bc-lines-title { font-size: 17px; font-weight: 900; color: #0f3f56; border-bottom: 2px solid #0f3f56; padding-bottom: 8px; margin: 6px 0 10px; }
.bc-lines-wrap { width: 100%; overflow-x: auto; border: 1px solid #d7dee8; border-radius: 12px; }
.bc-lines { width: 100%; min-width: 900px; border-collapse: collapse; background: white; }
.bc-lines th { text-align: left; font-size: 12px; color: #475569; background: #f8fafc; padding: 10px; border-bottom: 1px solid #d7dee8; }
.bc-lines td { padding: 7px; border-bottom: 1px solid #e5e7eb; }
.bc-lines input { width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 6px; padding: 9px; font-size: 14px; }
.bc-amount { text-align: right; font-weight: 900; white-space: nowrap; color: #0f172a; }
.bc-delete { border: 0; background: #fee2e2; color: #991b1b; border-radius: 7px; padding: 8px 10px; cursor: pointer; font-weight: 800; }
.bc-footer-grid { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(260px, 360px); gap: 24px; align-items: start; margin-top: 18px; }
.bc-totals { background: #f8fafc; border: 1px solid #d7dee8; border-radius: 12px; padding: 14px; }
.bc-totals div { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; }
.bc-totals div:last-child { border-bottom: 0; }
.bc-grand { font-size: 18px; color: #0f6270; }
@media (max-width: 760px) { .bc-general-grid, .bc-footer-grid { grid-template-columns: 1fr; } .bc-action-bar { position: sticky; top: 0; background: white; z-index: 20; } .bc-lines { min-width: 760px; } .bc-lines-wrap { margin-left: -8px; margin-right: -8px; width: calc(100% + 16px); } }

/* Phase 29 - consistent ERP and mobile navigation polish */
.app-screen { min-height: 100vh; }
@media (min-width: 901px) {
  .bottom-nav, .floating-add, .quick-add-sheet { display: none !important; }
}
@media (max-width: 900px) {
  main { padding-bottom: 82px; }
  header { padding: 14px 12px !important; }
  header h1 { font-size: 22px !important; }
  .app-screen section { padding: 10px !important; }
  .app-screen section > div { gap: 0 !important; }
  .topBar { background: white; border: 1px solid #d7dee8; border-radius: 16px; padding: 14px; box-shadow: 0 8px 20px rgba(15,23,42,0.06); }
  .topBar input { max-width: none !important; margin-bottom: 0 !important; }
  .mobile-dashboard-summary { display: grid !important; }
  .mobile-dashboard-summary div { background: white; border: 1px solid #d7dee8; border-radius: 14px; padding: 12px; box-shadow: 0 8px 20px rgba(15,23,42,0.05); }
  .mobile-dashboard-summary span { display: block; font-size: 12px; color: #64748b; margin-bottom: 5px; }
  .mobile-dashboard-summary b { font-size: 15px; color: #0f3f56; }
  .floating-add { display: block !important; }
  .quick-add-sheet { display: block !important; }
  .bc-action-bar { position: sticky; top: 64px; background: white; padding: 10px; border: 1px solid #d7dee8; border-radius: 14px; box-shadow: 0 8px 18px rgba(15,23,42,0.08); }
  .bc-primary, .bc-action { flex: 1 1 45%; text-align: center; }
  table { font-size: 13px; }
  th, td { white-space: nowrap; }
  .email-modal { grid-template-columns: 1fr !important; }
}
@media (max-width: 600px) {
  .bc-lines { min-width: 680px; }
  .bc-primary, .bc-action { flex: 1 1 100%; }
  .app-screen section { padding: 8px !important; }
  header h1 { font-size: 20px !important; }
}


/* Phase 29.1 - simplified dashboard and friendly mobile screens */
@media (max-width: 900px) {
  .app-screen { background: #f6f9fc; }
  .bc-general-grid { gap: 10px; }
  .bc-lines-wrap { border-radius: 16px; -webkit-overflow-scrolling: touch; }
  .bc-lines th { position: sticky; top: 0; z-index: 2; }
  input, textarea, select, button { font-size: 16px !important; }
}
@media (max-width: 600px) {
  .topBar { gap: 10px !important; }
  .topBar h2 { font-size: 20px !important; }
  .topBar p { font-size: 12px !important; }
}

`}</style>

      <div className="app-screen">
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button
              className="mobile-menu-button"
              style={styles.mobileMenuButton}
              onClick={() => setMobileMenuOpen(true)}
            >
              ☰
            </button>
            <div>
              <h1 style={styles.headerTitle}>Aashan & Co LLC</h1>
            </div>
          </div>
          <div style={styles.headerRight}>
            <button style={styles.syncBtn} onClick={loadData}>
              Sync
            </button>
            <span style={styles.rolePill}>{profile?.role || "User"}</span>
            <div style={styles.phaseBadge}>🔔 0</div>
          </div>
        </header>

        <section style={styles.container}>
          <div style={styles.erpShell}>
            {mobileMenuOpen && (
              <div
                className="mobile-backdrop"
                onClick={() => setMobileMenuOpen(false)}
              />
            )}
            <aside
              className={mobileMenuOpen ? "sidebar-open" : ""}
              style={styles.sidebar}
            >
              <div style={styles.sidebarBrand}>
                <span>Aashan & Co LLC</span>
                <button
                  className="mobile-close-button"
                  style={styles.mobileCloseButton}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  ×
                </button>
              </div>

              <SidebarGroup title="Dashboard">
                <SideButton
                  label="Dashboard"
                  active={activeTab === "dashboard"}
                  onClick={() => openTab("dashboard")}
                />
              </SidebarGroup>

              <SidebarGroup title="Customers">
                <SideButton
                  label="Customers"
                  active={activeTab === "customers"}
                  onClick={() => openTab("customers")}
                />
              </SidebarGroup>

              <SidebarGroup title="Sales">
                <SideButton
                  label="Quotes"
                  active={activeTab === "quotes"}
                  onClick={() => openTab("quotes")}
                />
                <SideButton
                  label="Invoices"
                  active={activeTab === "invoices"}
                  onClick={() => openTab("invoices")}
                />
                <SideButton
                  label="Customer Receipts"
                  active={activeTab === "receipts"}
                  onClick={() => openTab("receipts")}
                />
              </SidebarGroup>

              <SidebarGroup title="Operations">
                <SideButton
                  label="Jobs"
                  active={activeTab === "jobs"}
                  onClick={() => openTab("jobs")}
                />
                <SideButton
                  label="Work Orders"
                  active={activeTab === "workorders"}
                  onClick={() => openTab("workorders")}
                />
                <SideButton
                  label="Technician App"
                  active={activeTab === "technician"}
                  onClick={() => openTab("technician")}
                />
                <SideButton
                  label="Calendar"
                  active={activeTab === "calendar"}
                  onClick={() => openTab("calendar")}
                />
              </SidebarGroup>

              <SidebarGroup title="Vendors">
                <SideButton
                  label="Vendors"
                  active={activeTab === "vendors"}
                  onClick={() => openTab("vendors")}
                />
              </SidebarGroup>

              <SidebarGroup title="Purchasing">
                <SideButton
                  label="Purchase Invoices (Bills)"
                  active={activeTab === "purchases"}
                  onClick={() => openTab("purchases")}
                />
                <SideButton
                  label="Vendor Payments"
                  active={activeTab === "payments"}
                  onClick={() => openTab("payments")}
                />
                <SideButton
                  label="Expenses"
                  active={activeTab === "expenses"}
                  onClick={() => openTab("expenses")}
                />
              </SidebarGroup>

              <SidebarGroup title="Accounting">
                <SideButton
                  label="Banks"
                  active={activeTab === "banks"}
                  onClick={() => openTab("banks")}
                />
                <SideButton
                  label="Journal Entries"
                  active={activeTab === "journals"}
                  onClick={() => openTab("journals")}
                />
                <SideButton
                  label="Accounting"
                  active={activeTab === "accounting"}
                  onClick={() => openTab("accounting")}
                />
                <SideButton
                  label="Reports"
                  active={activeTab === "reports"}
                  onClick={() => openTab("reports")}
                />
              </SidebarGroup>

              {canAdmin && (
                <SidebarGroup title="Administration">
                  <SideButton
                    label="Masters"
                    active={activeTab === "masters"}
                    onClick={() => openTab("masters")}
                  />
                  <SideButton
                    label="Import / Export"
                    active={activeTab === "import"}
                    onClick={() => openTab("import")}
                  />
                </SidebarGroup>
              )}
            </aside>

            <div style={styles.contentArea}>
              <div style={styles.topBar}>
                <div>
                  <h2 style={styles.pageTitle}>{pageLabel(activeTab)}</h2>
                  <p style={styles.pageSub}>Aashan & Co LLC</p>
                </div>
                <input
                  placeholder="🔍 Search customer, invoice, work order..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.search}
                />
              </div>

              {/* Quick action tiles are kept only on the Dashboard page under Quick Actions. */}

              {loading && <p>Loading...</p>}

              {activeTab === "dashboard" && (
                <>
                  <div style={styles.executiveCards}>
                    <Card
                      title="Bank Balance"
                      value={`$${bankBalance.toFixed(2)}`}
                    />
                    <Card
                      title="Accounts Receivable"
                      value={`$${accountsReceivable.toFixed(2)}`}
                    />
                    <Card
                      title="Accounts Payable"
                      value={`$${accountsPayable.toFixed(2)}`}
                    />
                    <Card
                      title="Revenue YTD"
                      value={`$${paidRevenue.toFixed(2)}`}
                    />
                    <Card
                      title="Expenses YTD"
                      value={`$${totalExpenses.toFixed(2)}`}
                    />
                  </div>

                  <div style={styles.dashboardGrid}>
                    <SectionCard title="Quick Actions">
                      <div style={styles.actionGrid}>
                        <button
                          style={styles.actionTile}
                          onClick={() => openTab("customers")}
                        >
                          <span>👤</span>
                          <b>Customer</b>
                        </button>
                        <button
                          style={styles.actionTile}
                          onClick={() => openTab("quotes")}
                        >
                          <span>📄</span>
                          <b>Quote</b>
                        </button>
                        <button
                          style={styles.actionTileGreen}
                          onClick={() => openTab("workorders")}
                        >
                          <span>🛠️</span>
                          <b>Work Order</b>
                        </button>
                        <button
                          style={styles.actionTile}
                          onClick={() => openTab("invoices")}
                        >
                          <span>🧾</span>
                          <b>Invoice</b>
                        </button>
                        <button
                          style={styles.actionTileDark}
                          onClick={() => openTab("receipts")}
                        >
                          <span>💵</span>
                          <b>Receipt</b>
                        </button>
                      </div>
                    </SectionCard>
                  </div>
                </>
              )}

              {activeTab === "customers" && (
                <>
                  <SectionCard
                    title={editingCustomerId ? "Edit Customer" : "Add Customer"}
                  >
                    <div style={styles.formGrid2}>
                      <Input
                        label="Customer No"
                        value={customer.customer_no || ""}
                        onChange={(v: string) =>
                          setCustomer({ ...customer, customer_no: v })
                        }
                      />
                      <Input
                        label="Name"
                        value={customer.name}
                        onChange={(v: string) =>
                          setCustomer({ ...customer, name: v })
                        }
                      />
                      <Input
                        label="Phone"
                        value={customer.phone}
                        onChange={(v: string) =>
                          setCustomer({ ...customer, phone: v })
                        }
                      />
                      <Input
                        label="Email"
                        value={customer.email}
                        onChange={(v: string) =>
                          setCustomer({ ...customer, email: v })
                        }
                      />
                      <Input
                        label="Address"
                        value={customer.address}
                        onChange={(v: string) =>
                          setCustomer({ ...customer, address: v })
                        }
                      />
                    </div>
                    <ButtonRow>
                      <button onClick={saveCustomer} style={styles.primaryBtn}>
                        {editingCustomerId
                          ? "Update Customer"
                          : "Save Customer"}
                      </button>
                      {editingCustomerId && (
                        <button
                          onClick={() => {
                            setCustomer(emptyCustomer);
                            setEditingCustomerId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>

                  <DataTable
                    title="Customer List"
                    headers={[
                      "Customer #",
                      "Name",
                      "Phone",
                      "Email",
                      "Address",
                      "Actions",
                    ]}
                  >
                    {filteredCustomers.map((c) => (
                      <tr key={c.id}>
                        <Td>{c.customer_no}</Td>
                        <Td>{c.name}</Td>
                        <Td>{c.phone}</Td>
                        <Td>{c.email}</Td>
                        <Td>{c.address}</Td>
                        <Td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editCustomer(c)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => deleteCustomer(c.id)}
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}

              {activeTab === "vendors" && (
                <>
                  <SectionCard
                    title={editingVendorId ? "Edit Vendor" : "Add Vendor"}
                  >
                    <div style={styles.formGrid2}>
                      <Input
                        label="Vendor No"
                        value={vendor.vendor_no}
                        onChange={(v: string) =>
                          setVendor({ ...vendor, vendor_no: v })
                        }
                      />
                      <Input
                        label="Vendor Name"
                        value={vendor.vendor_name}
                        onChange={(v: string) =>
                          setVendor({ ...vendor, vendor_name: v })
                        }
                      />
                      <Input
                        label="Contact Person"
                        value={vendor.contact_person}
                        onChange={(v: string) =>
                          setVendor({ ...vendor, contact_person: v })
                        }
                      />
                      <Input
                        label="Phone"
                        value={vendor.phone}
                        onChange={(v: string) =>
                          setVendor({ ...vendor, phone: v })
                        }
                      />
                      <Input
                        label="Email"
                        value={vendor.email}
                        onChange={(v: string) =>
                          setVendor({ ...vendor, email: v })
                        }
                      />
                      <Input
                        label="Address"
                        value={vendor.address}
                        onChange={(v: string) =>
                          setVendor({ ...vendor, address: v })
                        }
                      />
                      <Input
                        label="Tax ID"
                        value={vendor.tax_id}
                        onChange={(v: string) =>
                          setVendor({ ...vendor, tax_id: v })
                        }
                      />
                      <Field label="Status">
                        <select
                          value={vendor.status}
                          onChange={(e) =>
                            setVendor({ ...vendor, status: e.target.value })
                          }
                          style={styles.input}
                        >
                          <option>Active</option>
                          <option>Inactive</option>
                          <option>Blocked</option>
                        </select>
                      </Field>
                      <Input
                        label="Notes"
                        value={vendor.notes}
                        onChange={(v: string) =>
                          setVendor({ ...vendor, notes: v })
                        }
                      />
                    </div>
                    <ButtonRow>
                      <button onClick={saveVendor} style={styles.primaryBtn}>
                        {editingVendorId ? "Update Vendor" : "Save Vendor"}
                      </button>
                      {editingVendorId && (
                        <button
                          onClick={() => {
                            setVendor(emptyVendor);
                            setEditingVendorId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>

                  <DataTable
                    title="Vendor List"
                    headers={[
                      "Vendor No",
                      "Name",
                      "Contact",
                      "Phone",
                      "Email",
                      "Status",
                      "Actions",
                    ]}
                  >
                    {filteredVendors.map((v) => (
                      <tr key={v.id}>
                        <Td>{v.vendor_no}</Td>
                        <Td>{v.vendor_name}</Td>
                        <Td>{v.contact_person}</Td>
                        <Td>{v.phone}</Td>
                        <Td>{v.email}</Td>
                        <Td>
                          <StatusBadge status={v.status} />
                        </Td>
                        <Td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editVendor(v)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => deleteVendor(v.id)}
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}

              {activeTab === "quotes" && (
                <>
                  <SectionCard
                    title={editingQuoteId ? "Edit Sales Quote" : "Sales Quote"}
                  >
                    <div className="bc-action-bar">
                      <button onClick={saveQuote} className="bc-primary">
                        ✓ Save
                      </button>
                      <button onClick={addQuoteLine} className="bc-action">
                        ＋ New Line
                      </button>
                      {editingQuoteId && (
                        <button onClick={resetQuoteForm} className="bc-action">
                          Cancel
                        </button>
                      )}
                    </div>
                    <div className="bc-general-grid">
                      <Field label="Customer Name">
                        <select
                          value={quote.customer}
                          onChange={(e) =>
                            setQuote({ ...quote, customer: e.target.value })
                          }
                          style={styles.input}
                        >
                          <option value="">Select Customer</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.customer_no
                                ? `${c.customer_no} - ${c.name}`
                                : c.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Input
                        label="Quote No"
                        value={quote.quote_no}
                        onChange={(v: string) =>
                          setQuote({ ...quote, quote_no: v })
                        }
                      />
                      <Input
                        label="Document Date"
                        type="date"
                        value={quote.quote_date}
                        onChange={(v: string) =>
                          setQuote({ ...quote, quote_date: v })
                        }
                      />
                      <Field label="Status">
                        <select
                          value={quote.status}
                          onChange={(e) =>
                            setQuote({ ...quote, status: e.target.value })
                          }
                          style={styles.input}
                        >
                          <option>Draft</option>
                          <option>Sent</option>
                          <option>Approved</option>
                          <option>Rejected</option>
                          <option>Converted</option>
                        </select>
                      </Field>
                    </div>
                    <div className="bc-lines-title">Lines</div>
                    <div className="bc-lines-wrap">
                      <table className="bc-lines">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Discount</th>
                            <th>Tax %</th>
                            <th>Line Amount</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {quoteLines.map((line, index) => {
                            const c = lineCalc(line);
                            return (
                              <tr key={index}>
                                <td>
                                  <input
                                    value={line.description}
                                    onChange={(e) =>
                                      updateQuoteLine(
                                        index,
                                        "description",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Service / item description"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={line.qty}
                                    onChange={(e) =>
                                      updateQuoteLine(
                                        index,
                                        "qty",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={line.unit_price}
                                    onChange={(e) =>
                                      updateQuoteLine(
                                        index,
                                        "unit_price",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={line.discount}
                                    onChange={(e) =>
                                      updateQuoteLine(
                                        index,
                                        "discount",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={line.tax_rate}
                                    onChange={(e) =>
                                      updateQuoteLine(
                                        index,
                                        "tax_rate",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Blank = no tax"
                                  />
                                </td>
                                <td className="bc-amount">
                                  ${c.total.toFixed(2)}
                                </td>
                                <td>
                                  <button
                                    onClick={() => deleteQuoteLine(index)}
                                    className="bc-delete"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="bc-footer-grid">
                      <Input
                        label="Notes"
                        value={quote.notes}
                        onChange={(v: string) =>
                          setQuote({ ...quote, notes: v })
                        }
                      />
                      <div className="bc-totals">
                        <div>
                          <span>Subtotal</span>
                          <b>
                            ${documentTotals(quoteLines).subtotal.toFixed(2)}
                          </b>
                        </div>
                        <div>
                          <span>Tax</span>
                          <b>${documentTotals(quoteLines).tax.toFixed(2)}</b>
                        </div>
                        <div className="bc-grand">
                          <span>Total</span>
                          <b>${documentTotals(quoteLines).total.toFixed(2)}</b>
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  <DataTable
                    title="Quotes"
                    headers={[
                      "Quote #",
                      "Customer",
                      "Date",
                      "Service",
                      "Amount",
                      "Status",
                      "Quick Status",
                      "Actions",
                    ]}
                  >
                    {filteredQuotes.map((qt) => (
                      <tr key={qt.id}>
                        <Td>{qt.quote_no}</Td>
                        <Td>{qt.customer}</Td>
                        <Td>{qt.quote_date}</Td>
                        <Td>{qt.service}</Td>
                        <Td>
                          $
                          {Number(qt.total_amount || qt.amount || 0).toFixed(2)}
                        </Td>
                        <Td>
                          <StatusBadge status={qt.status} />
                        </Td>
                        <Td>
                          <select
                            value={qt.status}
                            onChange={(e) =>
                              quickQuoteStatus(qt.id, e.target.value)
                            }
                            style={styles.smallSelect}
                          >
                            <option>Draft</option>
                            <option>Sent</option>
                            <option>Approved</option>
                            <option>Rejected</option>
                            <option>Converted</option>
                          </select>
                        </Td>
                        <Td>
                          <button
                            style={styles.printBtn}
                            onClick={() => openQuotePrint(qt)}
                          >
                            Print
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editQuote(qt)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.greenSmallBtn || styles.smallBtn}
                            onClick={() => convertQuoteToJob(qt)}
                          >
                            To Job
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() =>
                              emailDocument(
                                "Quote",
                                getCustomerByName(qt.customer)?.email || "",
                                `Quote ${qt.quote_no} from Aashan & Co LLC`,
                                DEFAULT_EMAIL_TEMPLATES["Quote Email"].body,
                                {
                                  customer: qt.customer,
                                  customer_name: qt.customer,
                                  quote_no: qt.quote_no,
                                  document_no: qt.quote_no,
                                  amount: qt.total_amount || qt.amount,
                                  service: qt.service,
                                  document_date: qt.quote_date,
                                },
                              )
                            }
                          >
                            Email
                          </button>
                          <button
                            style={styles.printBtn}
                            onClick={() => convertQuoteToInvoice(qt)}
                          >
                            To Invoice
                          </button>
                          {canDeleteDocument(qt.status) && (
                            <button
                              style={styles.dangerBtn}
                              onClick={() => deleteQuote(qt.id)}
                            >
                              Delete
                            </button>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}

              {activeTab === "jobs" && (
                <>
                  <SectionCard
                    title={
                      editingJobId ? "Edit Job / Quote" : "Add Job / Quote"
                    }
                  >
                    <div style={styles.formGrid2}>
                      <Field label="Customer">
                        <select
                          value={job.customer}
                          onChange={(e) =>
                            setJob({ ...job, customer: e.target.value })
                          }
                          style={styles.input}
                        >
                          <option value="">Select Customer</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.customer_no
                                ? `${c.customer_no} - ${c.name}`
                                : c.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Input
                        label="Service"
                        value={job.service}
                        onChange={(v: string) => setJob({ ...job, service: v })}
                      />
                      <Input
                        label="Date"
                        type="date"
                        value={job.job_date}
                        onChange={(v: string) =>
                          setJob({ ...job, job_date: v })
                        }
                      />
                      <Input
                        label="Amount"
                        value={job.amount}
                        onChange={(v: string) => setJob({ ...job, amount: v })}
                      />
                      <Field label="Status">
                        <select
                          value={job.status}
                          onChange={(e) =>
                            setJob({ ...job, status: e.target.value })
                          }
                          style={styles.input}
                        >
                          <option>New</option>
                          <option>Quoted</option>
                          <option>In Progress</option>
                          <option>Completed</option>
                          <option>Invoiced</option>
                          <option>Paid</option>
                        </select>
                      </Field>
                    </div>
                    <ButtonRow>
                      <button onClick={saveJob} style={styles.greenBtn}>
                        {editingJobId ? "Update Job" : "Save Job"}
                      </button>
                      {editingJobId && (
                        <button
                          onClick={() => {
                            setJob(emptyJob);
                            setEditingJobId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>

                  <DataTable
                    title="Jobs & Quotes"
                    headers={[
                      "Customer",
                      "Service",
                      "Date",
                      "Amount",
                      "Status",
                      "Quick Status",
                      "Actions",
                    ]}
                  >
                    {filteredJobs.map((j) => (
                      <tr key={j.id}>
                        <Td>{j.customer}</Td>
                        <Td>{j.service}</Td>
                        <Td>{j.job_date}</Td>
                        <Td>${Number(j.amount || 0).toFixed(2)}</Td>
                        <Td>
                          <StatusBadge status={j.status} />
                        </Td>
                        <Td>
                          <select
                            value={j.status}
                            onChange={(e) =>
                              quickJobStatus(j.id, e.target.value)
                            }
                            style={styles.smallSelect}
                          >
                            <option>New</option>
                            <option>Quoted</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                            <option>Invoiced</option>
                            <option>Paid</option>
                          </select>
                        </Td>
                        <Td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editJob(j)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => deleteJob(j.id)}
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}

              {activeTab === "workorders" && (
                <>
                  <SectionCard
                    title={
                      editingWorkOrderId
                        ? "Edit Work Order"
                        : "Create Work Order"
                    }
                  >
                    <div style={styles.formGrid2}>
                      <Field label="From Job">
                        <select
                          value={
                            workOrder.job_id ? String(workOrder.job_id) : ""
                          }
                          onChange={(e) => fillWorkOrderFromJob(e.target.value)}
                          style={styles.input}
                        >
                          <option value="">Select Job</option>
                          {jobs.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.customer} - {j.service}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Input
                        label="Work Order No"
                        value={workOrder.work_order_no}
                        onChange={(v: string) =>
                          setWorkOrder({ ...workOrder, work_order_no: v })
                        }
                      />
                      <Input
                        label="Customer"
                        value={workOrder.customer}
                        onChange={(v: string) =>
                          setWorkOrder({ ...workOrder, customer: v })
                        }
                      />
                      <Input
                        label="Service"
                        value={workOrder.service}
                        onChange={(v: string) =>
                          setWorkOrder({ ...workOrder, service: v })
                        }
                      />
                      <Input
                        label="Technician / Assigned To"
                        value={workOrder.technician}
                        onChange={(v: string) =>
                          setWorkOrder({ ...workOrder, technician: v })
                        }
                      />
                      <Input
                        label="Scheduled Date"
                        type="date"
                        value={workOrder.scheduled_date}
                        onChange={(v: string) =>
                          setWorkOrder({ ...workOrder, scheduled_date: v })
                        }
                      />
                      <Input
                        label="Start Time"
                        type="time"
                        value={workOrder.start_time}
                        onChange={(v: string) =>
                          setWorkOrder({ ...workOrder, start_time: v })
                        }
                      />
                      <Input
                        label="End Time"
                        type="time"
                        value={workOrder.end_time}
                        onChange={(v: string) =>
                          setWorkOrder({ ...workOrder, end_time: v })
                        }
                      />
                      <Field label="Status">
                        <select
                          value={workOrder.status}
                          onChange={(e) =>
                            setWorkOrder({
                              ...workOrder,
                              status: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option>Scheduled</option>
                          <option>In Progress</option>
                          <option>Completed</option>
                          <option>Cancelled</option>
                        </select>
                      </Field>
                      <Input
                        label="Notes"
                        value={workOrder.notes}
                        onChange={(v: string) =>
                          setWorkOrder({ ...workOrder, notes: v })
                        }
                      />
                    </div>
                    <ButtonRow>
                      <button onClick={saveWorkOrder} style={styles.primaryBtn}>
                        {editingWorkOrderId
                          ? "Update Work Order"
                          : "Save Work Order"}
                      </button>
                      {editingWorkOrderId && (
                        <button
                          onClick={() => {
                            setWorkOrder(emptyWorkOrder);
                            setEditingWorkOrderId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>

                  <DataTable
                    title="Work Orders"
                    headers={[
                      "WO #",
                      "Date",
                      "Time",
                      "Customer",
                      "Service",
                      "Technician",
                      "Status",
                      "Actions",
                    ]}
                  >
                    {filteredWorkOrders.map((wo) => (
                      <tr key={wo.id}>
                        <Td>{wo.work_order_no}</Td>
                        <Td>{wo.scheduled_date}</Td>
                        <Td>
                          {wo.start_time} - {wo.end_time}
                        </Td>
                        <Td>{wo.customer}</Td>
                        <Td>{wo.service}</Td>
                        <Td>{wo.technician}</Td>
                        <Td>
                          <select
                            value={wo.status}
                            onChange={(e) =>
                              quickWorkOrderStatus(
                                wo.id,
                                e.target.value,
                                wo.job_id,
                              )
                            }
                            style={styles.smallSelect}
                          >
                            <option>Scheduled</option>
                            <option>In Progress</option>
                            <option>Completed</option>
                            <option>Cancelled</option>
                          </select>
                        </Td>
                        <Td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editWorkOrder(wo)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => deleteWorkOrder(wo.id)}
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}

              {activeTab === "technician" && (
                <>
                  <SectionCard title="Technician Mobile App">
                    <p style={styles.helpText}>
                      Simple mobile screen for field technicians to manage
                      today's assigned work.
                    </p>
                    <div style={styles.mobileQuickActions}>
                      <button
                        style={styles.primaryBtn}
                        onClick={() => openTab("workorders")}
                      >
                        Create / Edit Work Order
                      </button>
                      <button
                        style={styles.greenBtn}
                        onClick={() => openTab("calendar")}
                      >
                        Open Schedule
                      </button>
                      <button
                        style={styles.grayBtn}
                        onClick={() => openTab("invoices")}
                      >
                        Create Invoice
                      </button>
                    </div>
                  </SectionCard>

                  <SectionCard title="Today's Assigned Jobs">
                    {workOrders.filter(
                      (wo) =>
                        wo.scheduled_date === todayText &&
                        wo.status !== "Cancelled",
                    ).length === 0 && (
                      <p style={styles.helpText}>
                        No work orders scheduled for today.
                      </p>
                    )}

                    <div style={styles.techJobList}>
                      {workOrders
                        .filter(
                          (wo) =>
                            wo.scheduled_date === todayText &&
                            wo.status !== "Cancelled",
                        )
                        .sort((a, b) =>
                          String(a.start_time || "").localeCompare(
                            String(b.start_time || ""),
                          ),
                        )
                        .map((wo) => (
                          <div key={wo.id} style={styles.techJobCard}>
                            <div style={styles.techJobHeader}>
                              <div>
                                <b>{wo.customer}</b>
                                <p>{wo.service}</p>
                              </div>
                              <StatusBadge status={wo.status} />
                            </div>

                            <div style={styles.techMeta}>
                              <span>WO: {wo.work_order_no}</span>
                              <span>
                                {wo.start_time || "Start"} -{" "}
                                {wo.end_time || "End"}
                              </span>
                              <span>Tech: {wo.technician || "Unassigned"}</span>
                            </div>

                            <div style={styles.mobileQuickActions}>
                              <button
                                style={styles.primaryBtn}
                                onClick={() =>
                                  quickWorkOrderStatus(
                                    wo.id,
                                    "In Progress",
                                    wo.job_id,
                                  )
                                }
                              >
                                Start Job
                              </button>
                              <button
                                style={styles.greenBtn}
                                onClick={() =>
                                  quickWorkOrderStatus(
                                    wo.id,
                                    "Completed",
                                    wo.job_id,
                                  )
                                }
                              >
                                Complete
                              </button>
                              <button
                                style={styles.grayBtn}
                                onClick={() => editWorkOrder(wo)}
                              >
                                Details
                              </button>
                            </div>

                            <div style={styles.techPlaceholders}>
                              <button
                                style={styles.smallBtn}
                                onClick={() =>
                                  alert(
                                    "Photo upload will be added in Phase 15B",
                                  )
                                }
                              >
                                Upload Photos
                              </button>
                              <button
                                style={styles.smallBtn}
                                onClick={() =>
                                  alert(
                                    "Customer signature will be added in Phase 15B",
                                  )
                                }
                              >
                                Signature
                              </button>
                              <button
                                style={styles.smallBtn}
                                onClick={() =>
                                  alert(
                                    "GPS check-in will be added in Phase 15B",
                                  )
                                }
                              >
                                GPS Check-in
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </SectionCard>

                  <DataTable
                    title="All Open Technician Work"
                    headers={[
                      "Date",
                      "Time",
                      "Customer",
                      "Service",
                      "Technician",
                      "Status",
                      "Actions",
                    ]}
                  >
                    {workOrders
                      .filter((wo) =>
                        ["Scheduled", "In Progress"].includes(wo.status),
                      )
                      .map((wo) => (
                        <tr key={wo.id}>
                          <Td>{wo.scheduled_date}</Td>
                          <Td>
                            {wo.start_time} - {wo.end_time}
                          </Td>
                          <Td>{wo.customer}</Td>
                          <Td>{wo.service}</Td>
                          <Td>{wo.technician}</Td>
                          <Td>
                            <StatusBadge status={wo.status} />
                          </Td>
                          <Td>
                            <button
                              style={styles.smallBtn}
                              onClick={() => editWorkOrder(wo)}
                            >
                              Open
                            </button>
                          </Td>
                        </tr>
                      ))}
                  </DataTable>
                </>
              )}

              {activeTab === "calendar" && (
                <>
                  <SectionCard title="Calendar / Daily Schedule">
                    <div style={styles.cards}>
                      <Card title="Today" value={todaysWorkOrders} />
                      <Card
                        title="Scheduled / In Progress"
                        value={scheduledWorkOrders}
                      />
                      <Card
                        title="Completed Work Orders"
                        value={
                          workOrders.filter((wo) => wo.status === "Completed")
                            .length
                        }
                      />
                    </div>
                  </SectionCard>

                  <DataTable
                    title="Upcoming Schedule"
                    headers={[
                      "Date",
                      "Time",
                      "Customer",
                      "Service",
                      "Technician",
                      "Status",
                    ]}
                  >
                    {workOrders
                      .filter((wo) => wo.status !== "Cancelled")
                      .sort((a, b) =>
                        String(a.scheduled_date + a.start_time).localeCompare(
                          String(b.scheduled_date + b.start_time),
                        ),
                      )
                      .map((wo) => (
                        <tr key={wo.id}>
                          <Td>{wo.scheduled_date}</Td>
                          <Td>
                            {wo.start_time} - {wo.end_time}
                          </Td>
                          <Td>{wo.customer}</Td>
                          <Td>{wo.service}</Td>
                          <Td>{wo.technician}</Td>
                          <Td>
                            <StatusBadge status={wo.status} />
                          </Td>
                        </tr>
                      ))}
                  </DataTable>
                </>
              )}

              {activeTab === "invoices" && (
                <>
                  <SectionCard
                    title={
                      editingInvoiceId ? "Edit Sales Invoice" : "Sales Invoice"
                    }
                  >
                    <div className="bc-action-bar">
                      <button onClick={saveInvoice} className="bc-primary">
                        ✓ Save
                      </button>
                      <button onClick={addInvoiceLine} className="bc-action">
                        ＋ New Line
                      </button>
                      {editingInvoiceId && (
                        <button
                          onClick={resetInvoiceForm}
                          className="bc-action"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                    <div className="bc-general-grid">
                      <Field label="From Quote">
                        <select
                          value={
                            invoice.quote_id ? String(invoice.quote_id) : ""
                          }
                          onChange={(e) => fillInvoiceFromQuote(e.target.value)}
                          style={styles.input}
                        >
                          <option value="">Select Quote</option>
                          {availableInvoiceQuotes.map((q) => (
                            <option key={q.id} value={q.id}>
                              {q.quote_no} - {q.customer} - $
                              {Number(q.total_amount || q.amount || 0).toFixed(
                                2,
                              )}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="From Job">
                        <select
                          value={invoice.job_id ? String(invoice.job_id) : ""}
                          onChange={(e) => fillInvoiceFromJob(e.target.value)}
                          style={styles.input}
                        >
                          <option value="">Select Job</option>
                          {availableInvoiceJobs.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.customer} - {j.service} - ${j.amount}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Input
                        label="Invoice No"
                        value={invoice.invoice_no}
                        onChange={(v: string) =>
                          setInvoice({ ...invoice, invoice_no: v })
                        }
                      />
                      <Field label="Customer Name">
                        <select
                          value={invoice.customer}
                          onChange={(e) => fillInvoiceCustomer(e.target.value)}
                          style={styles.input}
                        >
                          <option value="">Select Customer</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.customer_no
                                ? `${c.customer_no} - ${c.name}`
                                : c.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Input
                        label="Invoice Date"
                        type="date"
                        value={invoice.invoice_date}
                        onChange={(v: string) =>
                          setInvoice({ ...invoice, invoice_date: v })
                        }
                      />
                      <Input
                        label="Due Date"
                        type="date"
                        value={invoice.due_date}
                        onChange={(v: string) =>
                          setInvoice({ ...invoice, due_date: v })
                        }
                      />
                      <Input
                        label="Customer Phone"
                        value={invoice.customer_phone || ""}
                        onChange={(v: string) =>
                          setInvoice({ ...invoice, customer_phone: v })
                        }
                      />
                      <Input
                        label="Customer Email"
                        value={invoice.customer_email || ""}
                        onChange={(v: string) =>
                          setInvoice({ ...invoice, customer_email: v })
                        }
                      />
                      <Input
                        label="Customer Address"
                        value={invoice.customer_address || ""}
                        onChange={(v: string) =>
                          setInvoice({ ...invoice, customer_address: v })
                        }
                      />
                      <Field label="Status">
                        <select
                          value={invoice.status}
                          onChange={(e) =>
                            setInvoice({ ...invoice, status: e.target.value })
                          }
                          style={styles.input}
                        >
                          <option>Draft</option>
                          <option>Sent</option>
                          <option>Partially Paid</option>
                          <option>Paid</option>
                          <option>Cancelled</option>
                        </select>
                      </Field>
                    </div>
                    <div className="bc-lines-title">Lines</div>
                    <div className="bc-lines-wrap">
                      <table className="bc-lines">
                        <thead>
                          <tr>
                            <th>Description</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Discount</th>
                            <th>Tax %</th>
                            <th>Line Amount</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceLines.map((line, index) => {
                            const c = lineCalc(line);
                            return (
                              <tr key={index}>
                                <td>
                                  <input
                                    value={line.description}
                                    onChange={(e) =>
                                      updateInvoiceLine(
                                        index,
                                        "description",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Service / item description"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={line.qty}
                                    onChange={(e) =>
                                      updateInvoiceLine(
                                        index,
                                        "qty",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={line.unit_price}
                                    onChange={(e) =>
                                      updateInvoiceLine(
                                        index,
                                        "unit_price",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={line.discount}
                                    onChange={(e) =>
                                      updateInvoiceLine(
                                        index,
                                        "discount",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    value={line.tax_rate}
                                    onChange={(e) =>
                                      updateInvoiceLine(
                                        index,
                                        "tax_rate",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Blank = no tax"
                                  />
                                </td>
                                <td className="bc-amount">
                                  ${c.total.toFixed(2)}
                                </td>
                                <td>
                                  <button
                                    onClick={() => deleteInvoiceLine(index)}
                                    className="bc-delete"
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="bc-footer-grid">
                      <Input
                        label="Notes"
                        value={invoice.notes || ""}
                        onChange={(v: string) =>
                          setInvoice({ ...invoice, notes: v })
                        }
                      />
                      <div className="bc-totals">
                        <div>
                          <span>Subtotal</span>
                          <b>
                            ${documentTotals(invoiceLines).subtotal.toFixed(2)}
                          </b>
                        </div>
                        <div>
                          <span>Tax</span>
                          <b>${documentTotals(invoiceLines).tax.toFixed(2)}</b>
                        </div>
                        <div className="bc-grand">
                          <span>Total</span>
                          <b>
                            ${documentTotals(invoiceLines).total.toFixed(2)}
                          </b>
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  <DataTable
                    title="Invoices"
                    headers={[
                      "Invoice #",
                      "Customer",
                      "Invoice Date",
                      "Due Date",
                      "Amount",
                      "Paid",
                      "Balance",
                      "Status",
                      "Actions",
                    ]}
                  >
                    {filteredInvoices.map((i) => (
                      <tr key={i.id}>
                        <Td>{i.invoice_no}</Td>
                        <Td>{i.customer}</Td>
                        <Td>{i.invoice_date}</Td>
                        <Td>{i.due_date}</Td>
                        <Td>
                          ${Number(i.total_amount || i.amount || 0).toFixed(2)}
                        </Td>
                        <Td>
                          ${invoicePaidAmount(i.id, i.invoice_no).toFixed(2)}
                        </Td>
                        <Td>${invoiceBalance(i).toFixed(2)}</Td>
                        <Td>
                          <StatusBadge status={i.status} />
                        </Td>
                        <Td>
                          <button
                            style={styles.printBtn}
                            onClick={() => openInvoicePrint(i)}
                          >
                            Print
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() =>
                              emailDocument(
                                "Invoice",
                                i.customer_email ||
                                  getCustomerByName(i.customer)?.email ||
                                  "",
                                `Invoice ${i.invoice_no} from Aashan & Co LLC`,
                                DEFAULT_EMAIL_TEMPLATES["Invoice Email"].body,
                                {
                                  customer: i.customer,
                                  customer_name: i.customer,
                                  invoice_no: i.invoice_no,
                                  document_no: i.invoice_no,
                                  amount: i.total_amount || i.amount,
                                  balance: invoiceBalance(i),
                                  due_date: i.due_date,
                                  service: i.notes || "Services provided",
                                  document_date: i.invoice_date,
                                },
                              )
                            }
                          >
                            Email
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editInvoice(i)}
                          >
                            Edit
                          </button>
                          {canDeleteDocument(i.status) && (
                            <button
                              style={styles.dangerBtn}
                              onClick={() => deleteInvoice(i.id)}
                            >
                              Delete
                            </button>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}

              {activeTab === "payments" && (
                <>
                  <SectionCard
                    title={
                      editingExpenseId
                        ? "Edit Vendor Payment"
                        : "Record Vendor Payment"
                    }
                  >
                    <p style={styles.helpText}>
                      Use Vendor Payments for money paid to vendors or
                      subcontractors. Existing vendor payment data saved in
                      Expenses will show here.
                    </p>
                    <div style={styles.formGrid2}>
                      <Input
                        label="Payment No"
                        value={expense.expense_no}
                        onChange={(v: string) =>
                          setExpense({ ...expense, expense_no: v })
                        }
                      />
                      <Input
                        label="Payment Date"
                        type="date"
                        value={expense.expense_date}
                        onChange={(v: string) =>
                          setExpense({ ...expense, expense_date: v })
                        }
                      />
                      <Field label="Payee / Vendor">
                        <select
                          value={expense.vendor}
                          onChange={(e) =>
                            setExpense({ ...expense, vendor: e.target.value })
                          }
                          style={styles.input}
                        >
                          <option value="">Select Vendor</option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.vendor_name}>
                              {v.vendor_name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Category">
                        <select
                          value={expense.category}
                          onChange={(e) =>
                            setExpense({ ...expense, category: e.target.value })
                          }
                          style={styles.input}
                        >
                          <option>Materials</option>
                          <option>Tools</option>
                          <option>Fuel</option>
                          <option>Labor</option>
                          <option>Subcontractor</option>
                          <option>Insurance</option>
                          <option>Marketing</option>
                          <option>Office Expense</option>
                          <option>Vehicle Expense</option>
                          <option>Other</option>
                        </select>
                      </Field>
                      <Input
                        label="Description"
                        value={expense.description}
                        onChange={(v: string) =>
                          setExpense({ ...expense, description: v })
                        }
                      />
                      <Input
                        label="Amount"
                        value={expense.amount}
                        onChange={(v: string) =>
                          setExpense({ ...expense, amount: v })
                        }
                      />
                      <Field label="Paid From / Method">
                        <select
                          value={expense.payment_method}
                          onChange={(e) =>
                            setExpense({
                              ...expense,
                              payment_method: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option>Cash</option>
                          <option>Check</option>
                          <option>Zelle</option>
                          <option>Credit Card</option>
                          <option>Bank Transfer</option>
                          <option>Other</option>
                        </select>
                      </Field>
                      <Field label="Status">
                        <select
                          value={expense.status}
                          onChange={(e) =>
                            setExpense({ ...expense, status: e.target.value })
                          }
                          style={styles.input}
                        >
                          <option>Draft</option>
                          <option>Submitted</option>
                          <option>Approved</option>
                          <option>Paid</option>
                        </select>
                      </Field>
                    </div>
                    <ButtonRow>
                      <button onClick={saveExpense} style={styles.primaryBtn}>
                        {editingExpenseId
                          ? "Update Vendor Payment"
                          : "Save Vendor Payment"}
                      </button>
                      {editingExpenseId && (
                        <button
                          onClick={() => {
                            setExpense(emptyExpense);
                            setEditingExpenseId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>

                  <DataTable
                    title="Vendor Payments"
                    headers={[
                      "Payment #",
                      "Date",
                      "Vendor",
                      "Category",
                      "Description",
                      "Amount",
                      "Method",
                      "Status",
                      "Actions",
                    ]}
                  >
                    {filteredExpenses.map((e) => (
                      <tr key={e.id}>
                        <Td>{e.expense_no}</Td>
                        <Td>{e.expense_date}</Td>
                        <Td>{e.vendor}</Td>
                        <Td>{e.category}</Td>
                        <Td>{e.description}</Td>
                        <Td>${Number(e.amount || 0).toFixed(2)}</Td>
                        <Td>{e.payment_method}</Td>
                        <Td>
                          <StatusBadge status={e.status} />
                        </Td>
                        <Td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editExpense(e)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => deleteExpense(e.id)}
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}

              {activeTab === "receipts" && (
                <>
                  <SectionCard
                    title={
                      editingReceiptId
                        ? "Edit Customer Receipt"
                        : "Create Customer Receipt"
                    }
                  >
                    <div style={styles.formGrid2}>
                      <Field label="From Invoice">
                        <select
                          value={
                            availableReceiptInvoices.find(
                              (i) =>
                                String(i.invoice_no || "") ===
                                String(receipt.invoice_no || ""),
                            )?.id
                              ? String(
                                  availableReceiptInvoices.find(
                                    (i) =>
                                      String(i.invoice_no || "") ===
                                      String(receipt.invoice_no || ""),
                                  )?.id,
                                )
                              : ""
                          }
                          onChange={(e) =>
                            fillReceiptFromInvoice(e.target.value)
                          }
                          style={styles.input}
                        >
                          <option value="">Select Open Invoice</option>
                          {availableReceiptInvoices.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.invoice_no} - {i.customer} - Balance $
                              {invoiceBalance(i).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Input
                        label="Customer Receipt No"
                        value={receipt.receipt_no}
                        onChange={(v: string) =>
                          setReceipt({ ...receipt, receipt_no: v })
                        }
                      />
                      <Input
                        label="Customer"
                        value={receipt.customer}
                        onChange={(v: string) =>
                          setReceipt({ ...receipt, customer: v })
                        }
                      />
                      <Input
                        label="Invoice No"
                        value={receipt.invoice_no}
                        onChange={(v: string) =>
                          setReceipt({ ...receipt, invoice_no: v })
                        }
                      />
                      <Input
                        label="Receipt Date"
                        type="date"
                        value={receipt.receipt_date}
                        onChange={(v: string) =>
                          setReceipt({ ...receipt, receipt_date: v })
                        }
                      />
                      <Input
                        label="Amount"
                        value={receipt.amount}
                        onChange={(v: string) =>
                          setReceipt({ ...receipt, amount: v })
                        }
                      />
                      <Field label="Payment Method">
                        <select
                          value={receipt.payment_method}
                          onChange={(e) =>
                            setReceipt({
                              ...receipt,
                              payment_method: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option>Cash</option>
                          <option>Check</option>
                          <option>Zelle</option>
                          <option>Venmo</option>
                          <option>Credit Card</option>
                          <option>Bank Transfer</option>
                          <option>Other</option>
                        </select>
                      </Field>
                      <Field label="Bank">
                        <select
                          value={receipt.bank_name}
                          onChange={(e) =>
                            setReceipt({
                              ...receipt,
                              bank_name: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option value="">Select Bank</option>
                          {banks.map((b) => (
                            <option key={b.id} value={b.bank_name}>
                              {b.bank_name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Input
                        label="Notes"
                        value={receipt.notes}
                        onChange={(v: string) =>
                          setReceipt({ ...receipt, notes: v })
                        }
                      />
                    </div>
                    <ButtonRow>
                      <button onClick={saveReceipt} style={styles.primaryBtn}>
                        {editingReceiptId
                          ? "Update Customer Receipt"
                          : "Save Customer Receipt"}
                      </button>
                      {editingReceiptId && (
                        <button
                          onClick={() => {
                            setReceipt(emptyReceipt);
                            setEditingReceiptId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>
                  <DataTable
                    title="Customer Receipts"
                    headers={[
                      "Receipt #",
                      "Customer",
                      "Invoice #",
                      "Date",
                      "Amount",
                      "Method",
                      "Bank",
                      "Actions",
                    ]}
                  >
                    {receipts.map((r) => (
                      <tr key={r.id}>
                        <Td>{r.receipt_no}</Td>
                        <Td>{r.customer}</Td>
                        <Td>{r.invoice_no}</Td>
                        <Td>{r.receipt_date}</Td>
                        <Td>${Number(r.amount || 0).toFixed(2)}</Td>
                        <Td>{r.payment_method}</Td>
                        <Td>{r.bank_name}</Td>
                        <Td>
                          <button
                            style={styles.printBtn}
                            onClick={() => openReceiptPrint(r)}
                          >
                            Print
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() =>
                              emailDocument(
                                "Receipt",
                                getCustomerByName(r.customer)?.email || "",
                                `Receipt ${r.receipt_no} from Aashan & Co LLC`,
                                DEFAULT_EMAIL_TEMPLATES["Payment Receipt Email"]
                                  .body,
                                {
                                  customer: r.customer,
                                  customer_name: r.customer,
                                  receipt_no: r.receipt_no,
                                  document_no: r.receipt_no,
                                  amount: r.amount,
                                  invoice_no: r.invoice_no,
                                  service: `Payment received for invoice ${r.invoice_no}`,
                                  document_date: r.receipt_date,
                                },
                              )
                            }
                          >
                            Email
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editReceipt(r)}
                          >
                            Edit
                          </button>
                          {canDeleteDocument("Posted") && (
                            <button
                              style={styles.dangerBtn}
                              onClick={() => deleteReceipt(r.id)}
                            >
                              Delete
                            </button>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}

              {activeTab === "banks" && (
                <>
                  <SectionCard
                    title={editingBankId ? "Edit Bank" : "Create Bank"}
                  >
                    <div style={styles.formGrid2}>
                      <Input
                        label="Bank Name"
                        value={bank.bank_name}
                        onChange={(v: string) =>
                          setBank({ ...bank, bank_name: v })
                        }
                      />
                      <Input
                        label="Account Name"
                        value={bank.account_name}
                        onChange={(v: string) =>
                          setBank({ ...bank, account_name: v })
                        }
                      />
                      <Input
                        label="Account Number"
                        value={bank.account_number}
                        onChange={(v: string) =>
                          setBank({ ...bank, account_number: v })
                        }
                      />
                      <Input
                        label="Routing Number"
                        value={bank.routing_number}
                        onChange={(v: string) =>
                          setBank({ ...bank, routing_number: v })
                        }
                      />
                      <Input
                        label="Opening Balance"
                        value={bank.opening_balance}
                        onChange={(v: string) =>
                          setBank({ ...bank, opening_balance: v })
                        }
                      />
                      <Input
                        label="Current Balance"
                        value={bank.current_balance}
                        onChange={(v: string) =>
                          setBank({ ...bank, current_balance: v })
                        }
                      />
                      <Field label="Active">
                        <select
                          value={bank.is_active ? "Yes" : "No"}
                          onChange={(e) =>
                            setBank({
                              ...bank,
                              is_active: e.target.value === "Yes",
                            })
                          }
                          style={styles.input}
                        >
                          <option>Yes</option>
                          <option>No</option>
                        </select>
                      </Field>
                    </div>
                    <ButtonRow>
                      <button onClick={saveBank} style={styles.primaryBtn}>
                        {editingBankId ? "Update Bank" : "Save Bank"}
                      </button>
                      {editingBankId && (
                        <button
                          onClick={() => {
                            setBank(emptyBank);
                            setEditingBankId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>
                  <DataTable
                    title="Bank Accounts"
                    headers={[
                      "Bank",
                      "Account Name",
                      "Account #",
                      "Routing #",
                      "Opening",
                      "Current",
                      "Active",
                      "Actions",
                    ]}
                  >
                    {banks.map((b) => (
                      <tr key={b.id}>
                        <Td>{b.bank_name}</Td>
                        <Td>{b.account_name}</Td>
                        <Td>{b.account_number}</Td>
                        <Td>{b.routing_number}</Td>
                        <Td>${Number(b.opening_balance || 0).toFixed(2)}</Td>
                        <Td>${Number(b.current_balance || 0).toFixed(2)}</Td>
                        <Td>{b.is_active ? "Yes" : "No"}</Td>
                        <Td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editBank(b)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => deleteBank(b.id)}
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}

              {activeTab === "accounting" && (
                <SectionCard title="Accounting">
                  <AccountingEngine />
                </SectionCard>
              )}

              {activeTab === "purchases" && (
                <>
                  <SectionCard
                    title={
                      editingPurchaseInvoiceId
                        ? "Edit Purchase Invoice (Bill)"
                        : "Create Purchase Invoice (Bill)"
                    }
                  >
                    <div style={styles.formGrid2}>
                      <Input
                        label="Purchase Invoice No"
                        value={purchaseInvoice.purchase_invoice_no}
                        onChange={(v: string) =>
                          setPurchaseInvoice({
                            ...purchaseInvoice,
                            purchase_invoice_no: v,
                          })
                        }
                      />
                      <Field label="Vendor">
                        <select
                          value={purchaseInvoice.vendor}
                          onChange={(e) =>
                            setPurchaseInvoice({
                              ...purchaseInvoice,
                              vendor: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option value="">Select Vendor</option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.vendor_name}>
                              {v.vendor_name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Input
                        label="Invoice Date"
                        type="date"
                        value={purchaseInvoice.invoice_date}
                        onChange={(v: string) =>
                          setPurchaseInvoice({
                            ...purchaseInvoice,
                            invoice_date: v,
                          })
                        }
                      />
                      <Input
                        label="Due Date"
                        type="date"
                        value={purchaseInvoice.due_date}
                        onChange={(v: string) =>
                          setPurchaseInvoice({
                            ...purchaseInvoice,
                            due_date: v,
                          })
                        }
                      />
                      <Input
                        label="Category"
                        value={purchaseInvoice.category}
                        onChange={(v: string) =>
                          setPurchaseInvoice({
                            ...purchaseInvoice,
                            category: v,
                          })
                        }
                      />
                      <Input
                        label="Description"
                        value={purchaseInvoice.description}
                        onChange={(v: string) =>
                          setPurchaseInvoice({
                            ...purchaseInvoice,
                            description: v,
                          })
                        }
                      />
                      <Input
                        label="Amount"
                        value={purchaseInvoice.amount}
                        onChange={(v: string) =>
                          setPurchaseInvoice({ ...purchaseInvoice, amount: v })
                        }
                      />
                      <Field label="Bank">
                        <select
                          value={purchaseInvoice.bank_name}
                          onChange={(e) =>
                            setPurchaseInvoice({
                              ...purchaseInvoice,
                              bank_name: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option value="">Select Bank</option>
                          {banks.map((b) => (
                            <option key={b.id} value={b.bank_name}>
                              {b.bank_name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Status">
                        <select
                          value={purchaseInvoice.status}
                          onChange={(e) =>
                            setPurchaseInvoice({
                              ...purchaseInvoice,
                              status: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option>Open</option>
                          <option>Paid</option>
                          <option>Cancelled</option>
                        </select>
                      </Field>
                    </div>
                    <ButtonRow>
                      <button
                        onClick={savePurchaseInvoice}
                        style={styles.primaryBtn}
                      >
                        {editingPurchaseInvoiceId
                          ? "Update Purchase Invoice"
                          : "Save Purchase Invoice"}
                      </button>
                      {editingPurchaseInvoiceId && (
                        <button
                          onClick={() => {
                            setPurchaseInvoice(emptyPurchaseInvoice);
                            setEditingPurchaseInvoiceId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>
                  <DataTable
                    title="Purchase Invoices"
                    headers={[
                      "Invoice #",
                      "Vendor",
                      "Date",
                      "Due",
                      "Category",
                      "Amount",
                      "Status",
                      "Actions",
                    ]}
                  >
                    {purchaseInvoices.map((pi) => (
                      <tr key={pi.id}>
                        <Td>{pi.purchase_invoice_no}</Td>
                        <Td>{pi.vendor}</Td>
                        <Td>{pi.invoice_date}</Td>
                        <Td>{pi.due_date}</Td>
                        <Td>{pi.category}</Td>
                        <Td>${Number(pi.amount || 0).toFixed(2)}</Td>
                        <Td>
                          <StatusBadge status={pi.status} />
                        </Td>
                        <Td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editPurchaseInvoice(pi)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => deletePurchaseInvoice(pi.id)}
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}

              {activeTab === "journals" && (
                <>
                  <SectionCard
                    title={
                      editingJournalEntryId
                        ? "Edit Journal Entry"
                        : "Create Journal Entry"
                    }
                  >
                    <div style={styles.formGrid2}>
                      <Input
                        label="Journal No"
                        value={journalEntry.journal_no}
                        onChange={(v: string) =>
                          setJournalEntry({ ...journalEntry, journal_no: v })
                        }
                      />
                      <Input
                        label="Date"
                        type="date"
                        value={journalEntry.journal_date}
                        onChange={(v: string) =>
                          setJournalEntry({ ...journalEntry, journal_date: v })
                        }
                      />
                      <Input
                        label="Description"
                        value={journalEntry.description}
                        onChange={(v: string) =>
                          setJournalEntry({ ...journalEntry, description: v })
                        }
                      />
                      <Field label="Debit Account">
                        <select
                          value={journalEntry.debit_account}
                          onChange={(e) =>
                            setJournalEntry({
                              ...journalEntry,
                              debit_account: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option value="">Select Account</option>
                          {accounts.map((a) => (
                            <option
                              key={a.id}
                              value={`${a.account_code} - ${a.account_name}`}
                            >
                              {a.account_code} - {a.account_name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Credit Account">
                        <select
                          value={journalEntry.credit_account}
                          onChange={(e) =>
                            setJournalEntry({
                              ...journalEntry,
                              credit_account: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option value="">Select Account</option>
                          {accounts.map((a) => (
                            <option
                              key={a.id}
                              value={`${a.account_code} - ${a.account_name}`}
                            >
                              {a.account_code} - {a.account_name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Input
                        label="Amount"
                        value={journalEntry.amount}
                        onChange={(v: string) =>
                          setJournalEntry({ ...journalEntry, amount: v })
                        }
                      />
                      <Input
                        label="Notes"
                        value={journalEntry.notes}
                        onChange={(v: string) =>
                          setJournalEntry({ ...journalEntry, notes: v })
                        }
                      />
                    </div>
                    <ButtonRow>
                      <button
                        onClick={saveJournalEntry}
                        style={styles.primaryBtn}
                      >
                        {editingJournalEntryId
                          ? "Update Journal"
                          : "Save Journal"}
                      </button>
                      {editingJournalEntryId && (
                        <button
                          onClick={() => {
                            setJournalEntry(emptyJournalEntry);
                            setEditingJournalEntryId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>
                  <DataTable
                    title="Journal Entries"
                    headers={[
                      "Journal #",
                      "Date",
                      "Description",
                      "Debit",
                      "Credit",
                      "Amount",
                      "Actions",
                    ]}
                  >
                    {journalEntries.map((je) => (
                      <tr key={je.id}>
                        <Td>{je.journal_no}</Td>
                        <Td>{je.journal_date}</Td>
                        <Td>{je.description}</Td>
                        <Td>{je.debit_account}</Td>
                        <Td>{je.credit_account}</Td>
                        <Td>${Number(je.amount || 0).toFixed(2)}</Td>
                        <Td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editJournalEntry(je)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => deleteJournalEntry(je.id)}
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}

              {activeTab === "expenses" && (
                <>
                  <SectionCard
                    title={
                      editingExpenseId
                        ? "Edit Expense"
                        : "Add Cash / Bank Expense"
                    }
                  >
                    <div style={styles.formGrid2}>
                      <Input
                        label="Expense No"
                        value={expense.expense_no}
                        onChange={(v: string) =>
                          setExpense({ ...expense, expense_no: v })
                        }
                      />
                      <Input
                        label="Date"
                        type="date"
                        value={expense.expense_date}
                        onChange={(v: string) =>
                          setExpense({ ...expense, expense_date: v })
                        }
                      />
                      <Field label="Vendor">
                        <select
                          value={expense.vendor}
                          onChange={(e) =>
                            setExpense({ ...expense, vendor: e.target.value })
                          }
                          style={styles.input}
                        >
                          <option value="">Select Vendor</option>
                          {vendors.map((v) => (
                            <option key={v.id} value={v.vendor_name}>
                              {v.vendor_name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Category">
                        <select
                          value={expense.category}
                          onChange={(e) =>
                            setExpense({ ...expense, category: e.target.value })
                          }
                          style={styles.input}
                        >
                          <option>Materials</option>
                          <option>Tools</option>
                          <option>Fuel</option>
                          <option>Labor</option>
                          <option>Subcontractor</option>
                          <option>Insurance</option>
                          <option>Marketing</option>
                          <option>Office Expense</option>
                          <option>Vehicle Expense</option>
                          <option>Other</option>
                        </select>
                      </Field>
                      <Input
                        label="Description"
                        value={expense.description}
                        onChange={(v: string) =>
                          setExpense({ ...expense, description: v })
                        }
                      />
                      <Input
                        label="Amount"
                        value={expense.amount}
                        onChange={(v: string) =>
                          setExpense({ ...expense, amount: v })
                        }
                      />
                      <Field label="Payment Method">
                        <select
                          value={expense.payment_method}
                          onChange={(e) =>
                            setExpense({
                              ...expense,
                              payment_method: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option>Cash</option>
                          <option>Check</option>
                          <option>Zelle</option>
                          <option>Credit Card</option>
                          <option>Bank Transfer</option>
                          <option>Other</option>
                        </select>
                      </Field>
                      <Field label="Status">
                        <select
                          value={expense.status}
                          onChange={(e) =>
                            setExpense({ ...expense, status: e.target.value })
                          }
                          style={styles.input}
                        >
                          <option>Draft</option>
                          <option>Submitted</option>
                          <option>Approved</option>
                          <option>Paid</option>
                        </select>
                      </Field>
                    </div>
                    <ButtonRow>
                      <button onClick={saveExpense} style={styles.primaryBtn}>
                        {editingExpenseId ? "Update Expense" : "Save Expense"}
                      </button>
                      {editingExpenseId && (
                        <button
                          onClick={() => {
                            setExpense(emptyExpense);
                            setEditingExpenseId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>

                  <DataTable
                    title="Cash / Bank Expenses"
                    headers={[
                      "Expense #",
                      "Date",
                      "Vendor",
                      "Category",
                      "Description",
                      "Amount",
                      "Method",
                      "Status",
                      "Actions",
                    ]}
                  >
                    {filteredExpenses.map((e) => (
                      <tr key={e.id}>
                        <Td>{e.expense_no}</Td>
                        <Td>{e.expense_date}</Td>
                        <Td>{e.vendor}</Td>
                        <Td>{e.category}</Td>
                        <Td>{e.description}</Td>
                        <Td>${Number(e.amount || 0).toFixed(2)}</Td>
                        <Td>{e.payment_method}</Td>
                        <Td>
                          <StatusBadge status={e.status} />
                        </Td>
                        <Td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editExpense(e)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => deleteExpense(e.id)}
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}

              {activeTab === "reports" && (
                <>
                  <SectionCard title="Profit & Loss Summary">
                    <div style={styles.cards}>
                      <Card
                        title="Paid Revenue"
                        value={`$${paidRevenue.toFixed(2)}`}
                      />
                      <Card
                        title="Total Expenses"
                        value={`$${totalExpenses.toFixed(2)}`}
                      />
                      <Card
                        title="Net Profit"
                        value={`$${netProfit.toFixed(2)}`}
                      />
                      <Card
                        title="Outstanding AR"
                        value={`$${outstanding.toFixed(2)}`}
                      />
                      <Card
                        title="Approved/Paid Expenses"
                        value={`$${approvedExpenses.toFixed(2)}`}
                      />
                      <Card
                        title="Draft/Submitted Expenses"
                        value={`$${draftExpenses.toFixed(2)}`}
                      />
                    </div>
                  </SectionCard>

                  <DataTable
                    title="Revenue Report"
                    headers={[
                      "Invoice #",
                      "Customer",
                      "Date",
                      "Amount",
                      "Paid",
                      "Balance",
                      "Status",
                    ]}
                  >
                    {filteredInvoices.map((i) => (
                      <tr key={i.id}>
                        <Td>{i.invoice_no}</Td>
                        <Td>{i.customer}</Td>
                        <Td>{i.invoice_date}</Td>
                        <Td>
                          ${Number(i.total_amount || i.amount || 0).toFixed(2)}
                        </Td>
                        <Td>
                          ${invoicePaidAmount(i.id, i.invoice_no).toFixed(2)}
                        </Td>
                        <Td>${invoiceBalance(i).toFixed(2)}</Td>
                        <Td>
                          <StatusBadge status={i.status} />
                        </Td>
                      </tr>
                    ))}
                  </DataTable>

                  <DataTable
                    title="Expense Report"
                    headers={[
                      "Expense #",
                      "Date",
                      "Vendor",
                      "Category",
                      "Amount",
                      "Status",
                    ]}
                  >
                    {filteredExpenses.map((e) => (
                      <tr key={e.id}>
                        <Td>{e.expense_no}</Td>
                        <Td>{e.expense_date}</Td>
                        <Td>{e.vendor}</Td>
                        <Td>{e.category}</Td>
                        <Td>${Number(e.amount || 0).toFixed(2)}</Td>
                        <Td>
                          <StatusBadge status={e.status} />
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}

              {activeTab === "import" && (
                <>
                  <SectionCard title="Import Data from Excel">
                    <p style={styles.helpText}>
                      Upload .xlsx files directly. The app will preview the
                      first 20 rows and validate required columns before saving.
                    </p>
                    <div style={styles.formGrid2}>
                      <Field label="Import Customers Excel">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => previewImportFile(e, "customers")}
                          style={styles.input}
                        />
                      </Field>
                      <Field label="Import Vendors Excel">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => previewImportFile(e, "vendors")}
                          style={styles.input}
                        />
                      </Field>
                      <Field label="Import Expenses Excel">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => previewImportFile(e, "expenses")}
                          style={styles.input}
                        />
                      </Field>
                      <Field label="Import Chart of Accounts Excel">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => previewImportFile(e, "accounts")}
                          style={styles.input}
                        />
                      </Field>
                      <Field label="Import Vendor Payments">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => previewImportFile(e, "expenses")}
                          style={styles.input}
                        />
                      </Field>
                      <Field label="Import Customer Receipts">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => previewImportFile(e, "receipts")}
                          style={styles.input}
                        />
                      </Field>
                      <Field label="Import Customer Invoices">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => previewImportFile(e, "invoices")}
                          style={styles.input}
                        />
                      </Field>
                      <Field label="Import Purchase Invoices">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) =>
                            previewImportFile(e, "purchase_invoices")
                          }
                          style={styles.input}
                        />
                      </Field>
                      <Field label="Import Journal Entries">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) =>
                            previewImportFile(e, "journal_entries")
                          }
                          style={styles.input}
                        />
                      </Field>
                    </div>
                    <ButtonRow>
                      <button
                        style={styles.greenBtn}
                        onClick={() => downloadTemplate("customers")}
                      >
                        Customer Template
                      </button>
                      <button
                        style={styles.greenBtn}
                        onClick={() => downloadTemplate("vendors")}
                      >
                        Vendor Template
                      </button>
                      <button
                        style={styles.greenBtn}
                        onClick={() => downloadTemplate("expenses")}
                      >
                        Expense Template
                      </button>
                      <button
                        style={styles.greenBtn}
                        onClick={() => downloadTemplate("accounts")}
                      >
                        COA Template
                      </button>
                      <button
                        style={styles.greenBtn}
                        onClick={() => downloadTemplate("expenses")}
                      >
                        Vendor Payment Template
                      </button>
                      <button
                        style={styles.greenBtn}
                        onClick={() => downloadTemplate("receipts")}
                      >
                        Receipt Template
                      </button>
                      <button
                        style={styles.greenBtn}
                        onClick={() => downloadTemplate("invoices")}
                      >
                        Customer Invoice Template
                      </button>
                      <button
                        style={styles.greenBtn}
                        onClick={() => downloadTemplate("purchase_invoices")}
                      >
                        Purchase Invoice Template
                      </button>
                      <button
                        style={styles.greenBtn}
                        onClick={() => downloadTemplate("journal_entries")}
                      >
                        Journal Template
                      </button>
                    </ButtonRow>
                  </SectionCard>

                  {importPreview.length > 0 && (
                    <SectionCard
                      title={`Import Preview - ${pendingImportType}`}
                    >
                      {importErrors.length > 0 ? (
                        <div style={styles.errorBox}>
                          <b>Errors found:</b>
                          {importErrors.slice(0, 20).map((err, idx) => (
                            <p key={idx}>{err}</p>
                          ))}
                        </div>
                      ) : (
                        <div style={styles.successBox}>
                          Validation passed. Ready to import.
                        </div>
                      )}

                      <div style={{ overflowX: "auto", marginTop: 15 }}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              {Object.keys(importPreview[0] || {}).map((h) => (
                                <th key={h} style={styles.th}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {importPreview.map((row, idx) => (
                              <tr key={idx}>
                                {Object.keys(importPreview[0] || {}).map(
                                  (h) => (
                                    <Td key={h}>{row[h]}</Td>
                                  ),
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <ButtonRow>
                        <button
                          style={styles.primaryBtn}
                          onClick={confirmImport}
                          disabled={importErrors.length > 0}
                        >
                          Confirm Import
                        </button>
                        <button
                          style={styles.grayBtn}
                          onClick={() => {
                            setImportPreview([]);
                            setImportErrors([]);
                            setPendingImportType("");
                          }}
                        >
                          Cancel Import
                        </button>
                      </ButtonRow>
                    </SectionCard>
                  )}

                  <SectionCard title="Export Data">
                    <div style={styles.quickActions}>
                      <button
                        style={styles.primaryBtn}
                        onClick={() =>
                          exportCsv("customers.csv", [
                            ["Name", "Phone", "Email", "Address"],
                            ...customers.map((c) => [
                              c.name,
                              c.phone,
                              c.email,
                              c.address,
                            ]),
                          ])
                        }
                      >
                        Export Customers
                      </button>
                      <button
                        style={styles.primaryBtn}
                        onClick={() =>
                          exportCsv("vendors.csv", [
                            [
                              "Vendor No",
                              "Vendor Name",
                              "Contact",
                              "Phone",
                              "Email",
                              "Address",
                              "Tax ID",
                              "Status",
                            ],
                            ...vendors.map((v) => [
                              v.vendor_no,
                              v.vendor_name,
                              v.contact_person,
                              v.phone,
                              v.email,
                              v.address,
                              v.tax_id,
                              v.status,
                            ]),
                          ])
                        }
                      >
                        Export Vendors
                      </button>
                      <button
                        style={styles.primaryBtn}
                        onClick={() =>
                          exportCsv("quotes.csv", [
                            [
                              "Quote Number",
                              "Customer",
                              "Date",
                              "Service",
                              "Amount",
                              "Status",
                            ],
                            ...quotes.map((q) => [
                              q.quote_no,
                              q.customer,
                              q.quote_date,
                              q.service,
                              q.amount,
                              q.status,
                            ]),
                          ])
                        }
                      >
                        Export Quotes
                      </button>
                      <button
                        style={styles.primaryBtn}
                        onClick={() =>
                          exportCsv("invoices.csv", [
                            [
                              "Invoice Number",
                              "Customer",
                              "Invoice Date",
                              "Due Date",
                              "Amount",
                              "Status",
                            ],
                            ...invoices.map((i) => [
                              i.invoice_no,
                              i.customer,
                              i.invoice_date,
                              i.due_date,
                              i.amount,
                              i.status,
                            ]),
                          ])
                        }
                      >
                        Export Invoices
                      </button>
                      <button
                        style={styles.primaryBtn}
                        onClick={() =>
                          exportCsv("vendor_payments.csv", [
                            [
                              "Payment Number",
                              "Date",
                              "Vendor",
                              "Category",
                              "Description",
                              "Amount",
                              "Method",
                              "Status",
                            ],
                            ...expenses.map((e) => [
                              e.expense_no,
                              e.expense_date,
                              e.vendor,
                              e.category,
                              e.description,
                              e.amount,
                              e.payment_method,
                              e.status,
                            ]),
                          ])
                        }
                      >
                        Export Vendor Payments
                      </button>
                      <button
                        style={styles.primaryBtn}
                        onClick={() =>
                          exportCsv("expenses.csv", [
                            [
                              "Expense Number",
                              "Date",
                              "Vendor",
                              "Category",
                              "Description",
                              "Amount",
                              "Method",
                              "Status",
                            ],
                            ...expenses.map((e) => [
                              e.expense_no,
                              e.expense_date,
                              e.vendor,
                              e.category,
                              e.description,
                              e.amount,
                              e.payment_method,
                              e.status,
                            ]),
                          ])
                        }
                      >
                        Export Expenses
                      </button>
                    </div>
                  </SectionCard>
                </>
              )}

              {activeTab === "masters" && (
                <>
                  {canAdmin && (
                    <SectionCard title="User Management">
                      <UserManagement />
                    </SectionCard>
                  )}

                  <SectionCard title="Company Details">
                    <div style={styles.formGrid2}>
                      <Input
                        label="Company Name"
                        value={company.company_name}
                        onChange={(v: string) =>
                          setCompany({ ...company, company_name: v })
                        }
                      />
                      <Input
                        label="Phone"
                        value={company.phone}
                        onChange={(v: string) =>
                          setCompany({ ...company, phone: v })
                        }
                      />
                      <Input
                        label="Email"
                        value={company.email}
                        onChange={(v: string) =>
                          setCompany({ ...company, email: v })
                        }
                      />
                      <Input
                        label="Website"
                        value={company.website}
                        onChange={(v: string) =>
                          setCompany({ ...company, website: v })
                        }
                      />
                      <Input
                        label="Address"
                        value={company.address}
                        onChange={(v: string) =>
                          setCompany({ ...company, address: v })
                        }
                      />
                      <Input
                        label="Logo URL / Path"
                        value={company.logo_url}
                        onChange={(v: string) =>
                          setCompany({ ...company, logo_url: v })
                        }
                      />
                      <Input
                        label="Tax Rate %"
                        value={company.tax_rate}
                        onChange={(v: string) =>
                          setCompany({ ...company, tax_rate: v })
                        }
                      />
                      <Input
                        label="Payment Terms"
                        value={company.payment_terms}
                        onChange={(v: string) =>
                          setCompany({ ...company, payment_terms: v })
                        }
                      />
                      <Input
                        label="Payment Instructions"
                        value={company.payment_instructions}
                        onChange={(v: string) =>
                          setCompany({ ...company, payment_instructions: v })
                        }
                      />
                    </div>
                    <ButtonRow>
                      <button onClick={saveCompany} style={styles.primaryBtn}>
                        Save Company Details
                      </button>
                      <button
                        onClick={loadDefaultMasters}
                        style={styles.greenBtn}
                      >
                        Load Sample Defaults
                      </button>
                    </ButtonRow>
                  </SectionCard>

                  <SectionCard
                    title={
                      editingSequenceId
                        ? "Edit Number Sequence"
                        : "Number Sequence Setup"
                    }
                  >
                    <div style={styles.formGrid2}>
                      <Field label="Document Type">
                        <select
                          value={sequence.document_type}
                          onChange={(e) =>
                            setSequence({
                              ...sequence,
                              document_type: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option value="">Select Type</option>
                          <option>Customer</option>
                          <option>Job</option>
                          <option>Quote</option>
                          <option>Invoice</option>
                          <option>Payment</option>
                        </select>
                      </Field>
                      <Input
                        label="Prefix"
                        value={sequence.prefix}
                        onChange={(v: string) =>
                          setSequence({ ...sequence, prefix: v })
                        }
                      />
                      <Input
                        label="Next Number"
                        value={sequence.next_number}
                        onChange={(v: string) =>
                          setSequence({ ...sequence, next_number: v })
                        }
                      />
                      <Input
                        label="Padding"
                        value={sequence.padding}
                        onChange={(v: string) =>
                          setSequence({ ...sequence, padding: v })
                        }
                      />
                    </div>
                    <ButtonRow>
                      <button onClick={saveSequence} style={styles.primaryBtn}>
                        {editingSequenceId
                          ? "Update Sequence"
                          : "Save Sequence"}
                      </button>
                      {editingSequenceId && (
                        <button
                          onClick={() => {
                            setSequence(emptySequence);
                            setEditingSequenceId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>
                  <DataTable
                    title="Number Sequences"
                    headers={[
                      "Document Type",
                      "Prefix",
                      "Next Number",
                      "Padding",
                      "Actions",
                    ]}
                  >
                    {sequences.map((s) => (
                      <tr key={s.id}>
                        <Td>{s.document_type}</Td>
                        <Td>{s.prefix}</Td>
                        <Td>{s.next_number}</Td>
                        <Td>{s.padding}</Td>
                        <Td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editSequence(s)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => deleteSequence(s.id)}
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>

                  <SectionCard
                    title={
                      editingAccountId
                        ? "Edit Chart of Account"
                        : "Chart of Accounts"
                    }
                  >
                    <div style={styles.formGrid2}>
                      <Input
                        label="Account Code"
                        value={account.account_code}
                        onChange={(v: string) =>
                          setAccount({ ...account, account_code: v })
                        }
                      />
                      <Input
                        label="Account Name"
                        value={account.account_name}
                        onChange={(v: string) =>
                          setAccount({ ...account, account_name: v })
                        }
                      />
                      <Field label="Account Type">
                        <select
                          value={account.account_type}
                          onChange={(e) =>
                            setAccount({
                              ...account,
                              account_type: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option>Asset</option>
                          <option>Liability</option>
                          <option>Equity</option>
                          <option>Revenue</option>
                          <option>Expense</option>
                          <option>COGS</option>
                        </select>
                      </Field>
                      <Field label="Normal Balance">
                        <select
                          value={account.normal_balance}
                          onChange={(e) =>
                            setAccount({
                              ...account,
                              normal_balance: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option>Debit</option>
                          <option>Credit</option>
                        </select>
                      </Field>
                      <Field label="Active">
                        <select
                          value={account.is_active ? "Yes" : "No"}
                          onChange={(e) =>
                            setAccount({
                              ...account,
                              is_active: e.target.value === "Yes",
                            })
                          }
                          style={styles.input}
                        >
                          <option>Yes</option>
                          <option>No</option>
                        </select>
                      </Field>
                    </div>
                    <ButtonRow>
                      <button onClick={saveAccount} style={styles.primaryBtn}>
                        {editingAccountId ? "Update Account" : "Save Account"}
                      </button>
                      {editingAccountId && (
                        <button
                          onClick={() => {
                            setAccount(emptyAccount);
                            setEditingAccountId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>
                  <DataTable
                    title="Chart of Accounts"
                    headers={[
                      "Code",
                      "Name",
                      "Type",
                      "Normal Balance",
                      "Active",
                      "Actions",
                    ]}
                  >
                    {accounts.map((a) => (
                      <tr key={a.id}>
                        <Td>{a.account_code}</Td>
                        <Td>{a.account_name}</Td>
                        <Td>{a.account_type}</Td>
                        <Td>{a.normal_balance}</Td>
                        <Td>{a.is_active ? "Yes" : "No"}</Td>
                        <Td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editAccount(a)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => deleteAccount(a.id)}
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>

                  <SectionCard title="Email Setup">
                    <div style={styles.formGrid2}>
                      <Input
                        label="From Name"
                        value={emailSettings.from_name}
                        onChange={(v: string) =>
                          setEmailSettings({ ...emailSettings, from_name: v })
                        }
                      />
                      <Input
                        label="From Email"
                        value={emailSettings.from_email}
                        onChange={(v: string) =>
                          setEmailSettings({ ...emailSettings, from_email: v })
                        }
                      />
                      <Input
                        label="Reply-To Email"
                        value={emailSettings.reply_to_email}
                        onChange={(v: string) =>
                          setEmailSettings({
                            ...emailSettings,
                            reply_to_email: v,
                          })
                        }
                      />
                      <Input
                        label="BCC Email"
                        value={emailSettings.bcc_email}
                        onChange={(v: string) =>
                          setEmailSettings({ ...emailSettings, bcc_email: v })
                        }
                      />
                    </div>
                    <ButtonRow>
                      <button
                        onClick={saveEmailSettings}
                        style={styles.primaryBtn}
                      >
                        Save Email Setup
                      </button>
                    </ButtonRow>
                  </SectionCard>

                  <SectionCard
                    title={
                      editingTemplateId
                        ? "Edit Email Template"
                        : "Email Templates"
                    }
                  >
                    <div style={styles.formGrid2}>
                      <Field label="Template Name">
                        <select
                          value={template.template_name}
                          onChange={(e) =>
                            setTemplate({
                              ...template,
                              template_name: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option value="">Select Template</option>
                          <option>Invoice Email</option>
                          <option>Quote Email</option>
                          <option>Payment Receipt Email</option>
                          <option>Overdue Reminder Email</option>
                        </select>
                      </Field>
                      <Input
                        label="Subject"
                        value={template.subject}
                        onChange={(v: string) =>
                          setTemplate({ ...template, subject: v })
                        }
                      />
                    </div>
                    <Field label="Body">
                      <textarea
                        value={template.body}
                        onChange={(e) =>
                          setTemplate({ ...template, body: e.target.value })
                        }
                        style={{
                          ...styles.input,
                          minHeight: 150,
                          resize: "vertical",
                        }}
                      />
                    </Field>
                    <ButtonRow>
                      <button onClick={saveTemplate} style={styles.primaryBtn}>
                        {editingTemplateId
                          ? "Update Template"
                          : "Save Template"}
                      </button>
                      {editingTemplateId && (
                        <button
                          onClick={() => {
                            setTemplate(emptyTemplate);
                            setEditingTemplateId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>
                  <DataTable
                    title="Email Templates"
                    headers={["Template Name", "Subject", "Actions"]}
                  >
                    {templates.map((t) => (
                      <tr key={t.id}>
                        <Td>{t.template_name}</Td>
                        <Td>{t.subject}</Td>
                        <Td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editTemplate(t)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => deleteTemplate(t.id)}
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>

                  <SectionCard
                    title={
                      editingPrintTemplateId
                        ? "Edit Print Template"
                        : "Printout Template Setup"
                    }
                  >
                    <p style={styles.helpText}>
                      Modify print headers, logo, footer, terms, and default
                      notes for Quote, Invoice, and Receipt printouts. You can
                      paste a PNG/image as a base64 data URL or use a public
                      path such as /aashan-logo.png.
                    </p>
                    <div style={styles.formGrid2}>
                      <Field label="Document Type">
                        <select
                          value={printTemplate.document_type}
                          onChange={(e) => loadPrintDefaults(e.target.value)}
                          style={styles.input}
                        >
                          <option>Quote</option>
                          <option>Invoice</option>
                          <option>Receipt</option>
                        </select>
                      </Field>
                      <Input
                        label="Header Title"
                        value={printTemplate.header_title}
                        onChange={(v: string) =>
                          setPrintTemplate({
                            ...printTemplate,
                            header_title: v,
                          })
                        }
                      />
                      <Input
                        label="Header Subtitle"
                        value={printTemplate.header_subtitle}
                        onChange={(v: string) =>
                          setPrintTemplate({
                            ...printTemplate,
                            header_subtitle: v,
                          })
                        }
                      />
                      <Input
                        label="Logo URL / Path"
                        value={printTemplate.logo_url}
                        onChange={(v: string) =>
                          setPrintTemplate({ ...printTemplate, logo_url: v })
                        }
                      />
                    </div>

                    <Field label="Company Header Block">
                      <textarea
                        value={printTemplate.company_block}
                        onChange={(e) =>
                          setPrintTemplate({
                            ...printTemplate,
                            company_block: e.target.value,
                          })
                        }
                        style={{
                          ...styles.input,
                          minHeight: 95,
                          resize: "vertical",
                        }}
                      />
                    </Field>

                    <Field label="Paste PNG / Image Data URL">
                      <textarea
                        value={printTemplate.logo_data_url}
                        onChange={(e) =>
                          setPrintTemplate({
                            ...printTemplate,
                            logo_data_url: e.target.value,
                          })
                        }
                        placeholder="Paste data:image/png;base64,... here if needed"
                        style={{
                          ...styles.input,
                          minHeight: 90,
                          resize: "vertical",
                        }}
                      />
                    </Field>

                    <div
                      style={{
                        display: "flex",
                        gap: 15,
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginTop: 10,
                      }}
                    >
                      <button
                        onClick={pasteLogoFromClipboard}
                        style={styles.grayBtn}
                      >
                        Paste Image from Clipboard
                      </button>
                      {(printTemplate.logo_data_url ||
                        printTemplate.logo_url) && (
                        <img
                          src={
                            printTemplate.logo_data_url ||
                            printTemplate.logo_url
                          }
                          alt="Logo Preview"
                          style={{
                            width: 80,
                            height: 80,
                            objectFit: "contain",
                            border: "1px solid #e5e7eb",
                            borderRadius: 8,
                          }}
                        />
                      )}
                    </div>

                    <div style={styles.formGrid2}>
                      <Input
                        label="Footer Text"
                        value={printTemplate.footer_text}
                        onChange={(v: string) =>
                          setPrintTemplate({ ...printTemplate, footer_text: v })
                        }
                      />
                      <Input
                        label="Terms Text"
                        value={printTemplate.terms_text}
                        onChange={(v: string) =>
                          setPrintTemplate({ ...printTemplate, terms_text: v })
                        }
                      />
                      <Input
                        label="Default Notes"
                        value={printTemplate.notes_text}
                        onChange={(v: string) =>
                          setPrintTemplate({ ...printTemplate, notes_text: v })
                        }
                      />
                    </div>

                    <ButtonRow>
                      <button
                        onClick={savePrintTemplate}
                        style={styles.primaryBtn}
                      >
                        {editingPrintTemplateId
                          ? "Update Print Template"
                          : "Save Print Template"}
                      </button>
                      {editingPrintTemplateId && (
                        <button
                          onClick={() => {
                            setPrintTemplate(emptyPrintTemplate);
                            setEditingPrintTemplateId(null);
                          }}
                          style={styles.grayBtn}
                        >
                          Cancel
                        </button>
                      )}
                    </ButtonRow>
                  </SectionCard>

                  <DataTable
                    title="Print Templates"
                    headers={[
                      "Document Type",
                      "Header Title",
                      "Logo",
                      "Actions",
                    ]}
                  >
                    {printTemplates.map((pt) => (
                      <tr key={pt.id}>
                        <Td>{pt.document_type}</Td>
                        <Td>{pt.header_title}</Td>
                        <Td>
                          {pt.logo_data_url ? "Pasted Image" : pt.logo_url}
                        </Td>
                        <Td>
                          <button
                            style={styles.smallBtn}
                            onClick={() => editPrintTemplate(pt)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.dangerBtn}
                            onClick={() => deletePrintTemplate(pt.id)}
                          >
                            Delete
                          </button>
                        </Td>
                      </tr>
                    ))}
                  </DataTable>

                  <DataTable
                    title="User Roles"
                    headers={["Email", "Name", "Role", "Active"]}
                  >
                    {userProfiles.map((u) => (
                      <tr key={u.id}>
                        <Td>{u.email}</Td>
                        <Td>{u.full_name}</Td>
                        <Td>
                          <select
                            value={u.role}
                            onChange={(e) =>
                              updateUserRole(u.id, e.target.value)
                            }
                            style={styles.smallSelect}
                          >
                            <option>Admin</option>
                            <option>Staff</option>
                            <option>Technician</option>
                            <option>Read Only</option>
                          </select>
                        </Td>
                        <Td>{u.active ? "Yes" : "No"}</Td>
                      </tr>
                    ))}
                  </DataTable>
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {activeTab === "dashboard" && quickAddOpen && (
        <div className="quick-add-sheet" style={styles.quickAddSheet}>
          {isTechnician ? (
            <>
              <button
                style={styles.quickAddItem}
                onClick={() => openTab("technician")}
              >
                📅 My Jobs
              </button>
              <button
                style={styles.quickAddItem}
                onClick={() => openTab("workorders")}
              >
                🛠️ Work Orders
              </button>
              <button
                style={styles.quickAddItem}
                onClick={() => openTab("customers")}
              >
                👤 Customer Info
              </button>
            </>
          ) : isCustomer ? (
            <>
              <button
                style={styles.quickAddItem}
                onClick={() => openTab("quotes")}
              >
                📄 View Quotes
              </button>
              <button
                style={styles.quickAddItem}
                onClick={() => openTab("invoices")}
              >
                🧾 View Invoices
              </button>
              <button
                style={styles.quickAddItem}
                onClick={() => openTab("receipts")}
              >
                💵 View Receipts
              </button>
            </>
          ) : (
            <>
              <button
                style={styles.quickAddItem}
                onClick={() => openTab("customers")}
              >
                👤 New Customer
              </button>
              <button
                style={styles.quickAddItem}
                onClick={() => openTab("quotes")}
              >
                📄 New Quote
              </button>
              <button
                style={styles.quickAddItem}
                onClick={() => openTab("workorders")}
              >
                🛠️ New Work Order
              </button>
              <button
                style={styles.quickAddItem}
                onClick={() => openTab("invoices")}
              >
                🧾 New Invoice
              </button>
              <button
                style={styles.quickAddItem}
                onClick={() => openTab("receipts")}
              >
                💵 Customer Receipt
              </button>
              <button
                style={styles.quickAddItem}
                onClick={() => openTab("expenses")}
              >
                💳 Expense / Vendor Payment
              </button>
            </>
          )}
        </div>
      )}

      {activeTab === "dashboard" && (
        <button
          className="floating-add"
          style={styles.floatingAdd}
          onClick={() => setQuickAddOpen(!quickAddOpen)}
        >
          {quickAddOpen ? "×" : "+"}
        </button>
      )}

      <nav className="bottom-nav" style={styles.bottomNav}>
        <button
          style={
            activeTab === "dashboard"
              ? styles.bottomNavActive
              : styles.bottomNavBtn
          }
          onClick={() => openTab("dashboard")}
        >
          🏠<span>Home</span>
        </button>
        {isTechnician ? (
          <>
            <button
              style={
                activeTab === "jobs"
                  ? styles.bottomNavActive
                  : styles.bottomNavBtn
              }
              onClick={() => openTab("jobs")}
            >
              📋<span>Jobs</span>
            </button>
            <button
              style={
                activeTab === "workorders"
                  ? styles.bottomNavActive
                  : styles.bottomNavBtn
              }
              onClick={() => openTab("workorders")}
            >
              🛠️<span>WO</span>
            </button>
            <button
              style={
                activeTab === "technician"
                  ? styles.bottomNavActive
                  : styles.bottomNavBtn
              }
              onClick={() => openTab("technician")}
            >
              📅<span>Today</span>
            </button>
          </>
        ) : isCustomer ? (
          <>
            <button
              style={
                activeTab === "quotes"
                  ? styles.bottomNavActive
                  : styles.bottomNavBtn
              }
              onClick={() => openTab("quotes")}
            >
              📄<span>Quotes</span>
            </button>
            <button
              style={
                activeTab === "invoices"
                  ? styles.bottomNavActive
                  : styles.bottomNavBtn
              }
              onClick={() => openTab("invoices")}
            >
              🧾<span>Invoices</span>
            </button>
            <button
              style={
                activeTab === "receipts"
                  ? styles.bottomNavActive
                  : styles.bottomNavBtn
              }
              onClick={() => openTab("receipts")}
            >
              💵<span>Receipts</span>
            </button>
          </>
        ) : (
          <>
            <button
              style={
                activeTab === "customers"
                  ? styles.bottomNavActive
                  : styles.bottomNavBtn
              }
              onClick={() => openTab("customers")}
            >
              👥<span>Customers</span>
            </button>
            <button
              style={
                activeTab === "quotes"
                  ? styles.bottomNavActive
                  : styles.bottomNavBtn
              }
              onClick={() => openTab("quotes")}
            >
              📄<span>Quotes</span>
            </button>
            <button
              style={
                activeTab === "invoices"
                  ? styles.bottomNavActive
                  : styles.bottomNavBtn
              }
              onClick={() => openTab("invoices")}
            >
              🧾<span>Invoices</span>
            </button>
          </>
        )}
        <button
          style={styles.bottomNavBtn}
          onClick={() => setMobileMenuOpen(true)}
        >
          ☰<span>More</span>
        </button>
      </nav>

      {emailDraft.open && (
        <div
          className="email-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.68)",
            zIndex: 100000,
            display: "flex",
            alignItems: "stretch",
            justifyContent: "center",
            padding: 18,
            boxSizing: "border-box",
          }}
        >
          <div
            className="email-modal"
            style={{
              width: "min(1450px, 100%)",
              maxHeight: "calc(100vh - 36px)",
              background: "white",
              borderRadius: 16,
              overflow: "hidden",
              display: "grid",
              gridTemplateColumns: "minmax(430px, 0.9fr) minmax(520px, 1.1fr)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
            }}
          >
            <div
              className="email-modal-left"
              style={{
                padding: 26,
                overflow: "auto",
                borderRight: "1px solid #e5e7eb",
                background: "white",
              }}
            >
              <h2>Send {emailDraft.type}</h2>

              <label className="email-label">To</label>
              <input
                className="email-input"
                value={emailDraft.to}
                onChange={(e) =>
                  setEmailDraft({ ...emailDraft, to: e.target.value })
                }
              />

              <label className="email-label">Subject</label>
              <input
                className="email-input"
                value={emailDraft.subject}
                onChange={(e) =>
                  setEmailDraft({ ...emailDraft, subject: e.target.value })
                }
              />

              <label className="email-label">Message</label>
              <textarea
                className="email-textarea"
                value={emailDraft.body}
                onChange={(e) =>
                  setEmailDraft({
                    ...emailDraft,
                    body: e.target.value,
                    html: e.target.value.replaceAll("\n", "<br />"),
                  })
                }
              />

              <div className="email-attachment">
                <span>✓</span>
                <b>{emailDraft.attachmentName}</b>
              </div>

              <div className="email-actions">
                <button
                  className="email-send-btn"
                  disabled={emailSending}
                  onClick={sendEmailDraft}
                >
                  {emailSending ? "Sending..." : "Send"}
                </button>
                <button
                  className="email-cancel-btn"
                  disabled={emailSending}
                  onClick={() => setEmailDraft(emptyEmailDraft)}
                >
                  Cancel
                </button>
              </div>
            </div>

            <div
              className="email-modal-right"
              style={{
                background: "#263238",
                color: "white",
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
              }}
            >
              <div className="email-preview-header">
                <b>{emailDraft.type} Preview</b>
                <span>{emailDraft.attachmentName}</span>
              </div>

              <div className="email-pdf-preview">
                <div
                  className="mini-doc"
                  style={{
                    width: 520,
                    minHeight: 690,
                    background: "white",
                    color: "#0f172a",
                    padding: 34,
                    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  <div className="mini-logo-row">
                    <img
                      src={company.logo_url || LOGO_SRC}
                      style={{ width: 78, height: 78, objectFit: "contain" }}
                    />
                    <div>
                      <h3>{emailDraft.type}</h3>
                      <p>{company.company_name || "Aashan & Co LLC"}</p>
                    </div>
                  </div>
                  <div className="mini-line" />
                  <p>
                    <b>Customer:</b>{" "}
                    {emailDraft.data.customer || emailDraft.data.customer_name}
                  </p>
                  <p>
                    <b>Document No:</b>{" "}
                    {emailDraft.data.document_no ||
                      emailDraft.data.invoice_no ||
                      emailDraft.data.quote_no ||
                      emailDraft.data.receipt_no}
                  </p>
                  <p>
                    <b>Amount:</b> $
                    {Number(emailDraft.data.amount || 0).toFixed(2)}
                  </p>
                  {emailDraft.data.balance !== undefined && (
                    <p>
                      <b>Balance:</b> $
                      {Number(emailDraft.data.balance || 0).toFixed(2)}
                    </p>
                  )}
                  {emailDraft.data.due_date && (
                    <p>
                      <b>Due Date:</b> {emailDraft.data.due_date}
                    </p>
                  )}
                  <div className="mini-line" />
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      marginTop: 18,
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "1px solid #cbd5e1",
                            padding: "8px 4px",
                          }}
                        >
                          Description
                        </th>
                        <th
                          style={{
                            textAlign: "right",
                            borderBottom: "1px solid #cbd5e1",
                            padding: "8px 4px",
                          }}
                        >
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td
                          style={{
                            borderBottom: "1px solid #e5e7eb",
                            padding: "10px 4px",
                          }}
                        >
                          {emailDraft.data.service ||
                            emailDraft.data.description ||
                            `${emailDraft.type} ${emailDraft.data.document_no || ""}`}
                        </td>
                        <td
                          style={{
                            borderBottom: "1px solid #e5e7eb",
                            padding: "10px 4px",
                            textAlign: "right",
                          }}
                        >
                          ${Number(emailDraft.data.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div
                    style={{
                      marginTop: 18,
                      borderTop: "2px solid #0f172a",
                      paddingTop: 12,
                      textAlign: "right",
                      fontWeight: 900,
                    }}
                  >
                    Total: ${Number(emailDraft.data.amount || 0).toFixed(2)}
                  </div>
                  <p style={{ marginTop: 24, fontSize: 12, color: "#64748b" }}>
                    This is the attached document preview. The email message is
                    shown on the left.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {printQuote && (
        <div className="invoice-print">
          <div className="quote-page">
            <div className="doc-header">
              <div className="doc-brand">
                <img
                  src={printLogo("Quote")}
                  className="doc-logo"
                  alt="Aashan & Co LLC"
                />
                <div>
                  <h1>{getPrintTemplate("Quote").header_title}</h1>
                  <p>{getPrintTemplate("Quote").header_subtitle}</p>
                </div>
              </div>
              <div className="doc-contact">
                <p>☎ {company.phone || "(832) 210-4248"}</p>
                <p>✉ {company.email || "support@aashan.co"}</p>
                <p>🌐 {company.website || "www.aashan.co"}</p>
                <p>📍 Dallas–Fort Worth metroplex</p>
              </div>
            </div>

            <div className="doc-line" />

            <div className="doc-title-row">
              <div>
                <h2>QUOTE</h2>
                <p>
                  <b>Quote #:</b> {printQuote.quote_no}
                </p>
                <p>
                  <b>Reference:</b> {printQuote.id || ""}
                </p>
              </div>
              <div className="doc-date-box">
                <p>
                  <b>Issue date</b>
                  <span>{printQuote.quote_date}</span>
                </p>
                <p>
                  <b>Expiry date</b>
                  <span>
                    {(() => {
                      const d = new Date(
                        printQuote.quote_date ||
                          new Date().toISOString().slice(0, 10),
                      );
                      d.setDate(d.getDate() + 10);
                      return d.toISOString().slice(0, 10);
                    })()}
                  </span>
                </p>
              </div>
            </div>

            <div className="doc-bill-box">
              <h3>Quote To</h3>
              <p>
                <b>{printQuote.customer}</b>
              </p>
              <p>{getCustomerByName(printQuote.customer)?.address}</p>
              <p>{getCustomerByName(printQuote.customer)?.phone}</p>
              <p>{getCustomerByName(printQuote.customer)?.email}</p>
            </div>

            <h3 className="doc-service-title">
              {printQuote.service || "Quotation"}
            </h3>

            <table className="doc-items">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Price</th>
                  <th>Discount</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{printQuote.service}</td>
                  <td>{Number(printQuote.qty || 1).toFixed(0)}</td>
                  <td>
                    {Number(
                      printQuote.unit_price || printQuote.amount || 0,
                    ).toFixed(2)}
                  </td>
                  <td>
                    {Number(
                      printQuote.subtotal ||
                        Number(printQuote.qty || 1) *
                          Number(
                            printQuote.unit_price || printQuote.amount || 0,
                          ),
                    ).toFixed(2)}
                  </td>
                  <td>{Number(printQuote.discount || 0).toFixed(2)}</td>
                  <td>
                    {Number(
                      Number(printQuote.subtotal || 0) -
                        Number(printQuote.discount || 0) ||
                        printQuote.amount ||
                        0,
                    ).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="doc-totals">
              <p>
                <span>Sub-total</span>
                <b>
                  $
                  {Number(
                    Number(printQuote.subtotal || 0) -
                      Number(printQuote.discount || 0) ||
                      printQuote.amount ||
                      0,
                  ).toFixed(2)}
                </b>
              </p>
              <p>
                <span>Tax {Number(printQuote.tax_rate || 0).toFixed(2)}%</span>
                <b>${Number(printQuote.tax_amount || 0).toFixed(2)}</b>
              </p>
              <p className="doc-grand-total">
                <span>Total</span>
                <b>
                  $
                  {Number(
                    printQuote.total_amount || printQuote.amount || 0,
                  ).toFixed(2)}
                </b>
              </p>
            </div>

            <div className="doc-terms">
              <p>
                <b>Quotation Validity</b>
                <br />
                All quotes are valid for a limited period, typically ten (10)
                days from the date of the quotation.
              </p>
              <p>
                <b>Scope of Work / Supply</b>
                <br />
                Only items listed in the estimate are covered. Changes or
                additions must be documented in writing.
              </p>
              <p>
                <b>Pricing</b>
                <br />
                Based on labor hours and material costs at the time of the
                quote, price variations may apply if materials increase in cost.
              </p>
              <p>
                <b>Liability</b>
                <br />
                Aashan & Co LLC is not liable for indirect losses, such as loss
                of revenue, profit, or reputation.
              </p>
              <p>
                <b>Cancellations & Changes</b>
                <br />
                Any cancellation or modification must be communicated in
                writing. Cancellation fees may apply if work has already
                commenced or materials have been ordered.
              </p>
              <p>
                <b>Acceptance of Quotation</b>
                <br />
                Acceptance of this quotation, whether written, electronic, or
                verbal, constitutes acceptance of these terms and conditions.
              </p>
            </div>

            <div className="doc-footer">
              {getPrintTemplate("Quote").footer_text ||
                "Thank you for the opportunity."}
            </div>
          </div>
          <div className="print-action-row">
            <button className="close-print" onClick={() => window.print()}>
              Print Document
            </button>
            <button className="close-print" onClick={closePrintPreview}>
              Close Print Preview
            </button>
          </div>
        </div>
      )}

      {printReceipt && (
        <div className="invoice-print">
          <div className="invoice-page">
            <div className="invoice-header">
              <div>
                <img
                  src={printLogo("Receipt")}
                  className="invoice-logo"
                  alt="Aashan & Co LLC"
                />
                <h1>{getPrintTemplate("Receipt").header_title}</h1>
                <p>{getPrintTemplate("Receipt").header_subtitle}</p>
              </div>
              <div className="invoice-company">
                {renderCompanyBlock("Receipt")}
              </div>
            </div>
            <div className="invoice-title-row">
              <div>
                <h2>RECEIPT</h2>
                <p>
                  <b>Receipt #:</b> {printReceipt.receipt_no}
                </p>
                <p>
                  <b>Invoice #:</b> {printReceipt.invoice_no}
                </p>
              </div>
              <div>
                <p>
                  <b>Receipt Date:</b> {printReceipt.receipt_date}
                </p>
                <p>
                  <b>Payment Method:</b> {printReceipt.payment_method}
                </p>
              </div>
            </div>
            <div className="invoice-billto">
              <h3>Received From</h3>
              <p>
                <b>{printReceipt.customer}</b>
              </p>
              <p>{getCustomerByName(printReceipt.customer)?.address}</p>
              <p>{getCustomerByName(printReceipt.customer)?.phone}</p>
              <p>{getCustomerByName(printReceipt.customer)?.email}</p>
            </div>
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount Received</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    Payment received for invoice {printReceipt.invoice_no}
                  </td>
                  <td>${Number(printReceipt.amount || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div className="invoice-total">
              <p>
                <span>Amount Received:</span>{" "}
                <b>${Number(printReceipt.amount || 0).toFixed(2)}</b>
              </p>
            </div>
            <div className="invoice-notes">
              <h3>Notes</h3>
              <p>
                {printReceipt.notes ||
                  getPrintTemplate("Receipt").notes_text ||
                  "Thank you for your payment."}
              </p>
            </div>
            <div className="invoice-footer">
              {getPrintTemplate("Receipt").footer_text}
            </div>
          </div>
          <div className="print-action-row">
            <button className="close-print" onClick={() => window.print()}>
              Print Document
            </button>
            <button className="close-print" onClick={closePrintPreview}>
              Close Print Preview
            </button>
          </div>
        </div>
      )}

      {printInvoice && (
        <div className="invoice-print">
          <div className="quote-page">
            <div className="doc-header">
              <div className="doc-brand">
                <img
                  src={printLogo("Invoice")}
                  className="doc-logo"
                  alt="Aashan & Co LLC"
                />
                <div>
                  <h1>{getPrintTemplate("Invoice").header_title}</h1>
                  <p>{getPrintTemplate("Invoice").header_subtitle}</p>
                </div>
              </div>
              <div className="doc-contact">
                <p>☎ {company.phone || "(832) 210-4248"}</p>
                <p>✉ {company.email || "support@aashan.co"}</p>
                <p>🌐 {company.website || "www.aashan.co"}</p>
                <p>📍 Dallas–Fort Worth metroplex</p>
              </div>
            </div>

            <div className="doc-line" />

            <div className="doc-title-row">
              <div>
                <h2>INVOICE</h2>
                <p>
                  <b>Invoice #:</b> {printInvoice.invoice_no}
                </p>
                <p>
                  <b>Status:</b> {printInvoice.status}
                </p>
              </div>
              <div className="doc-date-box">
                <p>
                  <b>Invoice date</b>
                  <span>{printInvoice.invoice_date}</span>
                </p>
                <p>
                  <b>Due date</b>
                  <span>{printInvoice.due_date}</span>
                </p>
              </div>
            </div>

            <div className="doc-bill-box">
              <h3>Bill To</h3>
              <p>
                <b>{printInvoice.customer}</b>
              </p>
              <p>
                {printInvoice.customer_address ||
                  getCustomerByName(printInvoice.customer)?.address}
              </p>
              <p>
                {printInvoice.customer_phone ||
                  getCustomerByName(printInvoice.customer)?.phone}
              </p>
              <p>
                {printInvoice.customer_email ||
                  getCustomerByName(printInvoice.customer)?.email}
              </p>
            </div>

            <h3 className="doc-service-title">
              {printInvoice.notes || "Invoice"}
            </h3>

            <table className="doc-items">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Unit price</th>
                  <th>Price</th>
                  <th>Discount</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{printInvoice.notes || "Service"}</td>
                  <td>{Number(printInvoice.qty || 1).toFixed(0)}</td>
                  <td>
                    {Number(
                      printInvoice.unit_price || printInvoice.amount || 0,
                    ).toFixed(2)}
                  </td>
                  <td>
                    {Number(
                      printInvoice.subtotal ||
                        Number(printInvoice.qty || 1) *
                          Number(
                            printInvoice.unit_price || printInvoice.amount || 0,
                          ),
                    ).toFixed(2)}
                  </td>
                  <td>{Number(printInvoice.discount || 0).toFixed(2)}</td>
                  <td>
                    {Number(
                      Number(printInvoice.subtotal || 0) -
                        Number(printInvoice.discount || 0) ||
                        printInvoice.amount ||
                        0,
                    ).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="doc-totals">
              <p>
                <span>Sub-total</span>
                <b>
                  $
                  {Number(
                    Number(printInvoice.subtotal || 0) -
                      Number(printInvoice.discount || 0) ||
                      printInvoice.amount ||
                      0,
                  ).toFixed(2)}
                </b>
              </p>
              <p>
                <span>
                  Tax {Number(printInvoice.tax_rate || 0).toFixed(2)}%
                </span>
                <b>${Number(printInvoice.tax_amount || 0).toFixed(2)}</b>
              </p>
              <p className="doc-grand-total">
                <span>Total</span>
                <b>
                  $
                  {Number(
                    printInvoice.total_amount || printInvoice.amount || 0,
                  ).toFixed(2)}
                </b>
              </p>
            </div>

            <div className="doc-terms">
              <p>
                <b>Payment Terms</b>
                <br />
                {getPrintTemplate("Invoice").terms_text ||
                  "Payment due within agreed terms."}
              </p>
              <p>
                <b>Scope of Work / Supply</b>
                <br />
                Only items listed in this invoice are covered. Changes or
                additions must be documented in writing.
              </p>
              <p>
                <b>Pricing</b>
                <br />
                Pricing is based on labor hours, material costs, and services
                provided.
              </p>
              <p>
                <b>Questions</b>
                <br />
                Please contact Aashan & Co LLC if you have any questions
                regarding this invoice.
              </p>
            </div>

            <div className="doc-footer">
              {getPrintTemplate("Invoice").footer_text ||
                "Thank you for choosing Aashan & Co LLC."}
            </div>
          </div>
          <div className="print-action-row">
            <button className="close-print" onClick={() => window.print()}>
              Print Document
            </button>
            <button className="close-print" onClick={closePrintPreview}>
              Close Print Preview
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function SidebarGroup({ title, children }: any) {
  return (
    <div style={styles.sidebarGroup}>
      <div style={styles.sidebarGroupTitle}>{title}</div>
      {children}
    </div>
  );
}

function SideButton({ label, active, onClick }: any) {
  return (
    <button
      style={active ? styles.sideButtonActive : styles.sideButton}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Card({ title, value }: { title: string; value: any }) {
  const tone = title.toLowerCase().includes("outstanding")
    ? "#dc2626"
    : title.toLowerCase().includes("revenue") ||
        title.toLowerCase().includes("profit")
      ? "#16a34a"
      : title.toLowerCase().includes("work") ||
          title.toLowerCase().includes("job")
        ? "#f97316"
        : title.toLowerCase().includes("quote")
          ? "#7c3aed"
          : title.toLowerCase().includes("invoice") ||
              title.toLowerCase().includes("receipt")
            ? "#2563eb"
            : "#0f172a";

  return (
    <div
      className="dash-card"
      style={{ ...styles.card, borderLeft: `6px solid ${tone}` }}
    >
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.cardValue}>{value}</div>
    </div>
  );
}
function SectionCard({ title, children }: any) {
  return (
    <div style={styles.sectionCard}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, children }: any) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}
function Input({ label, value, onChange, type = "text" }: any) {
  return (
    <Field label={label}>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
      />
    </Field>
  );
}
function DataTable({ title, headers, children }: any) {
  return (
    <div style={styles.sectionCard}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              {headers.map((h: string) => (
                <th key={h} style={styles.th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
function Td({ children }: any) {
  return <td style={styles.td}>{children}</td>;
}
function ButtonRow({ children }: any) {
  return <div style={styles.buttonRow}>{children}</div>;
}
function StatusBadge({ status }: { status: string }) {
  const color =
    status === "Paid"
      ? styles.badgeGreen
      : status === "Partially Paid"
        ? styles.badgeOrange
        : status === "Cancelled"
          ? styles.badgeRed
          : status === "Sent" || status === "Invoiced"
            ? styles.badgeBlue
            : styles.badgeGray;
  return <span style={{ ...styles.badge, ...color }}>{status}</span>;
}

const styles: Record<string, any> = {
  page: {
    fontFamily: "Arial, sans-serif",
    background: "#eef3f8",
    minHeight: "100vh",
    color: "#0f172a",
  },
  loginPage: {
    fontFamily: "Arial, sans-serif",
    background: "linear-gradient(135deg, #0f172a, #2563eb)",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loginCard: {
    background: "white",
    borderRadius: 18,
    padding: 28,
    width: "100%",
    maxWidth: 430,
    boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
  },
  loginLogo: {
    background: "#0f172a",
    color: "white",
    padding: "10px 14px",
    borderRadius: 12,
    fontWeight: 800,
    display: "inline-block",
    marginBottom: 18,
  },
  logoutBtn: {
    background: "#dc2626",
    color: "white",
    border: 0,
    borderRadius: 999,
    padding: "8px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  header: {
    background: "linear-gradient(135deg, #0f172a, #008b96)",
    color: "white",
    padding: 22,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    position: "sticky",
    top: 0,
    zIndex: 9998,
    boxShadow: "0 12px 35px rgba(15,23,42,0.18)",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  rolePill: {
    background: "rgba(255,255,255,0.14)",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 800,
    fontSize: 13,
  },
  syncBtn: {
    background: "rgba(255,255,255,0.12)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.22)",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 900,
    cursor: "pointer",
  },
  headerTitle: { margin: 0, fontSize: 28 },
  headerSub: { margin: "6px 0 0", opacity: 0.9 },
  phaseBadge: {
    background: "#008b96",
    padding: "8px 14px",
    borderRadius: 999,
    fontWeight: 700,
  },
  container: { maxWidth: 1500, margin: "0 auto", padding: 18 },
  erpShell: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: 18,
    alignItems: "start",
  },
  sidebar: {
    background: "linear-gradient(180deg, #0f172a, #123b49)",
    color: "white",
    borderRadius: 18,
    padding: 16,
    position: "sticky",
    top: 16,
    minHeight: "calc(100vh - 130px)",
  },
  sidebarBrand: {
    fontSize: 20,
    fontWeight: 800,
    padding: "8px 10px 18px",
    borderBottom: "1px solid rgba(255,255,255,0.14)",
    marginBottom: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mobileMenuButton: {
    display: "none",
    background: "#2563eb",
    color: "white",
    border: 0,
    borderRadius: 10,
    padding: "9px 13px",
    cursor: "pointer",
    fontWeight: 800,
  },
  mobileCloseButton: {
    display: "none",
    background: "transparent",
    color: "white",
    border: 0,
    fontSize: 28,
    cursor: "pointer",
  },
  sidebarGroup: { marginBottom: 18 },
  sidebarGroupTitle: {
    fontSize: 12,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
    margin: "12px 10px 8px",
  },
  sideButton: {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    color: "#dbeafe",
    border: 0,
    borderRadius: 10,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 600,
    marginBottom: 4,
  },
  sideButtonActive: {
    width: "100%",
    textAlign: "left",
    background: "#008b96",
    color: "white",
    border: 0,
    borderRadius: 10,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 800,
    marginBottom: 4,
  },
  contentArea: { minWidth: 0 },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  pageTitle: { margin: 0, fontSize: 26 },
  pageSub: { margin: "4px 0 0", color: "#64748b" },
  dashboardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 18,
    marginTop: 18,
  },
  executiveCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 16,
    marginTop: 18,
    marginBottom: 18,
  },
  chartRow: {
    display: "grid",
    gridTemplateColumns: "80px 1fr",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  chartLabel: { fontWeight: 800, color: "#334155" },
  chartTrack: { display: "flex", flexDirection: "column", gap: 4 },
  chartBarRevenue: {
    background: "#dcfce7",
    color: "#166534",
    borderRadius: 999,
    padding: "5px 8px",
    fontSize: 12,
    whiteSpace: "nowrap",
    minWidth: 75,
  },
  chartBarExpense: {
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: 999,
    padding: "5px 8px",
    fontSize: 12,
    whiteSpace: "nowrap",
    minWidth: 75,
  },
  topCustomerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    borderBottom: "1px solid #e5e7eb",
    padding: "10px 0",
  },
  kpiList: { display: "grid", gap: 10 },
  kpiListItem: {},

  mobileQuickActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  mobileActionTiles: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
    marginBottom: 18,
  },
  mobileHomeBanner: {
    display: "none",
    background: "linear-gradient(135deg, #eff6ff, #ffffff)",
    border: "1px solid #dbeafe",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    boxShadow: "0 10px 25px rgba(37,99,235,0.08)",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  mobileDashboardSummary: {
    display: "none",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    marginBottom: 16,
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 10,
  },
  actionTile: {
    border: 0,
    background: "#008b96",
    color: "white",
    borderRadius: 16,
    padding: "13px 10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    fontWeight: 800,
  },
  actionTileGreen: {
    border: 0,
    background: "#008b96",
    color: "white",
    borderRadius: 16,
    padding: "13px 10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    fontWeight: 800,
  },
  actionTileDark: {
    border: 0,
    background: "#008b96",
    color: "white",
    borderRadius: 16,
    padding: "13px 10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    fontWeight: 800,
  },
  actionTileGray: {
    border: 0,
    background: "#008b96",
    color: "white",
    borderRadius: 16,
    padding: "13px 10px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    fontWeight: 800,
  },
  kpiRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e5e7eb",
    padding: "9px 0",
    gap: 12,
  },
  floatingAdd: {
    display: "none",
    position: "fixed",
    right: 18,
    bottom: 88,
    width: 62,
    height: 62,
    borderRadius: "50%",
    border: 0,
    background: "linear-gradient(135deg, #008b96, #0f6270)",
    color: "white",
    fontSize: 34,
    zIndex: 10000,
    boxShadow: "0 16px 40px rgba(37,99,235,0.42)",
  },
  quickAddSheet: {
    display: "none",
    position: "fixed",
    right: 18,
    bottom: 152,
    background: "white",
    borderRadius: 18,
    padding: 10,
    zIndex: 10000,
    boxShadow: "0 20px 50px rgba(15,23,42,0.25)",
    minWidth: 230,
  },
  quickAddItem: {
    width: "100%",
    textAlign: "left",
    border: 0,
    background: "transparent",
    padding: "12px 10px",
    borderRadius: 12,
    fontWeight: 800,
    color: "#0f172a",
  },
  quickActions: { display: "flex", flexWrap: "wrap", gap: 10 },
  bottomNav: {
    display: "none",
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(12px)",
    borderTop: "1px solid #e5e7eb",
    zIndex: 9999,
    padding: "6px 8px",
    boxShadow: "0 -10px 30px rgba(15,23,42,0.12)",
  },
  bottomNavBtn: {
    flex: 1,
    border: 0,
    background: "transparent",
    color: "#475569",
    padding: "6px 4px",
    borderRadius: 12,
    fontSize: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  bottomNavActive: {
    flex: 1,
    border: 0,
    background: "#dff7f8",
    color: "#008b96",
    padding: "6px 4px",
    borderRadius: 12,
    fontSize: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    fontWeight: 800,
  },
  techJobList: { display: "grid", gap: 14 },
  techJobCard: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 15,
  },
  techJobHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  techMeta: {
    display: "grid",
    gap: 5,
    color: "#64748b",
    fontSize: 13,
    margin: "10px 0",
  },
  techPlaceholders: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 },
  helpText: { color: "#64748b", marginTop: 0 },
  errorBox: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: 14,
    borderRadius: 10,
  },
  successBox: {
    background: "#dcfce7",
    color: "#166534",
    padding: 14,
    borderRadius: 10,
    fontWeight: 700,
  },
  toolbar: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 },
  tab: {
    background: "white",
    padding: "10px 18px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    boxShadow: "0 3px 10px rgba(15,23,42,0.08)",
    cursor: "pointer",
  },
  tabActive: {
    background: "#008b96",
    color: "white",
    padding: "10px 18px",
    borderRadius: 999,
    border: "1px solid #2563eb",
    boxShadow: "0 3px 10px rgba(37,99,235,0.25)",
    cursor: "pointer",
  },
  search: {
    width: "100%",
    maxWidth: 520,
    padding: 12,
    margin: "0 0 20px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    boxSizing: "border-box",
    background: "white",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 16,
    marginBottom: 22,
  },
  card: {
    background: "white",
    padding: 18,
    borderRadius: 18,
    border: "1px solid #d7dee8",
    boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
    minHeight: 92,
  },
  cardTitle: { fontWeight: 700, color: "#334155", marginBottom: 10 },
  cardValue: { fontSize: 28, fontWeight: 800 },
  sectionCard: {
    background: "white",
    padding: 22,
    borderRadius: 18,
    border: "1px solid #d7dee8",
    boxShadow: "0 8px 20px rgba(15,23,42,0.06)",
    marginTop: 22,
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 18,
    color: "#0f3f56",
    borderBottom: "2px solid #0f3f56",
    paddingBottom: 8,
  },
  formGrid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 18,
    alignItems: "end",
  },
  field: { display: "flex", flexDirection: "column", gap: 7 },
  label: { fontSize: 14, fontWeight: 700, color: "#0f172a" },
  input: {
    width: "100%",
    height: 42,
    padding: "9px 10px",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    boxSizing: "border-box",
    background: "white",
  },
  buttonRow: { display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" },
  primaryBtn: {
    background: "#008b96",
    color: "white",
    padding: "10px 16px",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  },
  greenBtn: {
    background: "#008b96",
    color: "white",
    padding: "10px 16px",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  },
  grayBtn: {
    background: "#64748b",
    color: "white",
    padding: "10px 16px",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  },
  smallBtn: {
    background: "#008b96",
    color: "white",
    padding: "7px 10px",
    border: 0,
    borderRadius: 7,
    marginRight: 6,
    cursor: "pointer",
  },
  greenSmallBtn: {
    background: "#008b96",
    color: "white",
    padding: "7px 10px",
    border: 0,
    borderRadius: 7,
    marginRight: 6,
    cursor: "pointer",
  },
  printBtn: {
    background: "#008b96",
    color: "white",
    padding: "7px 10px",
    border: 0,
    borderRadius: 7,
    marginRight: 6,
    cursor: "pointer",
  },
  dangerBtn: {
    background: "#dc2626",
    color: "white",
    padding: "7px 10px",
    border: 0,
    borderRadius: 7,
    cursor: "pointer",
  },
  smallSelect: { padding: 7, border: "1px solid #cbd5e1", borderRadius: 7 },
  badge: {
    padding: "5px 9px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 12,
  },
  badgeGreen: { background: "#dcfce7", color: "#166534" },
  badgeOrange: { background: "#ffedd5", color: "#9a3412" },
  badgeRed: { background: "#fee2e2", color: "#991b1b" },
  badgeBlue: { background: "#dbeafe", color: "#1d4ed8" },
  badgeGray: { background: "#e5e7eb", color: "#374151" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: 12,
    background: "#f8fafc",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  },
  td: {
    padding: 12,
    borderBottom: "1px solid #e5e7eb",
    verticalAlign: "middle",
  },
};

const printCss = `
.invoice-print { display: none; }

@media screen {
  .invoice-print {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.72);
    z-index: 99999;
    overflow: auto;
    padding: 22px 12px;
    display: block;
  }

  .quote-page {
    background: #ffffff;
    color: #0f172a;
    width: 8.5in;
    min-height: 11in;
    max-width: 100%;
    margin: 0 auto;
    padding: 0.36in;
    box-sizing: border-box;
    font-family: Arial, Helvetica, sans-serif;
    box-shadow: 0 20px 70px rgba(15, 23, 42, 0.35);
  }

  .print-action-row {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin: 16px auto 0;
  }

  .close-print {
    display: block;
    margin: 0;
    padding: 11px 18px;
    border: none;
    background: #dc2626;
    color: white;
    border-radius: 9px;
    cursor: pointer;
    font-weight: 800;
  }

  .print-action-row .close-print:first-child {
    background: #2563eb;
  }
}

@media print {
  @page {
    size: Letter;
    margin: 0.32in;
  }

  html,
  body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    height: auto !important;
    overflow: visible !important;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  body * {
    visibility: hidden !important;
  }

  .invoice-print,
  .invoice-print * {
    visibility: visible !important;
  }

  .app-screen,
  .app-screen *,
  .topBar,
  .bottom-nav,
  .floating-add,
  .quick-add-sheet,
  .close-print,
  .print-action-row {
    display: none !important;
    visibility: hidden !important;
  }

  .invoice-print {
    display: block !important;
    position: static !important;
    width: 100% !important;
    min-height: 0 !important;
    background: white !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: visible !important;
    z-index: auto !important;
  }

  .quote-page {
    display: block !important;
    width: 100% !important;
    min-height: 0 !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    page-break-after: avoid !important;
    page-break-before: avoid !important;
    page-break-inside: avoid !important;
    break-after: avoid !important;
    break-before: avoid !important;
    break-inside: avoid !important;
    font-family: Arial, Helvetica, sans-serif !important;
    color: #0f172a !important;
    background: white !important;
  }
}

.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 22px;
}

.doc-brand {
  display: flex;
  align-items: center;
  gap: 20px;
}

.doc-logo {
  width: 112px;
  height: 112px;
  object-fit: contain;
  display: block;
}

.doc-brand h1 {
  margin: 0;
  font-size: 27px;
  color: #0f172a;
  line-height: 1.15;
}

.doc-brand p {
  margin: 6px 0 0;
  font-size: 17px;
  color: #1f2937;
}

.doc-contact {
  text-align: left;
  font-size: 14px;
  line-height: 1.45;
  min-width: 220px;
}

.doc-contact p {
  margin: 0 0 7px;
}

.doc-line {
  border-top: 4px solid #0f172a;
  margin: 24px 0 18px;
}

.doc-title-row {
  display: flex;
  justify-content: space-between;
  gap: 28px;
  margin-bottom: 20px;
}

.doc-title-row h2 {
  margin: 0 0 8px;
  font-size: 38px;
  letter-spacing: 0.06em;
  color: #0f172a;
}

.doc-title-row p {
  margin: 4px 0;
  font-size: 14px;
}

.doc-date-box {
  min-width: 220px;
  padding-top: 8px;
}

.doc-date-box p {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 10px;
  margin: 0 0 13px;
  font-size: 15px;
}

.doc-bill-box {
  width: 360px;
  max-width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 13px 16px;
  margin: 8px 0 30px;
  background: #ffffff;
}

.doc-bill-box h3 {
  margin: 0 0 8px;
  color: #0f172a;
  font-size: 18px;
}

.doc-bill-box p {
  margin: 3px 0;
  font-size: 14px;
}

.doc-service-title {
  margin: 0 0 12px;
  font-size: 18px;
  color: #0f172a;
}

.doc-items {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  font-size: 13px;
}

.doc-items th {
  background: #0f172a;
  color: white;
  border: 1px solid #334155;
  padding: 9px 10px;
  text-align: left;
  font-size: 14px;
}

.doc-items th:not(:first-child),
.doc-items td:not(:first-child) {
  text-align: right;
}

.doc-items td {
  border: 1px solid #94a3b8;
  padding: 10px;
  vertical-align: top;
  min-height: 42px;
}

.doc-items th:first-child {
  width: 46%;
}

.doc-totals {
  width: 245px;
  margin-left: auto;
  margin-top: 12px;
  border: 1px solid #94a3b8;
  font-size: 14px;
}

.doc-totals p {
  display: flex;
  justify-content: space-between;
  margin: 0;
  padding: 8px 10px;
  border-bottom: 1px solid #cbd5e1;
}

.doc-totals p:last-child {
  border-bottom: 0;
}

.doc-grand-total {
  background: #0f172a;
  color: #ffffff;
  font-size: 16px;
  font-weight: 900;
}

.doc-terms {
  margin-top: 28px;
  font-size: 13px;
  line-height: 1.45;
}

.doc-terms p {
  margin: 0 0 10px;
}

.doc-terms b {
  color: #0f172a;
}

.doc-footer {
  margin-top: 24px;
  border-top: 1px solid #0f172a;
  padding-top: 12px;
  text-align: center;
  font-weight: 900;
  color: #0f172a;
}

@media (max-width: 900px) {
  .app-screen section > div {
    display: block !important;
  }

  .mobile-menu-button {
    display: inline-flex !important;
    align-items: center;
    gap: 6px;
  }

  .mobile-close-button {
    display: block !important;
  }

  aside {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 82vw !important;
    max-width: 330px !important;
    height: 100vh !important;
    min-height: 100vh !important;
    z-index: 10001 !important;
    border-radius: 0 18px 18px 0 !important;
    overflow-y: auto !important;
    transform: translateX(-110%);
    transition: transform 0.2s ease;
    margin: 0 !important;
  }

  aside.sidebar-open {
    transform: translateX(0);
  }

  .bottom-nav {
    display: flex !important;
  }
}


.email-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.68);
  z-index: 100000;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 18px;
  box-sizing: border-box;
}

.email-modal {
  width: min(1450px, 100%);
  max-height: calc(100vh - 36px);
  background: white;
  border-radius: 16px;
  overflow: hidden;
  display: grid;
  grid-template-columns: minmax(430px, 0.9fr) minmax(520px, 1.1fr);
  box-shadow: 0 24px 80px rgba(0,0,0,0.35);
  font-family: Arial, sans-serif;
}

.email-modal-left {
  padding: 26px;
  overflow: auto;
  border-right: 1px solid #e5e7eb;
  background: #ffffff;
}

.email-modal-left h2 {
  margin: 0 0 18px;
  color: #0f172a;
  font-size: 24px;
}

.email-label {
  display: block;
  font-weight: 800;
  color: #334155;
  margin: 12px 0 6px;
  font-size: 14px;
}

.email-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 12px;
  font-size: 15px;
}

.email-textarea {
  width: 100%;
  min-height: 360px;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 14px;
  font-size: 15px;
  line-height: 1.55;
  resize: vertical;
}

.email-attachment {
  margin-top: 12px;
  background: #f8fafc;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  padding: 11px 13px;
  display: flex;
  gap: 10px;
  align-items: center;
  color: #1e40af;
}

.email-attachment span {
  background: #2563eb;
  color: white;
  border-radius: 6px;
  padding: 2px 6px;
}

.email-actions {
  display: flex;
  gap: 10px;
  margin-top: 22px;
}

.email-send-btn {
  background: #2563eb;
  color: white;
  border: 0;
  border-radius: 10px;
  padding: 12px 24px;
  font-weight: 900;
  cursor: pointer;
}

.email-cancel-btn {
  background: #f8fafc;
  color: #0f172a;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 12px 24px;
  font-weight: 900;
  cursor: pointer;
}

.email-modal-right {
  background: #263238;
  color: white;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.email-preview-header {
  height: 52px;
  background: #1f2937;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
  font-size: 14px;
}

.email-preview-header span {
  color: #cbd5e1;
  font-size: 12px;
}

.email-pdf-preview {
  flex: 1;
  overflow: auto;
  padding: 24px;
  display: flex;
  justify-content: center;
}

.mini-doc {
  width: 520px;
  min-height: 690px;
  background: white;
  color: #0f172a;
  padding: 34px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.35);
  font-family: Arial, sans-serif;
}

.mini-logo-row {
  display: flex;
  align-items: center;
  gap: 18px;
}

.mini-logo-row img {
  width: 78px;
  height: 78px;
  object-fit: contain;
}

.mini-logo-row h3 {
  margin: 0;
  font-size: 30px;
}

.mini-logo-row p {
  margin: 4px 0 0;
}

.mini-line {
  border-top: 3px solid #0f172a;
  margin: 18px 0;
}

.mini-message {
  margin-top: 22px;
  border-top: 1px solid #e5e7eb;
  padding-top: 18px;
  line-height: 1.55;
  color: #334155;
}

@media (max-width: 900px) {
  .email-modal {
    grid-template-columns: 1fr;
  }

  .email-modal-right {
    display: none;
  }
}

`;
