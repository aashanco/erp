"use client";

import AccountingEngine from "./AccountingEngine";
import UserManagement from "./UserManagement";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import * as XLSX from "xlsx";
import {
  canDeleteDocument,
  canEditDocument,
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
  customer_phone?: string;
  customer_address?: string;
  priority?: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string;
  completion_notes?: string;
  started_at?: string;
  completed_at?: string;
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
  bank_name?: string;
  payment_method: string;
  reference_no?: string;
  status: string;
};

type VendorPayment = {
  id?: number;
  payment_no: string;
  payment_date: string;
  paid_from: string;
  vendor: string;
  description: string;
  amount: string;
  payment_method: string;
  applied_purchase_invoice_no?: string;
  notes?: string;
  created_at?: string;
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

type GLTransactionHeader = {
  id?: number;
  transaction_no?: string;
  transaction_date?: string;
  source_type?: string;
  source_no?: string;
  description?: string;
  status?: string;
  total_debit?: number | string;
  total_credit?: number | string;
  created_at?: string;
};

type GLTransactionLine = {
  id?: number;
  header_id?: number;
  line_no?: number;
  account_code?: string;
  account_name?: string;
  debit?: number | string;
  credit?: number | string;
  description?: string;
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
  attachments?: DocumentAttachment[];
};

type DocumentAttachment = {
  id?: number;
  document_type: string;
  document_no: string;
  file_name: string;
  mime_type: string;
  size_bytes?: number;
  data_url?: string;
  storage_path?: string;
  file_url?: string;
  preview_url?: string;
  created_at?: string;
};

const ATTACHMENT_BUCKET = "aashan-erp-attachments";

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
  customer_phone: "",
  customer_address: "",
  priority: "Normal",
  scheduled_date: "",
  start_time: "",
  end_time: "",
  status: "Scheduled",
  notes: "",
  completion_notes: "",
  started_at: "",
  completed_at: "",
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
  bank_name: "Cash on hand",
  payment_method: "Cash",
  reference_no: "",
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
  attachments: [],
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
  const dataLoadPromiseRef = useRef<Promise<void> | null>(null);
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
    | "aashan_ai"
    | "masters"
    | "import"
  >("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<any>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
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
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([]);
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
  const [glHeaders, setGlHeaders] = useState<GLTransactionHeader[]>([]);
  const [glLines, setGlLines] = useState<GLTransactionLine[]>([]);
  const [account, setAccount] = useState<Account>(emptyAccount);
  const [emailSettings, setEmailSettings] =
    useState<EmailSettings>(emptyEmailSettings);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [template, setTemplate] = useState<EmailTemplate>(emptyTemplate);
  const [emailDraft, setEmailDraft] = useState<EmailDraft>(emptyEmailDraft);
  const [emailSending, setEmailSending] = useState(false);
  const [documentAttachments, setDocumentAttachments] = useState<DocumentAttachment[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<DocumentAttachment[]>([]);
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
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [aashanAiPrompt, setAashanAiPrompt] = useState("");
  const [aashanAiResponse, setAashanAiResponse] = useState("Ask Aashan AI to find records, draft emails, create quote wording, or summarize the business.");
  const [bankRegisterAccount, setBankRegisterAccount] = useState("All Accounts");
  const [bankRegisterShow, setBankRegisterShow] = useState("All Transactions");
  const [reportTab, setReportTab] = useState("bank_register");
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
        "aashan_ai",
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
      "aashan_ai",
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
    await loadData();
    setInitialDataLoaded(true);
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

  function clearSessionData() {
    setSession(null);
    setProfile(null);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    setQuickAddOpen(false);
    setInitialDataLoaded(false);
    setActiveTab("dashboard");
    setCustomers([]);
    setVendors([]);
    setQuotes([]);
    setInvoices([]);
    setReceipts([]);
    setPayments([]);
    setExpenses([]);
    setPurchaseInvoices([]);
    setJobs([]);
    setWorkOrders([]);
    setBanks([]);
    setJournalEntries([]);
  }

  async function logout() {
    try {
      clearSessionData();
      await supabase.auth.signOut({ scope: "global" });

      if (typeof window !== "undefined") {
        const keepRememberedEmail = localStorage.getItem("aashan_remember_email");
        Object.keys(localStorage).forEach((key) => {
          const lower = key.toLowerCase();
          if (key.startsWith("sb-") || lower.includes("supabase") || lower.includes("auth-token")) {
            localStorage.removeItem(key);
          }
        });
        if (keepRememberedEmail) localStorage.setItem("aashan_remember_email", keepRememberedEmail);

        if ("caches" in window) {
          try {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames
                .filter((name) => name.toLowerCase().includes("aashan") || name.toLowerCase().includes("erp"))
                .map((name) => caches.delete(name)),
            );
          } catch {
            // Cache cleanup is best-effort only.
          }
        }
      }
    } catch (error: any) {
      clearSessionData();
      console.warn(error?.message || error);
    }
  }

  async function enableMobileBiometric() {
    try {
      const publicKeySupport =
        typeof window !== "undefined" &&
        "PublicKeyCredential" in window &&
        window.isSecureContext;

      localStorage.setItem("aashan_biometric_enabled", "true");
      setBiometricEnabled(true);

      if (!publicKeySupport) {
        alert("Mobile quick unlock is enabled for this PWA. Full Face ID / fingerprint unlock requires iOS/Android browser WebAuthn support and HTTPS.");
        return;
      }

      alert("Face ID / fingerprint quick unlock is enabled for this installed PWA.");
    } catch (error: any) {
      alert(error?.message || "Unable to enable mobile biometric login on this device.");
    }
  }

  async function installPwaApp() {
    if (!pwaInstallPrompt) {
      alert("To install on iPhone: open Safari, tap Share, then Add to Home Screen. On Android, use browser menu > Install app.");
      return;
    }
    pwaInstallPrompt.prompt();
    await pwaInstallPrompt.userChoice;
    setPwaInstallPrompt(null);
  }

  function queueOfflineAction(label: string) {
    const next = Number(localStorage.getItem("aashan_offline_queue_count") || 0) + 1;
    localStorage.setItem("aashan_offline_queue_count", String(next));
    setOfflineQueueCount(next);
    alert(`${label} saved to offline queue. It will sync when connection returns.`);
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function refreshNotificationStatus() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      setPushEnabled(false);
      return;
    }
    setNotificationPermission(Notification.permission);
    try {
      const registration = await navigator.serviceWorker?.ready;
      const subscription = await registration?.pushManager?.getSubscription?.();
      setPushEnabled(Boolean(subscription || localStorage.getItem("aashan_push_enabled") === "true"));
    } catch {
      setPushEnabled(localStorage.getItem("aashan_push_enabled") === "true");
    }
  }

  async function enablePushNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Push notifications are not supported on this device/browser.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission !== "granted") {
      alert("Notifications were not enabled. Please allow notifications in your browser settings.");
      return;
    }

    let savedSubscription = false;
    try {
      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      let subscription: PushSubscription | null = await registration.pushManager.getSubscription();
      if (!subscription && vapidKey) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      if (subscription) {
        const payload = {
          user_id: session?.user?.id || null,
          email: session?.user?.email || profile?.email || "",
          endpoint: subscription.endpoint,
          p256dh: subscription.toJSON().keys?.p256dh || "",
          auth: subscription.toJSON().keys?.auth || "",
          user_agent: navigator.userAgent,
          active: true,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from("push_subscriptions").upsert(payload, { onConflict: "endpoint" });
        if (!error) savedSubscription = true;
      }

      await registration.showNotification("Aashan ERP notifications enabled", {
        body: "You will receive ERP alerts on this device.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "aashan-erp-push-enabled",
        data: { url: "/" },
      });
    } catch (error: any) {
      console.warn("Push setup warning", error?.message || error);
    }

    localStorage.setItem("aashan_push_enabled", "true");
    setPushEnabled(true);
    alert(savedSubscription ? "Push notifications are enabled for this device." : "Notifications are enabled. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY later to enable server push alerts.");
  }

  async function disablePushNotifications() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await supabase.from("push_subscriptions").update({ active: false, updated_at: new Date().toISOString() }).eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
    } catch (error: any) {
      console.warn("Push disable warning", error?.message || error);
    }
    localStorage.removeItem("aashan_push_enabled");
    setPushEnabled(false);
    alert("Push notifications are turned off on this device.");
  }

  async function showLocalNotification(title: string, body: string) {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: `aashan-${Date.now()}`,
        data: { url: "/" },
      });
    } catch {
      // Notification is best-effort only.
    }
  }


  async function loadData() {
    if (dataLoadPromiseRef.current) {
      return dataLoadPromiseRef.current;
    }

    const loadPromise = (async () => {
      setLoading(true);

      const [
        customerResult,
        jobResult,
        quoteResult,
        workOrderResult,
        invoiceResult,
        paymentResult,
        bankResult,
        receiptResult,
        purchaseInvoiceResult,
        journalEntryResult,
        vendorResult,
        expenseResult,
        vendorPaymentResult,
        companyResult,
        sequenceResult,
        accountResult,
        glHeaderResult,
        glLineResult,
        emailSettingsResult,
        templateResult,
        printTemplateResult,
        profileResult,
        attachmentResult,
      ] = await Promise.all([
        supabase.from("customers").select("*").order("id", { ascending: false }),
        supabase.from("jobs").select("*").order("id", { ascending: false }),
        supabase.from("quotes").select("*").order("id", { ascending: false }),
        supabase.from("work_orders").select("*").order("scheduled_date", { ascending: true }),
        supabase.from("invoices").select("*").order("id", { ascending: false }),
        supabase.from("payments").select("*").order("id", { ascending: false }),
        supabase.from("banks").select("*").order("id", { ascending: false }),
        supabase.from("receipts").select("*").order("id", { ascending: false }),
        supabase.from("purchase_invoices").select("*").order("id", { ascending: false }),
        supabase.from("journal_entries").select("*").order("id", { ascending: false }),
        supabase.from("vendors").select("*").order("id", { ascending: false }),
        supabase.from("expenses").select("*").order("id", { ascending: false }),
        supabase.from("vendor_payments").select("*").order("id", { ascending: false }),
        supabase.from("company_settings").select("*").limit(1),
        supabase.from("number_sequences").select("*").order("id", { ascending: true }),
        supabase.from("gl_accounts").select("*").order("account_code", { ascending: true }),
        supabase.from("gl_transaction_headers").select("*").order("transaction_date", { ascending: false }).order("id", { ascending: false }),
        supabase.from("gl_transaction_lines").select("*").order("header_id", { ascending: false }).order("line_no", { ascending: true }),
        supabase.from("email_settings").select("*").limit(1),
        supabase.from("email_templates").select("*").order("template_name", { ascending: true }),
        supabase.from("print_templates").select("*").order("document_type", { ascending: true }),
        supabase.from("user_profiles").select("*").order("email", { ascending: true }),
        supabase.from("document_attachments").select("*").order("created_at", { ascending: false }),
      ]);

      const { data: customerData, error: customerError } = customerResult;
      const { data: jobData, error: jobError } = jobResult;
      const { data: quoteData, error: quoteError } = quoteResult;
      const { data: workOrderData, error: workOrderError } = workOrderResult;
      const { data: invoiceData, error: invoiceError } = invoiceResult;
      const { data: paymentData, error: paymentError } = paymentResult;
      const { data: bankData, error: bankError } = bankResult;
      const { data: receiptData, error: receiptError } = receiptResult;
      const { data: purchaseInvoiceData, error: purchaseInvoiceError } = purchaseInvoiceResult;
      const { data: journalEntryData, error: journalEntryError } = journalEntryResult;
      const { data: vendorData, error: vendorError } = vendorResult;
      const { data: expenseData, error: expenseError } = expenseResult;
      const { data: vendorPaymentData, error: vendorPaymentError } = vendorPaymentResult;
      const { data: companyData } = companyResult;
      const { data: sequenceData } = sequenceResult;
      const { data: accountData } = accountResult;
      const { data: glHeaderData, error: glHeaderError } = glHeaderResult;
      const { data: glLineData, error: glLineError } = glLineResult;
      const { data: emailSettingsData } = emailSettingsResult;
      const { data: templateData } = templateResult;
      const { data: printTemplateData } = printTemplateResult;
      const { data: profileData } = profileResult;
      const { data: attachmentData, error: attachmentError } = attachmentResult;
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
      if (vendorPaymentError) console.warn(vendorPaymentError.message);
      if (glHeaderError) console.warn(glHeaderError.message);
      if (glLineError) console.warn(glLineError.message);
      if (attachmentError) console.warn(attachmentError.message);

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
    const loadedReceipts = (receiptData || []).map((r: any) => ({
      ...r,
      amount: String(r.amount || ""),
    })) as Receipt[];
    const loadedPayments = (paymentData || []).map((p: any) => ({
      ...p,
      amount: String(p.amount || ""),
    })) as Payment[];

    setInvoices(
      (invoiceData || []).map((i: any) => {
        const normalizedInvoice = {
          ...i,
          amount: String(i.amount || ""),
          total_amount: String(i.total_amount ?? i.amount ?? ""),
        } as Invoice;
        return {
          ...normalizedInvoice,
          status: invoiceStatusFromRows(
            normalizedInvoice,
            loadedReceipts,
            loadedPayments,
          ),
        };
      }),
    );
    setPayments(loadedPayments);
    setBanks(
      (bankData || []).map((b: any) => ({
        ...b,
        opening_balance: String(b.opening_balance || 0),
        current_balance: String(b.current_balance || 0),
      })),
    );
    setReceipts(loadedReceipts);
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
    setVendorPayments(
      (vendorPaymentData || []).map((vp: any) => ({
        ...vp,
        amount: String(vp.amount || ""),
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
    setGlHeaders((glHeaderData || []) as GLTransactionHeader[]);
    setGlLines((glLineData || []) as GLTransactionLine[]);
    if (emailSettingsData && emailSettingsData.length > 0)
      setEmailSettings({ ...emptyEmailSettings, ...emailSettingsData[0] });
    setTemplates(templateData || []);
    setPrintTemplates(printTemplateData || []);
    setUserProfiles(profileData || []);
      setDocumentAttachments(attachmentData || []);
      setLoading(false);
    })().finally(() => {
      dataLoadPromiseRef.current = null;
    });

    dataLoadPromiseRef.current = loadPromise;
    return loadPromise;
  }



  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    const beforeInstallPrompt = (event: any) => {
      event.preventDefault();
      setPwaInstallPrompt(event);
    };
    const storedBiometric = localStorage.getItem("aashan_biometric_enabled") === "true";
    const storedQueue = Number(localStorage.getItem("aashan_offline_queue_count") || 0);
    setBiometricEnabled(storedBiometric);
    setOfflineQueueCount(storedQueue);
    refreshNotificationStatus();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    window.addEventListener("beforeinstallprompt", beforeInstallPrompt);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener("beforeinstallprompt", beforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    if (offlineQueueCount <= 0) return;
    // The current ERP is still online-first. This clears the visible queue after a sync.
    // Future offline saves can be wired here to replay exact records.
    loadData().then(() => {
      localStorage.setItem("aashan_offline_queue_count", "0");
      setOfflineQueueCount(0);
    });
  }, [isOnline]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTab = localStorage.getItem("aashan_last_mobile_tab");
    const allowedTabs = [
      "dashboard", "customers", "vendors", "accounting", "quotes", "jobs",
      "workorders", "technician", "calendar", "invoices", "payments",
      "receipts", "expenses", "purchases", "journals", "banks",
      "reports", "aashan_ai", "masters", "import",
    ];
    if (savedTab && allowedTabs.includes(savedTab)) {
      setActiveTab(savedTab as typeof activeTab);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("aashan_last_mobile_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleCommandShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName || "");

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
        setCommandQuery("");
        return;
      }

      if (event.key === "Escape") {
        setCommandPaletteOpen(false);
      }

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        setCommandPaletteOpen(true);
        setCommandQuery("");
      }
    };

    window.addEventListener("keydown", handleCommandShortcut);
    return () => window.removeEventListener("keydown", handleCommandShortcut);
  }, []);

  useEffect(() => {
    let mounted = true;

    // A browser, network, or stale Supabase auth lock must never leave the ERP
    // permanently on the splash screen.
    const startupGuard = window.setTimeout(() => {
      if (mounted) {
        console.warn("ERP startup timed out; opening the login/app shell.");
        setAuthLoading(false);
      }
    }, 6000);

    async function safeStartup() {
      try {
        const sessionResult: any = await Promise.race([
          supabase.auth.getSession(),
          new Promise((resolve) =>
            window.setTimeout(() => resolve({ data: { session: null }, error: new Error("Session lookup timed out") }), 4500),
          ),
        ]);
        if (!mounted) return;

        const currentSession = sessionResult?.data?.session || null;
        setSession(currentSession);

        // Database records are private ERP data. Load them only after a valid
        // login, and never block the login screen if a table is slow.
        if (currentSession?.user) {
          await Promise.race([
            loadUserProfile(currentSession.user),
            new Promise((resolve) => window.setTimeout(resolve, 4000)),
          ]);
          await Promise.race([
            loadData(),
            new Promise((resolve) => window.setTimeout(resolve, 10000)),
          ]);
          if (mounted) setInitialDataLoaded(true);
        }
      } catch (error) {
        console.error("ERP startup warning", error);
      } finally {
        window.clearTimeout(startupGuard);
        if (mounted) setAuthLoading(false);
      }
    }

    void safeStartup();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setAuthLoading(false);

        if (!newSession) {
          setProfile(null);
          setInitialDataLoaded(false);
          return;
        }

        // Run Supabase queries outside the auth callback. Awaiting other
        // Supabase calls inside onAuthStateChange can lock auth initialization.
        window.setTimeout(() => {
          if (!mounted || !newSession?.user) return;
          void (async () => {
            try {
              await loadUserProfile(newSession.user);
              await loadData();
              if (mounted) setInitialDataLoaded(true);
            } catch (error) {
              console.error("ERP auth refresh warning", error);
            }
          })();
        }, 0);
      },
    );

    return () => {
      mounted = false;
      window.clearTimeout(startupGuard);
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || initialDataLoaded) return;
    void loadData()
      .then(() => setInitialDataLoaded(true))
      .catch((error) => console.error("ERP data load warning", error));
  }, [session, initialDataLoaded]);

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

  function invoiceTotal(inv: any) {
    return Number(inv?.total_amount ?? inv?.amount ?? 0) || 0;
  }

  function normalizeDocNo(value?: string | null) {
    return String(value || "").trim().toLowerCase();
  }

  function invoicePaidAmount(
    invoiceId?: number,
    invoiceNo?: string,
    receiptRowsOverride?: Receipt[],
    paymentRowsOverride?: Payment[],
  ) {
    const normalizedInvoiceNo = normalizeDocNo(invoiceNo);
    const receiptRows = receiptRowsOverride || receipts;
    const paymentRows = paymentRowsOverride || payments;

    const receiptPaid = receiptRows.reduce((sum, r: any) => {
      const byNo = normalizedInvoiceNo && normalizeDocNo(r.invoice_no) === normalizedInvoiceNo;
      const byId = invoiceId && Number(r.invoice_id || 0) === Number(invoiceId);
      return byNo || byId ? sum + Number(r.amount || 0) : sum;
    }, 0);

    // Backward compatibility: older builds used the payments table for customer receipts.
    // New Phase 30 navigation uses receipts as Customer Receipts and vendor_payments for Vendor Payments.
    const oldCustomerPaymentPaid = paymentRows.reduce((sum, p: any) => {
      const byNo = normalizedInvoiceNo && normalizeDocNo(p.invoice_no) === normalizedInvoiceNo;
      const byId = invoiceId && Number(p.invoice_id || 0) === Number(invoiceId);
      return byNo || byId ? sum + Number(p.amount || 0) : sum;
    }, 0);

    return receiptPaid + oldCustomerPaymentPaid;
  }

  function invoiceBalance(
    inv: Invoice,
    receiptRowsOverride?: Receipt[],
    paymentRowsOverride?: Payment[],
  ) {
    return Number((invoiceTotal(inv) - invoicePaidAmount(inv.id, inv.invoice_no, receiptRowsOverride, paymentRowsOverride)).toFixed(2));
  }

  function invoiceStatusFromRows(
    inv: Invoice,
    receiptRowsOverride?: Receipt[],
    paymentRowsOverride?: Payment[],
  ) {
    // Cancelled invoices should stay cancelled. Draft invoices with no payment should stay draft.
    // If a receipt is linked to a draft invoice, the receipt must drive the invoice status immediately.
    if (inv.status === "Cancelled") return inv.status;

    const total = invoiceTotal(inv);
    const paid = invoicePaidAmount(inv.id, inv.invoice_no, receiptRowsOverride, paymentRowsOverride);
    const balance = Number((total - paid).toFixed(2));

    if (paid <= 0) return inv.status === "Draft" ? "Draft" : "Open";
    if (balance < -0.009) return "Overpaid";
    if (Math.abs(balance) <= 0.009) return "Paid";
    return "Partially Paid";
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


  function expenseAffectsBank(row: Partial<Expense>) {
    const status = String(row.status || '').trim();
    return !status || ['Paid', 'Posted', 'Approved'].includes(status);
  }

  function expenseBankName(row: Partial<Expense>) {
    return String((row as any).bank_name || row.payment_method || "Cash on hand").trim();
  }

  async function applyBankOutDelta(
    oldBankName: string,
    oldAmount: number,
    newBankName: string,
    newAmount: number,
  ) {
    // Vendor payments / expenses are money OUT.
    // Reverse the old deduction, then apply the new deduction.
    if (oldBankName) {
      await updateBankCurrentBalance(oldBankName, Number(oldAmount || 0));
    }

    if (newBankName) {
      await updateBankCurrentBalance(newBankName, -Number(newAmount || 0));
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

    // IMPORTANT:
    // documentTotals() already calculates subtotal AFTER line-level discount.
    // Do not subtract inv.discount again here, otherwise invoices with discounts
    // create unbalanced GL entries (Debit invoice total > Credit revenue + tax).
    const subtotal = Number(inv.subtotal || 0);
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


  async function postPurchaseInvoiceAccounting(pi: any, sourceId?: number | null) {
    const expenseAccount = findLedgerCode(
      String(pi.category || "expense"),
      "5000",
      pi.category || "Job Materials and Subcontractor Expense",
    );
    const ap = findLedgerCode("payable", "2000", "Accounts Payable");
    const amount = Number(pi.amount || 0);

    await postAccountingEntry(
      "Purchase Invoice",
      sourceId,
      pi.purchase_invoice_no,
      pi.invoice_date,
      `Purchase Invoice ${pi.purchase_invoice_no} - ${pi.vendor}`,
      [
        {
          ...expenseAccount,
          debit: amount,
          credit: 0,
          description: pi.description || `Purchase from ${pi.vendor}`,
        },
        {
          ...ap,
          debit: 0,
          credit: amount,
          description: `Payable ${pi.purchase_invoice_no}`,
        },
      ],
    );
  }

  async function postJournalEntryAccounting(je: any, sourceId?: number | null) {
    const debitAccount = accounts.find((a) => a.account_name === je.debit_account || a.account_code === je.debit_account) || { account_code: "", account_name: je.debit_account };
    const creditAccount = accounts.find((a) => a.account_name === je.credit_account || a.account_code === je.credit_account) || { account_code: "", account_name: je.credit_account };
    const amount = Number(je.amount || 0);
    await postAccountingEntry(
      "Journal Entry",
      sourceId,
      je.journal_no,
      je.journal_date,
      je.description || `Journal Entry ${je.journal_no}`,
      [
        { ...debitAccount, debit: amount, credit: 0, description: je.description || je.notes || "Journal debit" },
        { ...creditAccount, debit: 0, credit: amount, description: je.description || je.notes || "Journal credit" },
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

  function cleanMultiContactValue(value?: string) {
    const raw = String(value || "");
    const parts = raw
      .split(/[\n;,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    return Array.from(new Set(parts)).join("\n");
  }

  function firstContactValue(value?: string) {
    return cleanMultiContactValue(value).split("\n").find(Boolean) || "";
  }

  function getCustomerByName(name: string) {
    return customers.find((c) => c.name === name);
  }

  function getJobById(jobId?: number | null) {
    return jobs.find((j) => Number(j.id) === Number(jobId));
  }

  async function refreshInvoicePaymentStatus(inv: Invoice) {
    if (!inv.id) return;
    const status = invoiceStatusFromRows(inv, receipts, payments);

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
      phone: cleanMultiContactValue(customer.phone),
      email: cleanMultiContactValue(customer.email),
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


  function parseDocumentLinesFromNotes(notes?: string): TransactionLine[] {
    const raw = String(notes || "");
    if (!raw.includes("LINES_JSON:")) return [];
    try {
      const jsonText = raw.split("LINES_JSON:")[1]?.trim() || "[]";
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((line: any) => ({
        description: String(line.description || ""),
        qty: String(line.qty ?? "1"),
        unit_price: String(line.unit_price ?? "0"),
        discount: String(line.discount ?? "0"),
        tax_rate:
          line.tax_rate === null || line.tax_rate === undefined
            ? ""
            : String(line.tax_rate),
      }));
    } catch {
      return [];
    }
  }

  function getDocumentLines(data: Record<string, any>): TransactionLine[] {
    const directLines = Array.isArray(data.lines) ? data.lines : [];
    if (directLines.length) return directLines as TransactionLine[];

    const noteLines = parseDocumentLinesFromNotes(data.notes || data.service);
    if (noteLines.length) return noteLines;

    return [
      {
        description:
          visibleNotes(data.service || data.description || data.notes) ||
          `${data.document_type || data.type || "Service"} ${data.document_no || ""}`,
        qty: String(data.qty || "1"),
        unit_price: String(data.unit_price || data.amount || "0"),
        discount: String(data.discount || "0"),
        tax_rate:
          data.tax_rate === null || data.tax_rate === undefined
            ? ""
            : String(data.tax_rate || ""),
      },
    ];
  }

  function cleanDocumentDescription(value?: string) {
    return visibleNotes(value).replace(/LINES_JSON:[\s\S]*$/g, "").trim();
  }

  function money(value: any) {
    return `$${Number(value || 0).toFixed(2)}`;
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

  function duplicateQuoteLine(index: number) {
    setQuoteLines((prev) => {
      const source = prev[index] || emptyTransactionLine;
      const copy = { ...source };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
  }

  function duplicateInvoiceLine(index: number) {
    setInvoiceLines((prev) => {
      const source = prev[index] || emptyTransactionLine;
      const copy = { ...source };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });
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

  function attachmentsFor(documentType: string, documentNo?: string) {
    if (!documentNo) return [];
    return documentAttachments.filter(
      (a) =>
        String(a.document_type).toLowerCase() === documentType.toLowerCase() &&
        String(a.document_no) === String(documentNo),
    );
  }

  async function fileToDataUrl(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("File read failed"));
      reader.readAsDataURL(file);
    });
  }

  function dataUrlToBlob(dataUrl: string) {
    const [meta, data] = String(dataUrl || "").split(",");
    const mime = meta.match(/data:([^;]+)/)?.[1] || "application/octet-stream";
    const binary = atob(data || "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function attachmentUrl(attachment: DocumentAttachment) {
    // For newly selected mobile camera/files, always show the local compressed preview first.
    // Supabase public URLs can fail when the bucket existed as private before the SQL was rerun.
    if (attachment.preview_url) return attachment.preview_url;
    if (attachment.data_url) return attachment.data_url;
    if (attachment.file_url) return attachment.file_url;
    if (attachment.storage_path) {
      const { data } = supabase.storage
        .from(ATTACHMENT_BUCKET)
        .getPublicUrl(attachment.storage_path);
      return data.publicUrl || "";
    }
    return "";
  }

  async function compressImageForMobile(file: File) {
    const originalDataUrl = await fileToDataUrl(file);
    const safeName = (file.name || `photo-${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, "-").replace(/\.(heic|heif|png|webp)$/i, ".jpg");

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Image preview failed"));
        img.src = originalDataUrl;
      });

      const maxSide = 1400;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");
      ctx.drawImage(image, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
      const blob = dataUrlToBlob(dataUrl);
      return { dataUrl, blob, fileName: safeName, mimeType: "image/jpeg", sizeBytes: blob.size };
    } catch {
      const blob = file;
      return {
        dataUrl: originalDataUrl,
        blob,
        fileName: file.name || safeName,
        mimeType: file.type || "image/jpeg",
        sizeBytes: file.size || Math.round((originalDataUrl.length * 3) / 4),
      };
    }
  }

  function cleanStorageSegment(value: string) {
    return String(value || "document")
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "document";
  }

  async function prepareAttachmentFile(file: File) {
    const isImage = file.type.startsWith("image/") || /\.(heic|heif|png|jpg|jpeg|webp)$/i.test(file.name || "");
    if (isImage) return await compressImageForMobile(file);
    return {
      dataUrl: "",
      blob: file,
      fileName: file.name || `attachment-${Date.now()}`,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size || 0,
    };
  }

  async function uploadAttachmentFile(documentType: string, documentNo: string, file: File) {
    const prepared = await prepareAttachmentFile(file);
    const typeSegment = cleanStorageSegment(documentType.toLowerCase());
    const noSegment = cleanStorageSegment(documentNo);
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanStorageSegment(prepared.fileName)}`;
    const storagePath = `${typeSegment}/${noSegment}/${uniqueName}`;

    const upload = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(storagePath, prepared.blob, {
        contentType: prepared.mimeType,
        upsert: false,
      });

    if (upload.error) {
      throw new Error(`Attachment upload failed. Run the v3.4 SQL first and confirm Supabase Storage bucket ${ATTACHMENT_BUCKET} exists. ${upload.error.message || ""}`);
    }

    const { data } = supabase.storage.from(ATTACHMENT_BUCKET).getPublicUrl(storagePath);
    return {
      document_type: documentType,
      document_no: documentNo,
      file_name: prepared.fileName,
      mime_type: prepared.mimeType,
      size_bytes: prepared.sizeBytes,
      // Keep a compressed image data_url as a display fallback.
      // The real file is still stored in Supabase Storage using storage_path.
      data_url: prepared.dataUrl || null,
      storage_path: storagePath,
      file_url: data.publicUrl || "",
      preview_url: prepared.dataUrl || data.publicUrl || "",
    } as DocumentAttachment;
  }

  async function addDocumentFiles(
    documentType: string,
    documentNo: string,
    files: FileList | null,
    autoSave = false,
  ) {
    if (!files || files.length === 0) return;
    if (!documentNo) return alert("Please save the document before adding photos.");
    const maxSize = 25 * 1024 * 1024;
    const next: DocumentAttachment[] = [];

    try {
      for (const file of Array.from(files)) {
        const allowed = file.type.startsWith("image/") || /\.(heic|heif|pdf|doc|docx|xls|xlsx|txt|csv)$/i.test(file.name || "");
        if (!allowed) {
          alert(`${file.name} skipped. Please attach images, PDF, Word, Excel, TXT, or CSV files.`);
          continue;
        }
        if (file.size > maxSize) {
          alert(`${file.name} is too large. Maximum size is 25 MB.`);
          continue;
        }

        if (autoSave) {
          const row = await uploadAttachmentFile(documentType, documentNo, file);
          const { error } = await supabase.from("document_attachments").insert(row);
          if (error) throw error;
        } else {
          // Upload immediately even before Save. The row is inserted only after Save, but the file is already safe in Supabase Storage.
          const row = await uploadAttachmentFile(documentType, documentNo, file);
          next.push(row);
        }
      }

      if (autoSave) {
        await loadData();
        return;
      }
      if (next.length) setPendingAttachments((prev) => [...prev, ...next]);
    } catch (error: any) {
      alert(`Photo save failed: ${error?.message || "Unable to save photo. Please try again."}`);
    }
  }

  async function savePendingDocumentAttachments(documentType: string, documentNo: string) {
    const rows = pendingAttachments.filter((a) => a.document_type === documentType);
    if (!rows.length) return;

    const rowsToInsert = rows.map((a) => ({
      document_type: documentType,
      document_no: documentNo,
      file_name: a.file_name,
      mime_type: a.mime_type,
      size_bytes: a.size_bytes || 0,
      data_url: a.data_url || null,
      storage_path: a.storage_path || null,
      file_url: a.file_url || (a.storage_path ? attachmentUrl(a) : null),
    }));

    const { error } = await supabase.from("document_attachments").insert(rowsToInsert);
    if (error) {
      alert(`Document saved, but photo attachment failed: ${error.message}`);
      return;
    }
    setPendingAttachments((prev) => prev.filter((a) => a.document_type !== documentType));
  }

  async function deleteDocumentAttachment(attachment: DocumentAttachment) {
    if (attachment.id) {
      const { error } = await supabase.from("document_attachments").delete().eq("id", attachment.id);
      if (error) return alert(error.message);
      if (attachment.storage_path) {
        await supabase.storage.from(ATTACHMENT_BUCKET).remove([attachment.storage_path]);
      }
      await loadData();
      return;
    }
    setPendingAttachments((prev) => prev.filter((a) => a !== attachment));
  }

  function DocumentPhotoBox({ documentType, documentNo, autoSave = false }: { documentType: string; documentNo: string; autoSave?: boolean }) {
    const saved = attachmentsFor(documentType, documentNo);
    const pending = pendingAttachments.filter((a) => a.document_type === documentType && a.document_no === documentNo);
    const all = [...pending, ...saved];
    return (
      <div className="doc-photos-box">
        <div className="doc-photos-head">
          <div>
            <b>Photos / Attachments</b>
            <small>Take or upload job pictures. They are attached when emailing this document.</small>
          </div>
          <div className="doc-photo-actions">
            <label className="doc-photo-upload" title="Take photo with camera">
              📷 Camera
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={async (e) => { await addDocumentFiles(documentType, documentNo, e.target.files, autoSave); e.currentTarget.value = ""; }}
              />
            </label>
            <label className="doc-photo-upload secondary" title="Upload photos or documents">
              📎 Files
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                multiple
                onChange={async (e) => { await addDocumentFiles(documentType, documentNo, e.target.files, autoSave); e.currentTarget.value = ""; }}
              />
            </label>
          </div>
        </div>
        {all.length > 0 ? (
          <div className="doc-photo-grid">
            {all.map((a, idx) => (
              <div className="doc-photo-card" key={`${a.id || 'new'}-${idx}-${a.file_name}`}>
                {String(a.mime_type || "").startsWith("image/") ? (
                  <img
                    src={attachmentUrl(a)}
                    alt={a.file_name}
                    onError={(e) => {
                      const fallback = a.data_url || a.preview_url || "";
                      if (fallback && e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                    }}
                  />
                ) : (
                  <a className="doc-file-preview" href={attachmentUrl(a)} target="_blank" rel="noreferrer">📄 Open</a>
                )}
                <div>
                  <b>{a.file_name}</b>
                  <small>{a.id ? "Saved" : "Pending save"}</small>
                </div>
                <button type="button" onClick={() => deleteDocumentAttachment(a)}>Remove</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="doc-photo-empty">No photos added yet.</p>
        )}
      </div>
    );
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
    await savePendingDocumentAttachments("Quote", payload.quote_no);
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
    const cust = customers.find((c) => c.name === selected.customer);
    setWorkOrder({
      work_order_no: workOrder.work_order_no || nextWorkOrderNo(),
      job_id: selected.id || null,
      customer: selected.customer,
      service: selected.service,
      technician: workOrder.technician || "",
      customer_phone: workOrder.customer_phone || cust?.phone || "",
      customer_address: workOrder.customer_address || cust?.address || "",
      priority: workOrder.priority || "Normal",
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
      customer_phone: workOrder.customer_phone || "",
      customer_address: workOrder.customer_address || "",
      priority: workOrder.priority || "Normal",
      scheduled_date: workOrder.scheduled_date || null,
      start_time: workOrder.start_time,
      end_time: workOrder.end_time,
      status: workOrder.status,
      notes: workOrder.notes,
      completion_notes: workOrder.completion_notes || "",
      started_at: workOrder.started_at || null,
      completed_at: workOrder.completed_at || null,
    };

    const res = editingWorkOrderId
      ? await supabase
          .from("work_orders")
          .update(payload)
          .eq("id", editingWorkOrderId)
      : await supabase.from("work_orders").insert([payload]);

    if (res.error) return alert(res.error.message);
    await savePendingDocumentAttachments("Work Order", payload.work_order_no);

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
    const statusPayload: any = { status };
    if (status === "In Progress") statusPayload.started_at = new Date().toISOString();
    if (status === "Completed") statusPayload.completed_at = new Date().toISOString();
    const { error } = await supabase
      .from("work_orders")
      .update(statusPayload)
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

  function callCustomer(phone?: string) {
    const cleaned = firstContactValue(phone);
    if (!cleaned) return alert("No customer phone number on this work order.");
    window.location.href = `tel:${cleaned}`;
  }

  function textCustomer(phone?: string) {
    const cleaned = firstContactValue(phone);
    if (!cleaned) return alert("No customer phone number on this work order.");
    window.location.href = `sms:${cleaned}`;
  }

  function navigateToAddress(address?: string) {
    const destination = String(address || "").trim();
    if (!destination) return alert("No customer address on this work order.");
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`, "_blank");
  }

  async function convertWorkOrderToInvoice(wo: WorkOrder) {
    if (!wo.customer || !wo.service) return alert("Work order is missing customer or service.");
    const cust = customers.find((c) => c.name === wo.customer);
    const invoiceNo = nextInvoiceNo();
    const invoiceLines = [
      {
        description: wo.service || `Work Order ${wo.work_order_no || ""}`.trim(),
        qty: "1",
        unit_price: "0",
        discount: "0",
        tax_rate: "",
      },
    ];
    const payload: any = {
      invoice_no: invoiceNo,
      customer: wo.customer,
      customer_id: cust?.id || null,
      job_id: wo.job_id || null,
      amount: 0,
      qty: 1,
      unit_price: 0,
      discount: 0,
      tax_rate: 0,
      tax_amount: 0,
      subtotal: 0,
      total_amount: 0,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
      status: "Draft",
      notes: `Created from Work Order ${wo.work_order_no}. ${wo.notes || ""}

LINES_JSON:${JSON.stringify(invoiceLines)}`.trim(),
      customer_phone: wo.customer_phone || cust?.phone || "",
      customer_email: cust?.email || "",
      customer_address: wo.customer_address || cust?.address || "",
    };
    const res = await supabase.from("invoices").insert([payload]);
    if (res.error) return alert(res.error.message);

    // Carry work-order photos to the new invoice so they are available for preview/email.
    if (wo.work_order_no) {
      const existingPhotos = attachmentsFor("Work Order", wo.work_order_no);
      if (existingPhotos.length) {
        const copiedPhotos = existingPhotos.map((a) => ({
          document_type: "Invoice",
          document_no: invoiceNo,
          file_name: a.file_name,
          mime_type: a.mime_type,
          size_bytes: a.size_bytes || 0,
          data_url: a.data_url || null,
          storage_path: a.storage_path || null,
          file_url: a.file_url || null,
        }));
        const photoCopy = await supabase.from("document_attachments").insert(copiedPhotos);
        if (photoCopy.error) alert(`Invoice created, but photos were not copied: ${photoCopy.error.message}`);
      }
    }

    if (wo.id) await quickWorkOrderStatus(wo.id, "Completed", wo.job_id);
    await loadData();
    alert("Invoice draft created from work order.");
    setActiveTab("invoices");
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
      status: invoice.status || "Open",
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
    await savePendingDocumentAttachments("Invoice", payload.invoice_no);

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
      phone: cleanMultiContactValue(vendor.phone),
      email: cleanMultiContactValue(vendor.email),
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

    const oldExpense = editingExpenseId
      ? expenses.find((e) => Number(e.id) === Number(editingExpenseId))
      : null;

    const payload = {
      expense_no: expense.expense_no || nextExpenseNo(),
      expense_date: expense.expense_date || null,
      vendor: expense.vendor,
      category: expense.category,
      description: expense.description,
      amount: Number(expense.amount || 0),
      bank_name: (expense as any).bank_name || "Cash on hand",
      payment_method: expense.payment_method,
      reference_no: (expense as any).reference_no || "",
      status: expense.status,
    };

    const res = editingExpenseId
      ? await supabase
          .from("expenses")
          .update(payload)
          .eq("id", editingExpenseId)
      : await supabase.from("expenses").insert([payload]);

    if (res.error) return alert(res.error.message);

    await applyBankOutDelta(
      oldExpense && expenseAffectsBank(oldExpense) ? expenseBankName(oldExpense) : "",
      oldExpense && expenseAffectsBank(oldExpense) ? Number(oldExpense.amount || 0) : 0,
      expenseAffectsBank(payload as any) ? expenseBankName(payload as any) : "",
      expenseAffectsBank(payload as any) ? Number(payload.amount || 0) : 0,
    );

    setExpense(emptyExpense);
    setEditingExpenseId(null);
    await loadData();
  }

  function editExpense(e: Expense) {
    setExpense({
      ...e,
      amount: String(e.amount || ""),
      bank_name: (e as any).bank_name || (e as any).payment_account || expenseBankName(e),
      payment_method: e.payment_method || "Cash",
      reference_no: (e as any).reference_no || "",
    });
    setEditingExpenseId(e.id || null);
    setActiveTab(activeTab === "payments" ? "payments" : "expenses");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteExpense(id?: number) {
    const existing = expenses.find((e) => Number(e.id) === Number(id));
    if (!id || !confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return alert(error.message);

    if (existing && expenseAffectsBank(existing)) {
      await updateBankCurrentBalance(
        expenseBankName(existing),
        Number(existing.amount || 0),
      );
    }

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

    const documentLines = getDocumentLines(data);
    const documentTotalsValue = documentTotals(documentLines);
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

    const documentAttachmentsForEmail = attachmentsFor(type, String(documentNo || ""));

    setEmailDraft({
      open: true,
      type,
      to,
      subject,
      body: String(body || "").replaceAll("%0D%0A", "\n"),
      html: htmlBody,
      data: {
        ...data,
        lines: documentLines,
        subtotal: data.subtotal ?? documentTotalsValue.subtotal,
        tax_amount: data.tax_amount ?? documentTotalsValue.tax,
        total_amount: data.total_amount ?? data.amount ?? documentTotalsValue.total,
        amount: data.amount ?? documentTotalsValue.total,
        service: cleanDocumentDescription(data.service || data.description || data.notes),
        notes: cleanDocumentDescription(data.notes),
        customer_name:
          data.customer_name || data.customer || customerName || "Customer",
        viewUrl,
        view_url: viewUrl,
      },
      attachmentName,
      attachments: documentAttachmentsForEmail,
    });
  }

  async function addEmailDraftFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const maxSize = 18 * 1024 * 1024;
    const added: DocumentAttachment[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > maxSize) {
          alert(`${file.name} is too large. Maximum email attachment size is 18 MB.`);
          continue;
        }

        if (file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name || "")) {
          const compressed = await compressImageForMobile(file);
          added.push({
            document_type: "Email",
            document_no: emailDraft.data?.document_no || emailDraft.data?.invoice_no || emailDraft.data?.quote_no || "email",
            file_name: compressed.fileName,
            mime_type: compressed.mimeType,
            size_bytes: compressed.sizeBytes,
            data_url: compressed.dataUrl,
          });
        } else {
          const dataUrl = await fileToDataUrl(file);
          added.push({
            document_type: "Email",
            document_no: emailDraft.data?.document_no || emailDraft.data?.invoice_no || emailDraft.data?.quote_no || "email",
            file_name: file.name || `attachment-${Date.now()}`,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size || 0,
            data_url: dataUrl,
          });
        }
      }

      if (added.length) {
        setEmailDraft((prev) => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...added],
        }));
      }
    } catch (error: any) {
      alert(`Could not attach file: ${error?.message || "Unknown error"}`);
    }
  }

  function removeEmailDraftAttachment(index: number) {
    setEmailDraft((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((_, i) => i !== index),
    }));
  }

  async function sendEmailDraft() {
    if (!emailDraft.to) return alert("Recipient email is missing.");

    // v2.0 Stable: mobile browsers can lose the in-memory auth object while the ERP UI
    // is still usable. Email sending is protected by the server-side Resend key, so do
    // not block the user with a false login error. Refresh the session when available
    // and send the request with or without the bearer token.
    let token = session?.access_token || "";
    try {
      const { data: refreshed } = await supabase.auth.refreshSession();
      token = refreshed.session?.access_token || token;
    } catch (_error) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        token = sessionData.session?.access_token || token;
      } catch (_inner) {}
    }

    setEmailSending(true);

    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
        amount: emailDraft.data.total_amount || emailDraft.data.amount || "",
        balance: emailDraft.data.balance || "",
        dueDate: emailDraft.data.due_date || "",
        lines: emailDraft.data.lines || [],
        subtotal: emailDraft.data.subtotal || "",
        taxAmount: emailDraft.data.tax_amount || "",
        totalAmount: emailDraft.data.total_amount || emailDraft.data.amount || "",
        customerAddress: emailDraft.data.customer_address || "",
        customerPhone: emailDraft.data.customer_phone || "",
        customerEmail: emailDraft.data.customer_email || "",
        attachments: (emailDraft.attachments || []).map((a) => ({
          filename: a.file_name,
          contentType: a.mime_type,
          dataUrl: a.data_url || "",
          fileUrl: attachmentUrl(a),
          storagePath: a.storage_path || "",
        })),
        viewUrl:
          emailDraft.data.view_url ||
          emailDraft.data.viewUrl ||
          `${window.location.origin}/view?type=${encodeURIComponent(emailDraft.type.toLowerCase())}&no=${encodeURIComponent(String(emailDraft.data.document_no || emailDraft.data.invoice_no || emailDraft.data.quote_no || emailDraft.data.receipt_no || ""))}`,
      }),
    });

    const result = await response.json().catch(() => ({}));
    setEmailSending(false);

    if (!response.ok) {
      const message = result.error || "Email failed to send.";
      if (message.includes("RESEND_API_KEY") || response.status === 404) {
        const mailto = `mailto:${encodeURIComponent(emailDraft.to)}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body + "\n\nView document: " + (emailDraft.data.viewUrl || emailDraft.data.view_url || ""))}`;
        window.location.href = mailto;
        setEmailSending(false);
        return alert("Email service is not configured. I opened your email app with the prepared message. Add RESEND_API_KEY in Cloudflare to send directly from ERP.");
      }
      return alert(message);
    }

    alert(
      result.message || `${emailDraft.type} email sent to ${emailDraft.to}`,
    );
    showLocalNotification("Aashan ERP email sent", `${emailDraft.type} sent to ${emailDraft.to}`);
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
    const newStatus = invoiceStatusFromRows(inv, rowsForCalculation, payments);
    await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", inv.id);

    setInvoices((prev) =>
      prev.map((row) =>
        Number(row.id) === Number(inv.id) ? { ...row, status: newStatus } : row,
      ),
    );
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
          .select("id")
          .single()
      : await supabase.from("purchase_invoices").insert([payload]).select("id").single();
    if (res.error) return alert(res.error.message);
    await postPurchaseInvoiceAccounting(payload, res.data?.id || editingPurchaseInvoiceId);
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
          .select("id")
          .single()
      : await supabase.from("journal_entries").insert([payload]).select("id").single();
    if (res.error) return alert(res.error.message);
    await postJournalEntryAccounting(payload, res.data?.id || editingJournalEntryId);
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
  const currentYear = new Date().getFullYear();
  const paidRevenue = invoices
    .filter(
      (i) =>
        i.status !== "Cancelled" &&
        String(i.invoice_date || "").startsWith(String(currentYear)),
    )
    .reduce((sum, i) => sum + invoiceTotal(i), 0);
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
  const totalExpenses = [
    ...expenses.filter((e) =>
      String(e.expense_date || "").startsWith(String(currentYear)),
    ),
  ].reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const legacyNetProfit = paidRevenue - totalExpenses;
  const approvedExpenses = expenses
    .filter((e) => ["Approved", "Paid"].includes(e.status))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const draftExpenses = expenses
    .filter((e) => ["Draft", "Submitted"].includes(e.status))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  // Authentication is now handled by components/AuthGate.tsx.

  const accountsReceivable = outstanding;

  function isActiveStatus(status: any) {
    const value = String(status || "Posted").trim().toLowerCase();
    return !["draft", "submitted", "void", "cancelled", "canceled", "deleted"].includes(value);
  }

  function normText(value: any) {
    return String(value || "").trim().toLowerCase();
  }

  function accountKey(value: any) {
    return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function canonicalAccountName(value: any) {
    const raw = String(value || "").trim().replace(/\s+/g, " ");
    if (!raw) return "Cash on hand";
    const fromBank = banks.find((b) =>
      accountKey(b.bank_name) === accountKey(raw) || accountKey(b.account_name) === accountKey(raw),
    );
    if (fromBank?.bank_name) return String(fromBank.bank_name).trim();
    if (fromBank?.account_name) return String(fromBank.account_name).trim();
    const fromAccount = accounts.find((a) => accountKey(a.account_name) === accountKey(raw));
    if (fromAccount?.account_name) return String(fromAccount.account_name).trim();
    if (accountKey(raw) === "cash on hand") return "Cash on hand";
    return raw;
  }

  function accountMeta(accountName: any) {
    const key = accountKey(accountName);
    return accounts.find((a) => accountKey(a.account_name) === key || accountKey(a.account_code) === key);
  }

  function isCashBankAccountName(accountName: any) {
    const name = String(accountName || "").toLowerCase();
    const meta = accountMeta(accountName);
    const type = String(meta?.account_type || "").toLowerCase();
    return (
      type.includes("bank") ||
      type.includes("cash") ||
      type.includes("credit card") ||
      type.includes("petty") ||
      name.includes("cash") ||
      name.includes("bank") ||
      name.includes("checking") ||
      name.includes("credit card") ||
      name.includes("visa") ||
      name.includes("mastercard")
    );
  }

  function isIncomeAccountName(accountName: any) {
    const type = String(accountMeta(accountName)?.account_type || "").toLowerCase();
    const name = String(accountName || "").toLowerCase();
    return type.includes("income") || type.includes("revenue") || name.includes("revenue") || name === "sales";
  }

  function isExpenseAccountName(accountName: any) {
    const type = String(accountMeta(accountName)?.account_type || "").toLowerCase();
    return type.includes("expense") || type.includes("cost of goods") || type.includes("cogs");
  }

  function isLiabilityAccountName(accountName: any) {
    const type = String(accountMeta(accountName)?.account_type || "").toLowerCase();
    const name = String(accountName || "").toLowerCase();
    return type.includes("liability") || name.includes("payable") || name.includes("tax payable");
  }

  function isEquityAccountName(accountName: any) {
    const type = String(accountMeta(accountName)?.account_type || "").toLowerCase();
    const name = String(accountName || "").toLowerCase();
    return type.includes("equity") || name.includes("capital") || name.includes("owner");
  }

  function amountByAccount(rows: { account: string; debit: number; credit: number }[], predicate: (account: string) => boolean, normal: "Debit" | "Credit" = "Debit") {
    return rows.filter((r) => predicate(r.account)).reduce((sum, r) => {
      const debit = Number(r.debit || 0);
      const credit = Number(r.credit || 0);
      return sum + (normal === "Debit" ? debit - credit : credit - debit);
    }, 0);
  }

  function expenseAccountName(row: Partial<Expense> & Record<string, any>) {
    return canonicalAccountName(row.bank_name || row.paid_from || row.bank_account || row.payment_account || row.payment_method || "Cash on hand");
  }

  function vendorPaymentAccountName(row: Partial<VendorPayment> & Record<string, any>) {
    return canonicalAccountName(row.paid_from || row.bank_name || row.bank_account || row.payment_method || "Cash on hand");
  }

  function expenseMatchesVendorPayment(e: any, vp: any) {
    const sameDate = String(e.expense_date || e.payment_date || "") === String(vp.payment_date || "");
    const sameVendor = normText(e.vendor || e.payee) === normText(vp.vendor);
    const sameAmount = Math.abs(Number(e.amount || 0) - Number(vp.amount || 0)) < 0.01;
    const sameBank = normText(expenseAccountName(e)) === normText(vendorPaymentAccountName(vp));
    return sameDate && sameVendor && sameAmount && sameBank;
  }

  function vendorPaymentsForRegister() {
    return vendorPayments.filter((vp) => !expenses.some((e: any) => expenseMatchesVendorPayment(e, vp)));
  }

  const bankAccountOptionMap = new Map<string, string>();
  [
    ...banks.map((b) => b.bank_name || b.account_name).filter(Boolean),
    ...banks.map((b) => b.account_name || b.bank_name).filter(Boolean),
    ...accounts.filter((a) => a.is_active !== false && isCashBankAccountName(a.account_name)).map((a) => a.account_name),
    ...receipts.map((r) => r.bank_name).filter(Boolean),
    ...payments.map((p) => p.bank_name).filter(Boolean),
    ...expenses.map((e: any) => expenseAccountName(e)).filter(Boolean),
    ...vendorPaymentsForRegister().map((v: any) => vendorPaymentAccountName(v)).filter(Boolean),
  ].forEach((value) => {
    const canonical = canonicalAccountName(value);
    if (canonical && isCashBankAccountName(canonical)) bankAccountOptionMap.set(accountKey(canonical), canonical);
  });
  const bankAccountOptions = Array.from(bankAccountOptionMap.values()).sort();

  const paymentAccountMap = new Map<string, string>();
  [
    ...banks.map((b) => b.bank_name || b.account_name).filter(Boolean),
    ...banks.map((b) => b.account_name || b.bank_name).filter(Boolean),
    ...accounts.filter((a) => a.is_active !== false && isCashBankAccountName(a.account_name)).map((a) => a.account_name),
    "Cash on hand",
  ].forEach((value) => {
    const canonical = canonicalAccountName(value);
    if (canonical && isCashBankAccountName(canonical)) paymentAccountMap.set(accountKey(canonical), canonical);
  });
  const paymentAccountOptions = Array.from(paymentAccountMap.values()).sort();

  function formatReportDate(value: any) {
    if (!value) return "";
    const text = String(value);
    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      const [y, m, d] = text.slice(0, 10).split("-");
      return `${m}/${d}/${y}`;
    }
    return text;
  }

  function bankOpeningBalanceFor(accountName: string) {
    return banks
      .filter((b) => accountName === "All Accounts" || b.bank_name === accountName || b.account_name === accountName)
      .reduce((sum, b) => sum + Number(b.opening_balance || 0), 0);
  }

  function bankRegisterSourceRows(accountOverride?: string, showOverride?: string) {
    const selectedAccount = accountOverride || bankRegisterAccount;
    const selectedShow = showOverride || bankRegisterShow;
    const receiptRows = receipts.filter((r) => isActiveStatus(r.status)).map((r) => ({
      id: `receipt-${r.id || r.receipt_no}`,
      rawDate: r.receipt_date || "",
      date: formatReportDate(r.receipt_date),
      transaction: `Receipt — ${r.receipt_no || r.id || ""}`,
      account: canonicalAccountName(r.bank_name || "Cash on hand"),
      customer: r.customer || "",
      supplier: "",
      description: cleanDocumentDescription(r.notes || `Payment received from ${r.customer || "customer"}`),
      debit: Number(r.amount || 0),
      credit: 0,
      kind: "Receipt",
      sortId: Number(r.id || 0),
    }));

    const legacyPaymentRows = payments.filter((p) => isActiveStatus(p.status)).map((p: any) => ({
      id: `payment-${p.id || p.payment_no}`,
      rawDate: p.payment_date || "",
      date: formatReportDate(p.payment_date),
      transaction: `Receipt — ${p.payment_no || p.id || ""}`,
      account: canonicalAccountName(p.bank_name || "Cash on hand"),
      customer: p.customer || "",
      supplier: "",
      description: cleanDocumentDescription(p.notes || `Payment received from ${p.customer || "customer"}`),
      debit: Number(p.amount || 0),
      credit: 0,
      kind: "Receipt",
      sortId: Number(p.id || 0),
    }));

    const expenseRows = expenses.filter((e: any) => isActiveStatus(e.status || "Paid")).map((e: any) => ({
      id: `expense-${e.id || e.expense_no}`,
      rawDate: e.expense_date || e.payment_date || "",
      date: formatReportDate(e.expense_date || e.payment_date),
      transaction: `Payment — ${e.expense_no || e.payment_no || e.id || ""}`,
      account: expenseAccountName(e),
      customer: "",
      supplier: e.vendor || e.payee || "",
      description: cleanDocumentDescription(e.description || e.notes || "Payment"),
      debit: 0,
      credit: Number(e.amount || 0),
      kind: "Payment",
      sortId: Number(e.id || 0),
    }));

    const vendorPaymentRows = vendorPaymentsForRegister().map((vp: any) => ({
      id: `vendor-payment-${vp.id || vp.payment_no}`,
      rawDate: vp.payment_date || "",
      date: formatReportDate(vp.payment_date),
      transaction: `Payment — ${vp.payment_no || vp.id || ""}`,
      account: vendorPaymentAccountName(vp),
      customer: "",
      supplier: vp.vendor || "",
      description: cleanDocumentDescription(vp.description || vp.notes || "Vendor payment"),
      debit: 0,
      credit: Number(vp.amount || 0),
      kind: "Payment",
      sortId: Number(vp.id || 0),
    }));

    return [...receiptRows, ...legacyPaymentRows, ...expenseRows, ...vendorPaymentRows].filter((row) => {
      const accountOk = selectedAccount === "All Accounts" || accountKey(row.account) === accountKey(selectedAccount);
      const showOk = selectedShow === "All Transactions" || row.kind === selectedShow;
      const searchOk = !q || [row.date, row.transaction, row.account, row.customer, row.supplier, row.description, row.debit, row.credit]
        .join(" ")
        .toLowerCase()
        .includes(q);
      return accountOk && showOk && searchOk;
    });
  }

  const selectedBankOpeningBalance = bankOpeningBalanceFor(bankRegisterAccount);

  const bankRegisterRowsAscending = bankRegisterSourceRows()
    .sort((a, b) => {
      const dateCompare = String(a.rawDate || "").localeCompare(String(b.rawDate || ""));
      if (dateCompare !== 0) return dateCompare;
      return a.sortId - b.sortId;
    })
    .reduce((acc: any[], row) => {
      const previousBalance = acc.length ? acc[acc.length - 1].runningBalance : selectedBankOpeningBalance;
      acc.push({ ...row, runningBalance: previousBalance + row.debit - row.credit });
      return acc;
    }, []);

  const bankRegisterRows = [...bankRegisterRowsAscending].sort((a, b) => {
    const dateCompare = String(b.rawDate || "").localeCompare(String(a.rawDate || ""));
    if (dateCompare !== 0) return dateCompare;
    return b.sortId - a.sortId;
  });

  const bankRegisterDebits = bankRegisterRows.reduce((sum, row) => sum + row.debit, 0);
  const bankRegisterCredits = bankRegisterRows.reduce((sum, row) => sum + row.credit, 0);
  const bankRegisterClosing = selectedBankOpeningBalance + bankRegisterDebits - bankRegisterCredits;

  function bankBalanceForAccount(accountName: string) {
    const rows = bankRegisterSourceRows(accountName, "All Transactions");
    return bankOpeningBalanceFor(accountName) + rows.reduce((sum, row) => sum + Number(row.debit || 0) - Number(row.credit || 0), 0);
  }

  const bankAccountBalanceRows = bankAccountOptions
    .map((accountName) => ({ label: accountName, amount: bankBalanceForAccount(accountName) }))
    .filter((row) => Math.abs(Number(row.amount || 0)) > 0.004);

  const bankBalance = bankAccountBalanceRows.length
    ? bankAccountBalanceRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    : bankOpeningBalanceFor("All Accounts");

  function bankBalanceText(value: number) {
    const abs = Math.abs(value);
    if (value < 0) return `${money(abs)} Cr`;
    return `${money(abs)} Dr`;
  }

  function printBankRegister() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const rows = bankRegisterRows
      .map(
        (row) => `<tr><td>${row.date}</td><td>${row.transaction}</td><td>${row.account}</td><td>${row.customer}</td><td>${row.supplier}</td><td>${row.description}</td><td class="num">${row.debit ? money(row.debit) : "-"}</td><td class="num">${row.credit ? money(row.credit) : "-"}</td><td class="num">${bankBalanceText(row.runningBalance)}</td></tr>`,
      )
      .join("");
    printWindow.document.write(`<!doctype html><html><head><title>Bank Register</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{margin:0 0 6px}p{margin:0 0 18px;color:#475569}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #d7dee8;padding:8px;text-align:left}th{background:#f8fafc}.num{text-align:right;white-space:nowrap}.summary{display:flex;gap:18px;margin:18px 0}.summary div{border:1px solid #d7dee8;border-radius:10px;padding:12px 16px}

.email-file-attach {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  padding: 12px 14px;
  border: 1px dashed #94a3b8;
  border-radius: 12px;
  background: #f8fafc;
  color: #0f4c5c;
  font-weight: 900;
  cursor: pointer;
}
.email-file-attach input { display: none; }
.email-attachment button {
  margin-left: auto;
  border: 0;
  border-radius: 8px;
  padding: 7px 9px;
  background: #fee2e2;
  color: #991b1b;
  font-weight: 800;
}

.tax-clear-btn {
  margin-top: 6px;
  width: 100%;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #0f4c5c;
  border-radius: 8px;
  padding: 7px 8px;
  font-weight: 800;
  cursor: pointer;
}
@media (max-width: 760px) {
  .command-open-button { width: 100%; justify-content: center; }
  .command-backdrop { padding-top: 4vh; }
  .command-palette { border-radius: 18px; }
  .command-input { font-size: 16px; }
  
.email-file-attach {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  padding: 12px 14px;
  border: 1px dashed #94a3b8;
  border-radius: 12px;
  background: #f8fafc;
  color: #0f4c5c;
  font-weight: 900;
  cursor: pointer;
}
.email-file-attach input { display: none; }
.email-attachment button {
  margin-left: auto;
  border: 0;
  border-radius: 8px;
  padding: 7px 9px;
  background: #fee2e2;
  color: #991b1b;
  font-weight: 800;
}

.tax-clear-btn { min-height: 40px; font-size: 14px; }

.doc-file-preview {
  min-height: 118px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  background: #f8fafc;
  border: 1px dashed #94a3b8;
  border-radius: 12px;
  color: #0f4c5c;
  font-weight: 900;
}

}

</style></head><body><h1>Aashan & Co LLC - Bank Register</h1><p>${bankRegisterAccount} • ${bankRegisterShow}</p><div class="summary"><div>Opening: <b>${bankBalanceText(selectedBankOpeningBalance)}</b></div><div>Debits: <b>${money(bankRegisterDebits)}</b></div><div>Credits: <b>${money(bankRegisterCredits)}</b></div><div>Closing: <b>${bankBalanceText(bankRegisterClosing)}</b></div></div><table><thead><tr><th>Date</th><th>Transaction</th><th>Bank or Cash Account</th><th>Customer</th><th>Supplier</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.print();
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const revenueMTD = invoices
    .filter((i) => String(i.invoice_date || "").slice(0, 7) === currentMonth && i.status !== "Cancelled")
    .reduce((sum, i) => sum + invoiceTotal(i), 0);

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

  const totalInvoiceAmount = invoices
    .filter((i) => i.status !== "Cancelled")
    .reduce((sum, i) => sum + invoiceTotal(i), 0);
  const totalReceiptAmount = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0) + payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPurchaseInvoiceAmount = purchaseInvoices.reduce((sum, pi) => sum + Number(pi.amount || 0), 0);
  const totalVendorPaymentAmount = expenses.filter((e: any) => isActiveStatus(e.status || "Paid")).reduce((sum, e) => sum + Number(e.amount || 0), 0) + vendorPaymentsForRegister().reduce((sum, vp) => sum + Number(vp.amount || 0), 0);
  const totalDiscounts = invoices.reduce((sum, i) => sum + Number(i.discount || 0), 0);
  const taxPayable = invoices.filter((i) => i.status !== "Cancelled").reduce((sum, i) => sum + Number(i.tax_amount || 0), 0);
  const accountsPayable = Math.max(0, totalPurchaseInvoiceAmount - totalVendorPaymentAmount);
  const balanceSheetAssets = accountsReceivable + bankBalance;
  const balanceSheetLiabilities = accountsPayable + taxPayable;
  const netProfit = paidRevenue - totalVendorPaymentAmount;
  const balanceSheetEquity = balanceSheetAssets - balanceSheetLiabilities;
  const ownerCapital = balanceSheetEquity - netProfit;

  const dashboardExpenseRows = Object.values(
    expenses.filter((e: any) => isActiveStatus(e.status || "Paid")).reduce((acc: Record<string, { label: string; amount: number }>, e) => {
      const label = String(e.category || "Other").trim() || "Other";
      acc[label] = acc[label] || { label, amount: 0 };
      acc[label].amount += Number(e.amount || 0);
      return acc;
    }, {}),
  ).sort((a: any, b: any) => b.amount - a.amount) as { label: string; amount: number }[];
  const vendorPaymentExtraTotal = vendorPaymentsForRegister().reduce((sum, vp) => sum + Number(vp.amount || 0), 0);
  if (vendorPaymentExtraTotal > 0) dashboardExpenseRows.push({ label: "Vendor Payments", amount: vendorPaymentExtraTotal });
  if (totalDiscounts > 0) dashboardExpenseRows.push({ label: "Sales Discount", amount: totalDiscounts });
  const dashboardIncomeRows = [
    { label: "Repair & Maintenance Revenue", amount: paidRevenue },
    { label: "Sales", amount: 0 },
    { label: "Interest received", amount: 0 },
  ];

  function signedAmountDebitCredit(balance: number, normal: "Debit" | "Credit" = "Debit") {
    const value = Number(balance || 0);
    if (normal === "Credit") {
      return value >= 0 ? { debit: 0, credit: value } : { debit: Math.abs(value), credit: 0 };
    }
    return value >= 0 ? { debit: value, credit: 0 } : { debit: 0, credit: Math.abs(value) };
  }

  const reportProfitLossIncomeRows = [
    { label: "Repair & Maintenance Revenue", amount: paidRevenue },
  ].filter((r) => Number(r.amount || 0) !== 0);
  const reportProfitLossExpenseRows = Object.values(
    expenses.filter((e: any) => isActiveStatus(e.status || "Paid")).reduce((acc: Record<string, { label: string; amount: number }>, e) => {
      const label = String(e.category || "Other").trim() || "Other";
      acc[label] = acc[label] || { label, amount: 0 };
      acc[label].amount += Number(e.amount || 0);
      return acc;
    }, {}),
  ).filter((r: any) => Number(r.amount || 0) !== 0) as { label: string; amount: number }[];
  if (vendorPaymentExtraTotal > 0) reportProfitLossExpenseRows.push({ label: "Vendor Payments", amount: vendorPaymentExtraTotal });
  if (totalDiscounts > 0) reportProfitLossExpenseRows.push({ label: "Sales Discount", amount: totalDiscounts });

  const reportBalanceRows = [
    { group: "Assets", account: "Accounts Receivable", amount: accountsReceivable },
    { group: "Assets", account: "Cash & Bank", amount: bankBalance },
    { group: "Liabilities", account: "Accounts Payable", amount: accountsPayable },
    { group: "Liabilities", account: "Tax Payable", amount: taxPayable },
    { group: "Equity", account: "Owner's Capital / Opening Balance", amount: ownerCapital },
    { group: "Equity", account: "Current Year Profit", amount: netProfit },
  ].filter((r) => Math.abs(Number(r.amount || 0)) > 0.004);

  const reportTrialRows = [
    { account: "Accounts Receivable", ...signedAmountDebitCredit(accountsReceivable, "Debit") },
    { account: "Cash & Bank", ...signedAmountDebitCredit(bankBalance, "Debit") },
    { account: "Accounts Payable", ...signedAmountDebitCredit(accountsPayable, "Credit") },
    { account: "Tax Payable", ...signedAmountDebitCredit(taxPayable, "Credit") },
    { account: "Owner's Capital / Opening Balance", ...signedAmountDebitCredit(ownerCapital, "Credit") },
    { account: "Repair & Maintenance Revenue", ...signedAmountDebitCredit(paidRevenue, "Credit") },
    ...reportProfitLossExpenseRows.map((r) => ({ account: r.label, ...signedAmountDebitCredit(Number(r.amount || 0), "Debit") })),
  ].filter((r) => Number(r.debit || 0) !== 0 || Number(r.credit || 0) !== 0);
  const trialDebitTotal = reportTrialRows.reduce((sum, r) => sum + Number(r.debit || 0), 0);
  const trialCreditTotal = reportTrialRows.reduce((sum, r) => sum + Number(r.credit || 0), 0);

  const postedGeneralLedgerRows = glLines
    .map((line) => {
      const header = glHeaders.find((h) => Number(h.id || 0) === Number(line.header_id || 0));
      const sourceNo = header?.source_no || header?.transaction_no || line.header_id || "";
      const sourceType = header?.source_type || "GL";
      return {
        rawDate: header?.transaction_date || header?.created_at || "",
        date: formatReportDate(header?.transaction_date || header?.created_at || ""),
        source: `${sourceType} — ${sourceNo}`,
        account: canonicalAccountName(line.account_name || line.account_code || "Unassigned"),
        description: line.description || header?.description || "Posted ledger entry",
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
        sortId: Number(line.id || line.line_no || 0),
      };
    })
    .filter((row) => Math.abs(row.debit) > 0.004 || Math.abs(row.credit) > 0.004);

  const fallbackGeneralLedgerRows = [
    ...invoices.filter((i) => i.status !== "Cancelled").flatMap((i) => {
      const total = invoiceTotal(i);
      const tax = Number(i.tax_amount || 0);
      const revenue = Math.max(0, total - tax);
      return [
        { rawDate: i.invoice_date || "", date: formatReportDate(i.invoice_date), source: `Invoice — ${i.invoice_no}`, account: "Accounts Receivable", description: i.customer || "Customer invoice", debit: total, credit: 0, sortId: Number(i.id || 0) },
        { rawDate: i.invoice_date || "", date: formatReportDate(i.invoice_date), source: `Invoice — ${i.invoice_no}`, account: "Repair & Maintenance Revenue", description: i.customer || "Sales revenue", debit: 0, credit: revenue, sortId: Number(i.id || 0) },
        ...(tax ? [{ rawDate: i.invoice_date || "", date: formatReportDate(i.invoice_date), source: `Invoice — ${i.invoice_no}`, account: "Tax Payable", description: i.customer || "Sales tax", debit: 0, credit: tax, sortId: Number(i.id || 0) }] : []),
      ];
    }),
    ...receipts.flatMap((r) => [
      { rawDate: r.receipt_date || "", date: formatReportDate(r.receipt_date), source: `Receipt — ${r.receipt_no}`, account: canonicalAccountName(r.bank_name || "Cash on hand"), description: r.notes || r.customer, debit: Number(r.amount || 0), credit: 0, sortId: Number(r.id || 0) },
      { rawDate: r.receipt_date || "", date: formatReportDate(r.receipt_date), source: `Receipt — ${r.receipt_no}`, account: "Accounts Receivable", description: r.customer || "Customer receipt", debit: 0, credit: Number(r.amount || 0), sortId: Number(r.id || 0) },
    ]),
    ...payments.flatMap((p) => [
      { rawDate: p.payment_date || "", date: formatReportDate(p.payment_date), source: `Receipt — ${p.invoice_no || p.id}`, account: canonicalAccountName(p.bank_name || "Cash on hand"), description: p.notes || p.customer, debit: Number(p.amount || 0), credit: 0, sortId: Number(p.id || 0) },
      { rawDate: p.payment_date || "", date: formatReportDate(p.payment_date), source: `Receipt — ${p.invoice_no || p.id}`, account: "Accounts Receivable", description: p.customer || "Customer receipt", debit: 0, credit: Number(p.amount || 0), sortId: Number(p.id || 0) },
    ]),
    ...purchaseInvoices.flatMap((pi) => [
      { rawDate: pi.invoice_date || "", date: formatReportDate(pi.invoice_date), source: `Bill — ${pi.purchase_invoice_no}`, account: pi.category || "Expense", description: pi.description || pi.vendor, debit: Number(pi.amount || 0), credit: 0, sortId: Number(pi.id || 0) },
      { rawDate: pi.invoice_date || "", date: formatReportDate(pi.invoice_date), source: `Bill — ${pi.purchase_invoice_no}`, account: "Accounts Payable", description: pi.vendor || "Vendor bill", debit: 0, credit: Number(pi.amount || 0), sortId: Number(pi.id || 0) },
    ]),
    ...expenses.filter((e: any) => isActiveStatus(e.status || "Paid")).flatMap((e) => [
      { rawDate: e.expense_date || "", date: formatReportDate(e.expense_date), source: `Payment — ${e.expense_no}`, account: e.category || "Expense", description: e.description || e.vendor, debit: Number(e.amount || 0), credit: 0, sortId: Number(e.id || 0) },
      { rawDate: e.expense_date || "", date: formatReportDate(e.expense_date), source: `Payment — ${e.expense_no}`, account: expenseAccountName(e), description: e.description || e.vendor, debit: 0, credit: Number(e.amount || 0), sortId: Number(e.id || 0) },
    ]),
    ...vendorPaymentsForRegister().flatMap((vp) => [
      { rawDate: vp.payment_date || "", date: formatReportDate(vp.payment_date), source: `Payment — ${vp.payment_no}`, account: "Accounts Payable", description: vp.description || vp.vendor, debit: Number(vp.amount || 0), credit: 0, sortId: Number(vp.id || 0) },
      { rawDate: vp.payment_date || "", date: formatReportDate(vp.payment_date), source: `Payment — ${vp.payment_no}`, account: vendorPaymentAccountName(vp), description: vp.description || vp.vendor, debit: 0, credit: Number(vp.amount || 0), sortId: Number(vp.id || 0) },
    ]),
    ...journalEntries.flatMap((je) => [
      { rawDate: je.journal_date || "", date: formatReportDate(je.journal_date), source: `Journal — ${je.journal_no}`, account: canonicalAccountName(je.debit_account), description: je.description, debit: Number(je.amount || 0), credit: 0, sortId: Number(je.id || 0) },
      { rawDate: je.journal_date || "", date: formatReportDate(je.journal_date), source: `Journal — ${je.journal_no}`, account: canonicalAccountName(je.credit_account), description: je.description, debit: 0, credit: Number(je.amount || 0), sortId: Number(je.id || 0) },
    ]),
  ];

  const reportGeneralLedgerRows = (postedGeneralLedgerRows.length ? postedGeneralLedgerRows : fallbackGeneralLedgerRows)
    .sort((a, b) => {
      const dateCompare = String(b.rawDate || "").localeCompare(String(a.rawDate || ""));
      if (dateCompare !== 0) return dateCompare;
      return Number(b.sortId || 0) - Number(a.sortId || 0);
    });

  const reportCustomerStatementRows = [
    ...invoices.map((i) => ({ date: formatReportDate(i.invoice_date), transaction: `Invoice — ${i.invoice_no}`, customer: i.customer, debit: invoiceTotal(i), credit: 0, balance: invoiceBalance(i) })),
    ...receipts.map((r) => ({ date: formatReportDate(r.receipt_date), transaction: `Receipt — ${r.receipt_no}`, customer: r.customer, debit: 0, credit: Number(r.amount || 0), balance: 0 })),
    ...payments.map((p) => ({ date: formatReportDate(p.payment_date), transaction: `Receipt — ${p.invoice_no || p.id}`, customer: p.customer, debit: 0, credit: Number(p.amount || 0), balance: 0 })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const reportVendorStatementRows = [
    ...purchaseInvoices.map((pi) => ({ date: formatReportDate(pi.invoice_date), transaction: `Bill — ${pi.purchase_invoice_no}`, vendor: pi.vendor, debit: 0, credit: Number(pi.amount || 0), description: pi.description || pi.category })),
    ...expenses.map((e) => ({ date: formatReportDate(e.expense_date), transaction: `Payment — ${e.expense_no}`, vendor: e.vendor, debit: Number(e.amount || 0), credit: 0, description: e.description || e.category })),
    ...vendorPaymentsForRegister().map((vp) => ({ date: formatReportDate(vp.payment_date), transaction: `Payment — ${vp.payment_no}`, vendor: vp.vendor, debit: Number(vp.amount || 0), credit: 0, description: vp.description || vp.notes || "Vendor payment" })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)));

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

  function openDashboardDrillDown(report: string, bankAccount?: string, show?: string) {
    if (bankAccount) setBankRegisterAccount(bankAccount);
    if (show) setBankRegisterShow(show);
    setReportTab(report);
    openTab("reports");
  }


  function findCustomerNameFromPrompt(prompt: string) {
    const text = prompt.toLowerCase();
    const match = customers.find((c) => c.name && text.includes(String(c.name).toLowerCase()));
    if (match?.name) return match.name;

    const forMatch = prompt.match(/\bfor\s+([a-zA-Z][a-zA-Z0-9 .&'-]{1,40}?)(?:\s+to\s+|\s+-\s+|,|\.|$)/i);
    return forMatch?.[1]?.trim() || "";
  }

  function buildAiQuoteLines(prompt: string): TransactionLine[] {
    let workText = prompt
      .replace(/create|make|generate|prepare|draft/gi, " ")
      .replace(/quote|estimate/gi, " ")
      .replace(/for\s+[a-zA-Z][a-zA-Z0-9 .&'-]{1,40}?\s+to\s+/i, " ")
      .replace(/customer\s*:/gi, " ")
      .replace(/work\s*:/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const parts = workText
      .split(/\n|,|;|\band\b|\+/i)
      .map((x) => x.trim())
      .filter((x) => x.length > 2)
      .slice(0, 12);

    const lines = parts.length ? parts : [workText || "Service labor and materials"];
    return lines.map((description) => ({
      description,
      qty: "1",
      unit_price: "",
      discount: "0",
      tax_rate: String(getDefaultTaxRate(company) || ""),
    }));
  }


  function aashanAiPolishDescription(description: string, documentType: "quote" | "invoice" | "workorder") {
    const text = cleanDocumentDescription(description || "").trim();
    if (!text) return "Professional service labor, materials, preparation, installation, cleanup, and finishing as required.";
    const lower = text.toLowerCase();
    const suffixes: string[] = [];
    if (lower.includes("paint")) suffixes.push("surface preparation, masking, touch-up, and cleanup included");
    if (lower.includes("drywall") || lower.includes("sheetrock")) suffixes.push("patching, joint compound, sanding, texture match, and finish preparation included");
    if (lower.includes("fan") || lower.includes("light") || lower.includes("fixture")) suffixes.push("safe removal, installation, testing, and area cleanup included");
    if (lower.includes("toilet") || lower.includes("faucet") || lower.includes("plumb")) suffixes.push("installation, leak check, and basic function testing included");
    if (lower.includes("door") || lower.includes("trim")) suffixes.push("alignment, fastening, caulking, and paint-ready finish included");
    const base = text.charAt(0).toUpperCase() + text.slice(1);
    const detail = suffixes.length ? ` Includes ${Array.from(new Set(suffixes)).join("; ")}.` : " Includes labor, standard preparation, installation/service, and cleanup.";
    if (documentType === "invoice") return `${base}.${base.endsWith(".") ? "" : detail} Work completed as agreed.`.replace("..", ".");
    if (documentType === "workorder") return `${base}. Technician checklist: verify site condition, complete work safely, take before/after photos, test completed work, and collect customer confirmation.`;
    return `${base}.${base.endsWith(".") ? "" : detail}`.replace("..", ".");
  }

  function applyAashanCopilotToQuote() {
    const updated = quoteLines.map((line) => ({ ...line, description: aashanAiPolishDescription(line.description, "quote") }));
    setQuoteLines(updated);
    setQuote({
      ...quote,
      notes: quote.notes || "Prepared with Aashan AI Copilot. Price includes listed labor and standard materials unless otherwise noted. Customer-provided materials will be noted separately.",
    });
    setAashanAiResponse(`Aashan AI Copilot improved the quote descriptions. Review pricing, tax, and customer notes before saving.\n\n${updated.map((line, idx) => `${idx + 1}. ${line.description}`).join("\n")}`);
  }

  function applyAashanCopilotToInvoice() {
    const updated = invoiceLines.map((line) => ({ ...line, description: aashanAiPolishDescription(line.description, "invoice") }));
    setInvoiceLines(updated);
    setInvoice({
      ...invoice,
      notes: invoice.notes || "Services completed by Aashan & Co LLC. Please review the invoice and contact us with any questions.",
    });
    setAashanAiResponse(`Aashan AI Copilot improved the invoice descriptions and prepared customer-ready wording.\n\n${updated.map((line, idx) => `${idx + 1}. ${line.description}`).join("\n")}`);
  }

  function applyAashanCopilotToWorkOrder() {
    const service = cleanDocumentDescription(workOrder.service || workOrder.notes || "Service work");
    const checklist = `Aashan AI Work Order Checklist:\n• Confirm customer name, address, and scope before starting.\n• Take before photos.\n• Complete: ${aashanAiPolishDescription(service, "workorder")}\n• Take after photos.\n• Test/inspect completed work.\n• Clean work area.\n• Add completion notes before converting to invoice.`;
    setWorkOrder({
      ...workOrder,
      notes: workOrder.notes ? `${workOrder.notes}\n\n${checklist}` : checklist,
    });
    setAashanAiResponse(checklist);
  }

  function openAashanCopilotEmail(kind: "quote" | "invoice" | "receipt" | "reminder" | "followup") {
    const customerContext = activeTab === "quotes" ? quote.customer : activeTab === "invoices" ? invoice.customer : activeTab === "workorders" ? workOrder.customer : "";
    const prompt = customerContext ? `${kind} email for ${customerContext}` : `${kind} email`;
    setAashanAiResponse(buildAashanAIEmail(kind, prompt));
    openTab("aashan_ai");
  }

  function openAiQuoteDraft() {
    const prompt = aashanAiPrompt.trim();
    if (!prompt) {
      setAashanAiResponse("Type the quote request first. Example: create quote for Roy to install ceiling fan and repair drywall.");
      return;
    }

    const customerName = findCustomerNameFromPrompt(prompt);
    const lines = buildAiQuoteLines(prompt);
    const today = new Date().toISOString().slice(0, 10);

    setQuote({
      ...emptyQuote,
      quote_no: nextQuoteNo(),
      customer: customerName,
      quote_date: today,
      status: "Draft",
      notes: "Prepared by Aashan AI. Please review pricing, tax, scope, and terms before sending.",
    });
    setQuoteLines(lines);
    setEditingQuoteId(null);
    setAashanAiResponse(`Draft quote opened in Quotes. Review the customer, pricing, tax, and notes before saving.\n\nLines created:\n${lines.map((line) => `• ${line.description}`).join("\n")}`);
    openTab("quotes");
  }

  function copyAiResponse() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(aashanAiResponse);
      alert("Aashan AI response copied.");
    }
  }

  function getCompanySignature() {
    return `Best Regards,\n${company.company_name || "Aashan & Co LLC"}\nPhone: ${company.phone || "(832) 210-4248"}\nEmail: ${company.email || "support@aashan.co"}${company.website ? `\nWebsite: ${company.website}` : ""}`;
  }

  function findAiCustomerRecord(prompt: string) {
    const name = findCustomerNameFromPrompt(prompt);
    const term = (name || prompt).toLowerCase();
    return customers.find((c) =>
      String(c.name || "").toLowerCase().includes(term) ||
      String(c.phone || "").toLowerCase().includes(term) ||
      String(c.email || "").toLowerCase().includes(term)
    );
  }

  function getRecentAiQuote(customerName?: string) {
    const target = String(customerName || "").toLowerCase();
    return [...quotes]
      .filter((q: any) => !target || String(q.customer || "").toLowerCase().includes(target))
      .sort((a: any, b: any) => String(b.quote_date || b.created_at || "").localeCompare(String(a.quote_date || a.created_at || "")))[0];
  }

  function getRecentAiInvoice(customerName?: string, unpaidOnly = false) {
    const target = String(customerName || "").toLowerCase();
    return [...invoices]
      .filter((inv: any) => {
        const matchesCustomer = !target || String(inv.customer || "").toLowerCase().includes(target);
        const balance = Number(inv.balance_due || inv.total_amount || inv.amount || inv.total || 0);
        const isPaid = String(inv.status || "").toLowerCase().includes("paid");
        return matchesCustomer && (!unpaidOnly || (balance > 0 && !isPaid));
      })
      .sort((a: any, b: any) => String(b.invoice_date || b.created_at || "").localeCompare(String(a.invoice_date || a.created_at || "")))[0];
  }

  function getRecentAiReceipt(customerName?: string) {
    const target = String(customerName || "").toLowerCase();
    return [...receipts]
      .filter((r: any) => !target || String(r.customer || "").toLowerCase().includes(target))
      .sort((a: any, b: any) => String(b.receipt_date || b.created_at || "").localeCompare(String(a.receipt_date || a.created_at || "")))[0];
  }

  function buildAashanAIEmail(kind: "quote" | "invoice" | "receipt" | "reminder" | "followup", promptText?: string) {
    const prompt = (promptText || aashanAiPrompt || "").trim();
    const customer = findAiCustomerRecord(prompt);
    const customerName = customer?.name || findCustomerNameFromPrompt(prompt) || "Customer";
    const signature = getCompanySignature();

    if (kind === "quote") {
      const q = getRecentAiQuote(customerName);
      const subject = `Quote ${q?.quote_no || ""} from ${company.company_name || "Aashan & Co LLC"}`.replace(/\s+/g, " ").trim();
      return `Subject: ${subject}\n\nHi ${customerName},\n\nThank you for giving ${company.company_name || "Aashan & Co LLC"} the opportunity to provide this quote. Please review the attached quote${q?.quote_no ? ` ${q.quote_no}` : ""}${q ? ` for ${money((q as any).total_amount || (q as any).amount || (q as any).total || 0)}` : ""}.\n\nIf you have any questions or would like to make any changes, please let us know. We will be happy to assist.\n\n${signature}`;
    }

    if (kind === "invoice") {
      const inv = getRecentAiInvoice(customerName);
      const subject = `Invoice ${inv?.invoice_no || ""} from ${company.company_name || "Aashan & Co LLC"}`.replace(/\s+/g, " ").trim();
      return `Subject: ${subject}\n\nHi ${customerName},\n\nThank you for choosing ${company.company_name || "Aashan & Co LLC"}. Please find your invoice${inv?.invoice_no ? ` ${inv.invoice_no}` : ""} attached for the services provided.\n\nInvoice Amount: ${money((inv as any)?.total_amount || (inv as any)?.amount || (inv as any)?.total || 0)}\nBalance Due: ${money((inv as any)?.balance_due || (inv as any)?.total_amount || (inv as any)?.amount || (inv as any)?.total || 0)}${inv?.due_date ? `\nDue Date: ${inv.due_date}` : ""}\n\nPlease review the invoice and let us know if you have any questions.\n\nZelle Payment: 832-210-4248\n\n${signature}`;
    }

    if (kind === "receipt") {
      const r = getRecentAiReceipt(customerName);
      const subject = `Payment Receipt ${r?.receipt_no || ""} from ${company.company_name || "Aashan & Co LLC"}`.replace(/\s+/g, " ").trim();
      return `Subject: ${subject}\n\nHi ${customerName},\n\nThank you for your payment. This email confirms that we have received your payment${r?.receipt_no ? ` under receipt ${r.receipt_no}` : ""}${r ? ` in the amount of ${money(r.amount || 0)}` : ""}.\n\nWe appreciate your business and the opportunity to serve you. Please keep this receipt for your records.\n\nWe would also greatly appreciate your feedback. Please leave us a review on Facebook:\nhttps://www.facebook.com/profile.php?id=61584788072935&sk=reviews\n\n${signature}`;
    }

    if (kind === "reminder") {
      const inv = getRecentAiInvoice(customerName, true);
      const subject = `Friendly Payment Reminder${inv?.invoice_no ? ` - ${inv.invoice_no}` : ""}`;
      return `Subject: ${subject}\n\nHi ${customerName},\n\nThis is a friendly reminder regarding your outstanding invoice${inv?.invoice_no ? ` ${inv.invoice_no}` : ""}.\n\nBalance Due: ${money((inv as any)?.balance_due || (inv as any)?.total_amount || (inv as any)?.amount || (inv as any)?.total || 0)}${inv?.due_date ? `\nDue Date: ${inv.due_date}` : ""}\n\nPlease let us know if you have already sent the payment or if you have any questions.\n\nZelle Payment: 832-210-4248\n\nThank you,\n${signature}`;
    }

    return `Subject: Follow-up from ${company.company_name || "Aashan & Co LLC"}\n\nHi ${customerName},\n\nThank you for choosing ${company.company_name || "Aashan & Co LLC"}. I am following up to check if you have any questions or need any updates regarding your quote, invoice, or service request.\n\nPlease let us know how we can help.\n\n${signature}`;
  }

  function openAiEmailWriter(kind: "quote" | "invoice" | "receipt" | "reminder" | "followup") {
    const email = buildAashanAIEmail(kind);
    setAashanAiResponse(email);
  }


  function formatAiRecordSearch(term: string) {
    const q = term.toLowerCase().trim();
    const contains = (value: any) => String(value || "").toLowerCase().includes(q);

    const customerMatches = customers
      .filter((c) => contains(c.name) || contains(c.phone) || contains(c.email) || contains(c.address))
      .slice(0, 6)
      .map((c) => `• Customer: ${c.name || "Customer"}${c.phone ? ` — ${c.phone}` : ""}${c.email ? ` — ${c.email}` : ""}`);

    const quoteMatches = quotes
      .filter((qte: any) => contains(qte.quote_no) || contains(qte.customer) || contains(qte.service) || contains(qte.notes))
      .slice(0, 6)
      .map((qte: any) => `• Quote: ${qte.quote_no || "Quote"} — ${qte.customer || "Customer"} — ${money(qte.total_amount || qte.amount || 0)} — ${qte.status || "Status not set"}`);

    const invoiceMatches = invoices
      .filter((inv: any) => contains(inv.invoice_no) || contains(inv.customer) || contains(inv.notes))
      .slice(0, 6)
      .map((inv: any) => `• Invoice: ${inv.invoice_no || "Invoice"} — ${inv.customer || "Customer"} — ${money(inv.total_amount || inv.amount || 0)} — ${inv.status || "Status not set"}`);

    const workOrderMatches = workOrders
      .filter((wo: any) => contains(wo.work_order_no) || contains(wo.customer) || contains(wo.service) || contains(wo.notes) || contains(wo.technician))
      .slice(0, 6)
      .map((wo: any) => `• Work Order: ${wo.work_order_no || "WO"} — ${wo.customer || "Customer"} — ${wo.service || "Service"} — ${wo.status || "Status not set"}`);

    const receiptMatches = receipts
      .filter((r: any) => contains(r.receipt_no) || contains(r.customer) || contains(r.invoice_no) || contains(r.notes))
      .slice(0, 6)
      .map((r: any) => `• Receipt: ${r.receipt_no || "Receipt"} — ${r.customer || "Customer"} — ${money(r.amount || 0)} — ${r.payment_method || "Payment"}`);

    const vendorMatches = vendors
      .filter((v) => contains(v.vendor_name) || contains(v.phone) || contains(v.email) || contains(v.address))
      .slice(0, 6)
      .map((v) => `• Vendor: ${v.vendor_name || "Vendor"}${v.phone ? ` — ${v.phone}` : ""}${v.email ? ` — ${v.email}` : ""}`);

    const lines = [
      ...customerMatches,
      ...quoteMatches,
      ...invoiceMatches,
      ...workOrderMatches,
      ...receiptMatches,
      ...vendorMatches,
    ];

    return lines.length
      ? `Smart Search results for "${term}":\n${lines.join("\n")}\n\nTip: copy the document number or customer name, then open the related module to edit it.`
      : `No loaded ERP records found for "${term}". Try a customer name, phone number, invoice number, quote number, receipt number, service name, or vendor name.`;
  }

  function formatAiBusinessSummary() {
    const pendingQuoteList = quotes.filter((q: any) => !String(q.status || "").toLowerCase().includes("accepted") && !String(q.status || "").toLowerCase().includes("converted"));
    const overdueInvoices = invoices.filter((inv: any) => Number(inv.balance_due || inv.total_amount || inv.amount || 0) > 0 && !String(inv.status || "").toLowerCase().includes("paid"));
    const openWorkOrders = workOrders.filter((wo: any) => !String(wo.status || "").toLowerCase().includes("complete") && !String(wo.status || "").toLowerCase().includes("closed"));
    const today = new Date().toISOString().slice(0, 10);
    const todayJobs = jobs.filter((j: any) => String(j.job_date || "").slice(0, 10) === today);
    const todayReceipts = receipts.filter((r: any) => String(r.receipt_date || "").slice(0, 10) === today);
    const todayReceiptAmount = todayReceipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

    return `${greetingText()} Anil, here is your Aashan ERP business summary:\n\nFinancials\n• Revenue: ${money(paidRevenue)}\n• Expenses: ${money(totalVendorPaymentAmount)}\n• Net Profit: ${money(netProfit)}\n• Accounts Receivable: ${money(accountsReceivable)}\n• Bank/Cash Balance: ${money(bankBalance)}\n• Receipts Today: ${money(todayReceiptAmount)}\n\nWork\n• Jobs Today: ${todayJobs.length}\n• Open Work Orders: ${openWorkOrders.length}\n• Pending Quotes: ${pendingQuoteList.length}\n• Unpaid Invoices: ${overdueInvoices.length}\n\nRecommended Actions\n• Follow up top pending quotes\n• Review unpaid invoices and send reminders\n• Check open work orders before end of day\n• Review Bank Register for latest cash movement`;
  }


  function getAiAmount(record: any) {
    return Number(record?.balance_due || record?.total_amount || record?.amount || record?.total || 0);
  }

  function getOpenInvoicesForAi() {
    return [...invoices]
      .filter((inv: any) => getAiAmount(inv) > 0 && !String(inv.status || "").toLowerCase().includes("paid"))
      .sort((a: any, b: any) => getAiAmount(b) - getAiAmount(a));
  }

  function formatAiDailyBrief() {
    const today = new Date().toISOString().slice(0, 10);
    const todayJobs = jobs.filter((j: any) => String(j.job_date || j.date || "").slice(0, 10) === today);
    const todayWorkOrders = workOrders.filter((wo: any) => String(wo.scheduled_date || wo.work_date || wo.date || "").slice(0, 10) === today);
    const openInvoices = getOpenInvoicesForAi();
    const openWorkOrders = workOrders.filter((wo: any) => {
      const status = String(wo.status || "").toLowerCase();
      return !status.includes("complete") && !status.includes("closed") && !status.includes("cancel");
    });
    const pendingQuotes = quotes.filter((q: any) => {
      const status = String(q.status || "").toLowerCase();
      return !status.includes("accepted") && !status.includes("converted") && !status.includes("rejected") && !status.includes("cancel");
    });
    const todayReceipts = receipts.filter((r: any) => String(r.receipt_date || r.date || "").slice(0, 10) === today);
    const todayCash = todayReceipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);

    const topActions = [
      openInvoices.length ? `Send payment reminders for ${openInvoices.slice(0, 3).map((inv: any) => inv.customer || inv.invoice_no || "Invoice").join(", ")}.` : "No unpaid invoice reminder needed from loaded records.",
      pendingQuotes.length ? `Follow up ${pendingQuotes.length} pending quote${pendingQuotes.length === 1 ? "" : "s"}.` : "No pending quote follow-up found.",
      openWorkOrders.length ? `Review ${openWorkOrders.length} open work order${openWorkOrders.length === 1 ? "" : "s"}.` : "No open work order found.",
    ];

    return `${greetingText()} Anil, here is today's Aashan AI brief:\n\nToday\n• Jobs scheduled: ${todayJobs.length}\n• Work orders scheduled: ${todayWorkOrders.length}\n• Receipts today: ${money(todayCash)}\n\nBusiness Position\n• Revenue: ${money(paidRevenue)}\n• Expenses: ${money(totalVendorPaymentAmount)}\n• Net Profit: ${money(netProfit)}\n• Bank/Cash Balance: ${money(bankBalance)}\n• Accounts Receivable: ${money(accountsReceivable)}\n\nAttention Needed\n• Unpaid invoices: ${openInvoices.length}\n• Pending quotes: ${pendingQuotes.length}\n• Open work orders: ${openWorkOrders.length}\n\nRecommended Actions\n${topActions.map((x) => `• ${x}`).join("\n")}`;
  }

  function formatAiAccountingAssistant(promptText?: string) {
    const prompt = String(promptText || aashanAiPrompt || "").toLowerCase();
    const openInvoices = getOpenInvoicesForAi();
    const openInvoiceTotal = openInvoices.reduce((sum: number, inv: any) => sum + getAiAmount(inv), 0);
    const margin = paidRevenue ? (netProfit / paidRevenue) * 100 : 0;

    if (prompt.includes("owner") || prompt.includes("equity")) {
      return `Owner's Equity is the owner's value in the business after liabilities are removed from assets.\n\nSimple formula:\nAssets - Liabilities = Owner's Equity\n\nIn Aashan ERP, Owner's Equity is affected by:\n• Business profit or loss\n• Owner investments\n• Owner draws / withdrawals\n• Opening balances\n\nCurrent loaded summary:\n• Revenue: ${money(paidRevenue)}\n• Expenses: ${money(totalVendorPaymentAmount)}\n• Net Profit: ${money(netProfit)}\n\nIf Owner's Equity looks wrong, review opening balances, journal entries, and whether all income/expense transactions are posted to the correct ledger accounts.`;
    }

    if (prompt.includes("profit") || prompt.includes("margin")) {
      return `Profit Analysis\n\n• Revenue: ${money(paidRevenue)}\n• Expenses: ${money(totalVendorPaymentAmount)}\n• Net Profit: ${money(netProfit)}\n• Profit Margin: ${margin.toFixed(1)}%\n\nAashan AI recommendation:\n• Review high material and vendor payment entries.\n• Compare job profitability before discounting new quotes.\n• Use payment reminders to convert outstanding A/R into cash.`;
    }

    if (prompt.includes("receivable") || prompt.includes("ar") || prompt.includes("unpaid") || prompt.includes("owe")) {
      const top = openInvoices.slice(0, 8).map((inv: any) => `• ${inv.customer || "Customer"} — ${inv.invoice_no || "Invoice"} — ${money(getAiAmount(inv))}`).join("\n");
      return `Accounts Receivable Review\n\n• Open invoice count: ${openInvoices.length}\n• Open invoice total: ${money(openInvoiceTotal)}\n\n${top || "No open invoices found."}\n\nAashan AI recommendation:\nSend reminders for the oldest and highest-balance invoices first.`;
    }

    return `Accounting Assistant\n\n• Revenue: ${money(paidRevenue)}\n• Expenses: ${money(totalVendorPaymentAmount)}\n• Net Profit: ${money(netProfit)}\n• Bank/Cash Balance: ${money(bankBalance)}\n• Accounts Receivable: ${money(accountsReceivable)}\n\nAsk examples:\n• Explain owner's equity\n• Why did profit drop?\n• Show unpaid invoices\n• Explain accounts receivable`;
  }

  function formatAiJobProfitability() {
    const jobCards = jobs.slice(0, 12).map((j: any) => {
      const customerName = j.customer || j.customer_name || "Customer";
      const relatedInvoices = invoices.filter((inv: any) => String(inv.customer || "").toLowerCase().includes(String(customerName).toLowerCase()));
      const revenue = relatedInvoices.reduce((sum: number, inv: any) => sum + Number(inv.total_amount || inv.amount || inv.total || 0), 0);
      const relatedExpenses = expenses.filter((exp: any) => String(exp.customer || exp.job || exp.description || "").toLowerCase().includes(String(customerName).toLowerCase()));
      const cost = relatedExpenses.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);
      const profit = revenue - cost;
      const margin = revenue ? (profit / revenue) * 100 : 0;
      return `• ${customerName} — Revenue ${money(revenue)} — Cost ${money(cost)} — Profit ${money(profit)} — Margin ${margin.toFixed(1)}%`;
    });

    return `Job Profitability Snapshot\n\n${jobCards.length ? jobCards.join("\n") : "No job records loaded yet."}\n\nAashan AI recommendation:\nTrack labor, materials, travel, and vendor costs against each job so future quotes can be priced from real profit history.`;
  }

  function formatAiReportExplainer(promptText?: string) {
    const prompt = String(promptText || aashanAiPrompt || "").toLowerCase();
    if (prompt.includes("balance sheet")) {
      return `Balance Sheet Explainer\n\nThe Balance Sheet shows what the business owns, owes, and the owner's equity.\n\nMain sections:\n• Assets: cash, bank, receivables, equipment\n• Liabilities: payables, loans, taxes due\n• Equity: owner's value in the business\n\nUse drill-down from each amount to verify the transactions behind the balance.`;
    }
    if (prompt.includes("profit") || prompt.includes("p&l") || prompt.includes("income")) {
      return `Profit & Loss Explainer\n\nThe P&L shows revenue minus expenses for a selected period.\n\nCurrent loaded view:\n• Revenue: ${money(paidRevenue)}\n• Expenses: ${money(totalVendorPaymentAmount)}\n• Net Profit: ${money(netProfit)}\n\nUse this report to understand if pricing, materials, labor, or overhead are affecting profit.`;
    }
    if (prompt.includes("trial")) {
      return `Trial Balance Explainer\n\nThe Trial Balance lists debit and credit balances for ledger accounts. Total debits should equal total credits.\n\nIf it does not balance, check manual journals, posting profiles, and incomplete transaction posting.`;
    }
    return `Report Assistant\n\nI can explain Balance Sheet, Profit & Loss, Trial Balance, General Ledger, Bank Register, Customer Ledger, and Vendor Ledger.\n\nAsk: explain profit and loss, explain owner equity, explain trial balance, or why is AR high.`;
  }

  function formatAiNextBestActions() {
    const openInvoices = getOpenInvoicesForAi();
    const pendingQuotes = quotes.filter((q: any) => {
      const status = String(q.status || "").toLowerCase();
      return !status.includes("accepted") && !status.includes("converted") && !status.includes("rejected") && !status.includes("cancel");
    });
    const actions = [
      openInvoices.length ? `Send payment reminders for ${openInvoices.slice(0, 3).map((inv: any) => inv.customer || inv.invoice_no || "Invoice").join(", ")}.` : "Review today's new receipts and bank balance.",
      pendingQuotes.length ? `Follow up pending quotes: ${pendingQuotes.slice(0, 3).map((q: any) => q.quote_no || q.customer || "Quote").join(", ")}.` : "Create new quotes from recent job requests.",
      "Check document attachments before emailing customer-facing documents.",
      "Review Bank Register and confirm cash/receipt posting.",
      "Use Job Profitability to identify which services are making the most margin.",
    ];
    return `Aashan AI Next Best Actions\n\n${actions.map((x) => `• ${x}`).join("\n")}`;
  }

  function runAashanAI(customPrompt?: string) {
    const prompt = (customPrompt ?? aashanAiPrompt).trim();
    const lower = prompt.toLowerCase();
    const overdueInvoices = invoices.filter((inv: any) => Number(inv.balance_due || inv.total || 0) > 0 && !String(inv.status || "").toLowerCase().includes("paid"));
    const pendingQuoteList = quotes.filter((q: any) => !String(q.status || "").toLowerCase().includes("accepted") && !String(q.status || "").toLowerCase().includes("converted"));
    const customerName = findCustomerNameFromPrompt(prompt);

    if (!prompt) {
      setAashanAiResponse("Type what you need, for example: create quote for Roy, find unpaid invoices, write invoice email, or summarize business.");
      return;
    }

    if (lower.includes("unpaid") || lower.includes("owe") || lower.includes("outstanding")) {
      const top = overdueInvoices.slice(0, 8).map((inv: any) => `• ${inv.customer || "Customer"} — ${inv.invoice_no || "Invoice"} — ${money(inv.balance_due || inv.total || 0)}`).join("\n");
      setAashanAiResponse(top ? `Outstanding invoices:\n${top}\n\nOpen Sales Invoices to review or send reminders.` : "No unpaid invoices found from the loaded invoice list.");
      return;
    }

    if (lower.includes("daily") || lower.includes("brief") || lower.includes("today")) {
      setAashanAiResponse(formatAiDailyBrief());
      return;
    }

    if (lower.includes("summary") || lower.includes("business") || lower.includes("dashboard") || lower.includes("how is")) {
      setAashanAiResponse(formatAiBusinessSummary());
      return;
    }

    if (lower.includes("job profit") || lower.includes("profitability") || lower.includes("job margin")) {
      setAashanAiResponse(formatAiJobProfitability());
      return;
    }

    if (lower.includes("explain report") || lower.includes("balance sheet") || lower.includes("trial balance") || lower.includes("p&l") || lower.includes("general ledger")) {
      setAashanAiResponse(formatAiReportExplainer(prompt));
      return;
    }

    if (lower.includes("accounting") || lower.includes("owner") || lower.includes("equity") || lower.includes("profit") || lower.includes("margin") || lower.includes("receivable") || lower.includes("ar")) {
      setAashanAiResponse(formatAiAccountingAssistant(prompt));
      return;
    }

    if (lower.includes("next action") || lower.includes("what next") || lower.includes("recommend")) {
      setAashanAiResponse(formatAiNextBestActions());
      return;
    }

    if (lower.includes("email") || lower.includes("reminder") || lower.includes("follow up") || lower.includes("follow-up")) {
      let kind: "quote" | "invoice" | "receipt" | "reminder" | "followup" = "followup";
      if (lower.includes("quote")) kind = "quote";
      else if (lower.includes("invoice")) kind = "invoice";
      else if (lower.includes("receipt") || lower.includes("payment received")) kind = "receipt";
      else if (lower.includes("reminder") || lower.includes("overdue") || lower.includes("unpaid")) kind = "reminder";
      setAashanAiResponse(buildAashanAIEmail(kind, prompt));
      return;
    }

    if (lower.includes("quote") || lower.includes("estimate")) {
      const workText = prompt.replace(/create|make|generate|quote|estimate|for/gi, " ").replace(/\s+/g, " ").trim();
      setAashanAiResponse(`Draft quote wording:\n\nScope of Work:\n${workText || "Enter service description here"}\n\nSuggested line items:\n• Labor and installation service\n• Materials and supplies\n• Cleanup and finishing\n• Transportation / convenience charge if applicable\n\nCustomer note:\nPaint will be provided by the customer when applicable. Other standard materials, fasteners, caulk, masking, and preparation materials can be provided by Aashan & Co LLC unless stated otherwise.\n\nClick Quotes and paste this into the transaction description.`);
      return;
    }

    const matchedCustomers = customers.filter((c) => String(c.name || "").toLowerCase().includes(lower) || String(c.phone || "").toLowerCase().includes(lower) || String(c.email || "").toLowerCase().includes(lower)).slice(0, 5);
    const matchedInvoices = invoices.filter((inv: any) => String(inv.invoice_no || "").toLowerCase().includes(lower) || String(inv.customer || "").toLowerCase().includes(lower)).slice(0, 5);
    const matchedQuotes = quotes.filter((q: any) => String(q.quote_no || "").toLowerCase().includes(lower) || String(q.customer || "").toLowerCase().includes(lower)).slice(0, 5);
    const resultLines = [
      ...matchedCustomers.map((c) => `• Customer: ${c.name} ${c.phone ? `(${c.phone})` : ""}`),
      ...matchedInvoices.map((inv: any) => `• Invoice: ${inv.invoice_no || "Invoice"} — ${inv.customer || "Customer"} — ${money(inv.total || 0)}`),
      ...matchedQuotes.map((q: any) => `• Quote: ${q.quote_no || "Quote"} — ${q.customer || "Customer"} — ${money(q.total || 0)}`),
    ];
    setAashanAiResponse(resultLines.length ? `I found these records:\n${resultLines.join("\n")}` : "I did not find an exact loaded record. Try a customer name, invoice number, quote number, or ask for a quote/email/business summary.");
  }

  type CommandAction = {
    title: string;
    subtitle: string;
    keywords: string;
    run: () => void;
  };

  function openCommandTarget(tab: typeof activeTab) {
    setCommandPaletteOpen(false);
    setCommandQuery("");
    openTab(tab);
  }

  function startNewQuoteFromCommand() {
    setQuote({ ...emptyQuote, quote_no: nextQuoteNo(), quote_date: new Date().toISOString().slice(0, 10), status: "Draft" });
    setQuoteLines([{ ...emptyTransactionLine }]);
    setEditingQuoteId(null);
    openCommandTarget("quotes");
  }

  function startNewInvoiceFromCommand() {
    setInvoice({ ...emptyInvoice, invoice_no: nextInvoiceNo(), invoice_date: new Date().toISOString().slice(0, 10), status: "Draft" });
    setInvoiceLines([{ ...emptyTransactionLine }]);
    setEditingInvoiceId(null);
    openCommandTarget("invoices");
  }

  function buildCommandActions(): CommandAction[] {
    const actions: CommandAction[] = [
      { title: "Open Dashboard", subtitle: "Go to business overview and KPIs", keywords: "dashboard home kpi revenue profit", run: () => openCommandTarget("dashboard") },
      { title: "Create Quote", subtitle: "Open a new sales quote", keywords: "new quote estimate sales create", run: startNewQuoteFromCommand },
      { title: "Create Invoice", subtitle: "Open a new sales invoice", keywords: "new invoice bill customer create", run: startNewInvoiceFromCommand },
      { title: "Create Customer", subtitle: "Open customer master entry", keywords: "new customer client add", run: () => { setCustomer(emptyCustomer); setEditingCustomerId(null); openCommandTarget("customers"); } },
      { title: "Create Work Order", subtitle: "Open work order entry", keywords: "new work order job technician service", run: () => { setWorkOrder(emptyWorkOrder); setEditingWorkOrderId(null); openCommandTarget("workorders"); } },
      { title: "Receive Customer Payment", subtitle: "Open customer receipts", keywords: "receipt payment receive paid cash bank", run: () => { setReceipt(emptyReceipt); setEditingReceiptId(null); openCommandTarget("receipts"); } },
      { title: "Open Reports", subtitle: "Bank Register, P&L, Balance Sheet, GL", keywords: "reports bank register profit loss balance sheet general ledger", run: () => openCommandTarget("reports") },
      { title: "Open Accounting", subtitle: "Chart of accounts and accounting tools", keywords: "accounting accounts ledger posting", run: () => openCommandTarget("accounting") },
      { title: "Aashan AI Daily Brief", subtitle: "Show today's jobs, cash, profit, AR, and actions", keywords: "ai daily brief summary business actions", run: () => { setAashanAiResponse(formatAiDailyBrief()); openCommandTarget("aashan_ai"); } },
      { title: "Aashan AI Search", subtitle: "Ask AI to find records or write emails", keywords: "ai search ask email quote business", run: () => openCommandTarget("aashan_ai") },
    ];

    return actions.filter((action) => {
      const q = commandQuery.trim().toLowerCase();
      if (!q) return true;
      return `${action.title} ${action.subtitle} ${action.keywords}`.toLowerCase().includes(q);
    });
  }

  function runFirstCommand() {
    const first = buildCommandActions()[0];
    if (first) first.run();
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
      aashan_ai: "Aashan AI",
      masters: "Masters",
      import: "Import / Export",
    };
    return labels[tab] || "Aashan & Co LLC";
  }

  if (authLoading) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#eef5fb", padding: 20 }}>
        <div style={{ background: "white", borderRadius: 20, padding: 28, boxShadow: "0 18px 50px rgba(15,23,42,.12)", textAlign: "center", width: "min(420px, 100%)" }}>
          <img src="/aashan-logo.png" alt="Aashan & Co LLC" style={{ width: 86, height: 86, objectFit: "contain", marginBottom: 12 }} />
          <h1 style={{ margin: 0, color: "#0f172a", fontSize: 26 }}>Aashan & Co LLC</h1>
          <p style={{ color: "#64748b", marginTop: 8, marginBottom: 0 }}>Loading ERP...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #0f2742 0%, #047e89 100%)", padding: 18 }}>
        <div style={{ width: "min(460px, 100%)", background: "white", borderRadius: 24, padding: 28, boxShadow: "0 24px 70px rgba(2,6,23,.28)" }}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <img src="/aashan-logo.png" alt="Aashan & Co LLC" style={{ width: 92, height: 92, objectFit: "contain", marginBottom: 12 }} />
            <h1 style={{ margin: 0, color: "#0f172a", fontSize: 30, fontWeight: 900 }}>Aashan & Co LLC</h1>
            <p style={{ margin: "8px 0 0", color: "#64748b", fontWeight: 700 }}>ERP Login</p>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            <label style={{ display: "grid", gap: 7, color: "#334155", fontWeight: 800 }}>
              Email
              <input
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                type="email"
                autoComplete="email"
                placeholder="Enter email"
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 12, padding: "14px 16px", fontSize: 16 }}
              />
            </label>

            <label style={{ display: "grid", gap: 7, color: "#334155", fontWeight: 800 }}>
              Password
              <input
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
                onKeyDown={(event) => { if (event.key === "Enter") login(); }}
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid #cbd5e1", borderRadius: 12, padding: "14px 16px", fontSize: 16 }}
              />
            </label>

            <button
              onClick={login}
              style={{ border: 0, borderRadius: 14, background: "#2563eb", color: "white", padding: "15px 18px", fontSize: 17, fontWeight: 900, cursor: "pointer", marginTop: 4 }}
            >
              Sign In
            </button>

            <button
              onClick={signUp}
              style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "#f8fafc", color: "#0f3f56", padding: "13px 18px", fontSize: 15, fontWeight: 900, cursor: "pointer" }}
            >
              Create Account
            </button>
          </div>

          <p style={{ color: "#64748b", fontSize: 12, lineHeight: 1.5, marginTop: 18, textAlign: "center" }}>
            Logout now fully clears the mobile/PWA session and returns to this login screen.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      {commandPaletteOpen && (
        <div className="command-backdrop" onClick={() => setCommandPaletteOpen(false)}>
          <div className="command-palette" onClick={(event) => event.stopPropagation()}>
            <div className="command-header">
              <strong>Command Palette</strong>
              <button type="button" onClick={() => setCommandPaletteOpen(false)}>×</button>
            </div>
            <input
              autoFocus
              className="command-input"
              placeholder="Type a command: quote, invoice, receipt, reports, AI..."
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") runFirstCommand();
                if (event.key === "Escape") setCommandPaletteOpen(false);
              }}
            />
            <div className="command-results">
              {buildCommandActions().map((action, index) => (
                <button key={action.title} type="button" className="command-result" onClick={action.run}>
                  <span className="command-title">{action.title}</span>
                  <span className="command-subtitle">{action.subtitle}</span>
                  {index === 0 && <span className="command-enter">Enter</span>}
                </button>
              ))}
              {buildCommandActions().length === 0 && (
                <div className="command-empty">No command found. Try quote, invoice, receipt, reports, customer, or AI.</div>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`${printCss}

.command-open-button { border: 1px solid #cbd5e1; background: #f8fafc; color: #0f2742; border-radius: 999px; padding: 10px 14px; font-weight: 900; cursor: pointer; white-space: nowrap; }
.command-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(15,23,42,.45); display: grid; place-items: start center; padding: 7vh 16px 16px; }
.command-palette { width: min(760px, 100%); background: white; border-radius: 22px; box-shadow: 0 28px 90px rgba(15,23,42,.35); overflow: hidden; border: 1px solid rgba(203,213,225,.9); }
.command-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 18px; border-bottom: 1px solid #e2e8f0; color: #0f172a; }
.command-header button { border: 0; background: #f1f5f9; color: #0f172a; border-radius: 999px; width: 34px; height: 34px; font-size: 22px; cursor: pointer; }
.command-input { width: 100%; box-sizing: border-box; border: 0; border-bottom: 1px solid #e2e8f0; padding: 18px; font-size: 18px; outline: none; }
.command-results { max-height: min(62vh, 560px); overflow-y: auto; padding: 10px; }
.command-result { position: relative; width: 100%; text-align: left; border: 1px solid transparent; background: white; border-radius: 14px; padding: 13px 100px 13px 14px; cursor: pointer; display: grid; gap: 4px; }
.command-result:hover, .command-result:focus { background: #f8fafc; border-color: #cbd5e1; outline: none; }
.command-title { color: #0f172a; font-weight: 900; font-size: 15px; }
.command-subtitle { color: #64748b; font-size: 13px; }
.command-enter { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: #e0f2fe; color: #075985; border-radius: 999px; padding: 5px 10px; font-size: 12px; font-weight: 900; }
.command-empty { padding: 18px; color: #64748b; font-weight: 700; }

.bc-action-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 18px; border-bottom: 1px solid #d7dee8; padding-bottom: 12px; }
.bc-primary { background: #008b96; color: white; border: 0; border-radius: 9px; padding: 10px 18px; font-weight: 800; cursor: pointer; }
.bc-action { background: #f8fafc; color: #0f6270; border: 1px solid #cbd5e1; border-radius: 9px; padding: 10px 14px; font-weight: 800; cursor: pointer; }
.bc-line-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.bc-copy { background: #eef6ff; color: #0f4c81; border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 10px; font-weight: 900; cursor: pointer; }
.mobile-transaction-sticky { display: none; }
.bc-general-grid { display: grid; grid-template-columns: repeat(2, minmax(260px, 1fr)); gap: 14px 38px; margin-bottom: 24px; }
.bc-lines-title { font-size: 17px; font-weight: 900; color: #0f3f56; border-bottom: 2px solid #0f3f56; padding-bottom: 8px; margin: 6px 0 10px; }
.bc-lines-wrap { width: 100%; overflow-x: auto; border: 1px solid #d7dee8; border-radius: 12px; }
.bc-lines { width: 100%; min-width: 900px; border-collapse: collapse; background: white; }
.bc-lines th { text-align: left; font-size: 12px; color: #475569; background: #f8fafc; padding: 10px; border-bottom: 1px solid #d7dee8; }
.bc-lines td { padding: 7px; border-bottom: 1px solid #e5e7eb; }
.bc-lines input, .bc-lines textarea { width: 100%; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 6px; padding: 9px; font-size: 14px; }
.bc-lines textarea.bc-line-description { min-height: 64px; max-height: none; resize: vertical; line-height: 1.35; white-space: pre-wrap; overflow: hidden; }
.bc-lines .bc-description-cell { min-width: 300px; width: 38%; white-space: normal; vertical-align: top; }
.bc-lines th:first-child { min-width: 300px; width: 38%; }
.bc-lines td { vertical-align: top; }
.bc-amount { text-align: right; font-weight: 900; white-space: nowrap; color: #0f172a; }
.bc-delete { border: 0; background: #fee2e2; color: #991b1b; border-radius: 7px; padding: 8px 10px; cursor: pointer; font-weight: 800; }
.bc-footer-grid { display: grid; grid-template-columns: minmax(260px, 1fr) minmax(260px, 360px); gap: 24px; align-items: start; margin-top: 18px; }
.bc-totals { background: #f8fafc; border: 1px solid #d7dee8; border-radius: 12px; padding: 14px; }
.bc-totals div { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; }
.bc-totals div:last-child { border-bottom: 0; }
.bc-grand { font-size: 18px; color: #0f6270; }

.doc-photos-box { grid-column: 1 / -1; border: 1px solid #dbe5ef; border-radius: 14px; padding: 14px; background: #f8fafc; margin-top: 10px; }
.doc-photos-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
.doc-photos-head b { display: block; color: #0f172a; font-weight: 900; }
.doc-photos-head small { display: block; color: #64748b; margin-top: 3px; }
.doc-photo-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.doc-photo-upload { background: #0f8f9a; color: white; padding: 10px 14px; border-radius: 10px; font-weight: 900; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
.doc-photo-upload.secondary { background: #2563eb; }
.doc-photo-upload input { display: none; }
.doc-photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-top: 14px; }
.doc-photo-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; display: grid; gap: 8px; }
.doc-photo-card img { width: 100%; height: 120px; object-fit: cover; border-radius: 10px; background: #e2e8f0; }
.doc-photo-card b { font-size: 12px; overflow-wrap: anywhere; }
.doc-photo-card small { color: #64748b; }
.doc-photo-card button { border: 0; background: #fee2e2; color: #991b1b; border-radius: 8px; padding: 8px; font-weight: 800; cursor: pointer; }
.doc-photo-empty { color: #64748b; margin: 12px 0 0; }
.mobile-email-send-sticky { display: none; }

@media (max-width: 760px) {
  .doc-photo-actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr; }
  .doc-photo-upload { justify-content: center; } .bc-general-grid, .bc-footer-grid { grid-template-columns: 1fr; } .bc-action-bar { position: sticky; top: 0; background: white; z-index: 20; } .bc-lines { min-width: 760px; } .bc-lines-wrap { margin-left: -8px; margin-right: -8px; width: calc(100% + 16px); } }

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
  .bc-lines { min-width: 780px; }
  .bc-lines .bc-description-cell, .bc-lines th:first-child { min-width: 260px; width: 42%; }
  .bc-lines textarea.bc-line-description { min-height: 92px; }
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


.bankRegisterTable th, .bankRegisterTable td { padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }
.bankRegisterTable th { background: #f8fafc; color: #334155; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; }
@media (max-width: 900px) { .bank-register-toolbar-mobile { grid-template-columns: 1fr !important; } }


/* v2.4 Mobile Phase 1 + Phase 3: PWA-safe mobile command center */
.mobile-command-center { display: none; }
@media (max-width: 900px) {
  .mobile-command-center {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin: 0 0 12px;
  }
  .mobile-command-center button,
  .mobile-command-center span,
  .mobile-status-pill {
    border: 1px solid #d7dee8;
    background: white;
    border-radius: 14px;
    padding: 12px;
    font-weight: 900;
    color: #0f3f56;
    box-shadow: 0 8px 20px rgba(15,23,42,0.06);
    text-align: center;
  }
  .mobile-status-pill.online { color: #047857; background: #ecfdf5; border-color: #bbf7d0; }
  .mobile-status-pill.offline { color: #b45309; background: #fffbeb; border-color: #fde68a; }
  .doc-photo-upload { width: 100%; justify-content: center; min-height: 48px; }
  .doc-photo-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .doc-photo-card img { height: 110px; }
  .email-modal { max-height: 94vh; overflow-y: auto; }
  .mobile-email-send-sticky { display: block !important; position: sticky; bottom: 0; z-index: 50; padding: 12px; background: white; border-top: 1px solid #e5e7eb; }
  .mobile-email-send-sticky button { width: 100%; min-height: 56px; border-radius: 14px; background: #2563eb; color: white; border: 0; font-weight: 900; }
}
@media (max-width: 520px) {
  .mobile-command-center { grid-template-columns: 1fr; }
}



/* v3.2.2 Mobile Navigation + Sticky Actions: UI-only changes */
@media (max-width: 900px) {
  body { overscroll-behavior-y: contain; }
  main, .app-screen { -webkit-overflow-scrolling: touch; }
  .topBar {
    position: sticky !important;
    top: 0 !important;
    z-index: 35 !important;
    background: rgba(238,243,248,0.96) !important;
    backdrop-filter: blur(12px) !important;
    border-radius: 0 0 18px 18px !important;
    margin: -4px -4px 12px !important;
    padding: 10px 10px 12px !important;
  }
  .topBar h2 { font-size: 20px !important; margin-bottom: 2px !important; }
  .topBar p { display: none !important; }
  .topBar input { min-height: 44px !important; font-size: 16px !important; }
  input, select, textarea {
    min-height: 46px !important;
    font-size: 16px !important;
    border-radius: 12px !important;
  }
  textarea { min-height: 92px !important; }
  button { touch-action: manipulation; }
  .mobile-sticky-actions,
  .bc-action-bar {
    position: sticky !important;
    bottom: 74px !important;
    z-index: 45 !important;
    background: rgba(255,255,255,0.98) !important;
    backdrop-filter: blur(10px) !important;
    border: 1px solid #d7dee8 !important;
    border-radius: 16px !important;
    padding: 10px !important;
    margin: 14px 0 10px !important;
    box-shadow: 0 14px 32px rgba(15,23,42,0.14) !important;
  }
  .mobile-sticky-actions button,
  .bc-action-bar button {
    min-height: 48px !important;
    border-radius: 12px !important;
    font-weight: 900 !important;
  }
  .bottom-nav {
    padding: 7px 8px calc(7px + env(safe-area-inset-bottom)) !important;
  }
  .bottom-nav button {
    min-height: 54px !important;
    font-size: 11px !important;
    justify-content: center !important;
  }
  .floating-add {
    bottom: calc(92px + env(safe-area-inset-bottom)) !important;
    right: 16px !important;
  }
  .quick-add-sheet {
    bottom: calc(164px + env(safe-area-inset-bottom)) !important;
    right: 16px !important;
    left: 16px !important;
    min-width: 0 !important;
  }
  .quick-add-sheet button { min-height: 48px !important; }
}


/* v3.2.4 PWA Polish + Mobile Reports: UI-only, no accounting/report formulas changed */
.pwa-update-banner { display: none; }
@media (max-width: 900px) {
  .report-tabs {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
    width: 100% !important;
  }
  .report-tabs button {
    min-height: 52px !important;
    width: 100% !important;
    text-align: center !important;
    white-space: normal !important;
    line-height: 1.15 !important;
  }
  .report-toolbar,
  .bank-register-toolbar {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    width: 100% !important;
    min-width: 0 !important;
    overflow: visible !important;
  }
  .bank-register-actions {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    width: 100% !important;
    justify-content: stretch !important;
  }
  .bank-register-actions button {
    width: 100% !important;
    min-height: 48px !important;
  }
  .bank-register-summary,
  .report-summary-grid {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
    width: 100% !important;
    min-width: 0 !important;
    overflow: visible !important;
  }
  .bank-register-summary-card {
    min-width: 0 !important;
    width: 100% !important;
  }
  .bank-register-summary-card span,
  .bank-register-summary-card b {
    overflow-wrap: anywhere !important;
  }
  .report-table-wrap,
  .bank-register-table-wrap {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: auto !important;
    overflow-y: visible !important;
    -webkit-overflow-scrolling: touch !important;
    overscroll-behavior-x: contain !important;
    border-radius: 16px !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    touch-action: pan-x pan-y !important;
  }
  .bankRegisterTable {
    width: max-content !important;
    min-width: 920px !important;
    table-layout: auto !important;
  }
  .bankRegisterTable th,
  .bankRegisterTable td {
    white-space: nowrap !important;
    font-size: 13px !important;
  }
  .bankRegisterTable thead th {
    position: sticky !important;
    top: 0 !important;
    z-index: 4 !important;
  }
  .bankRegisterTable td:nth-child(6),
  .bankRegisterTable th:nth-child(6) {
    min-width: 240px !important;
    max-width: 320px !important;
    white-space: normal !important;
  }
  /* AccountingEngine mobile report fix */
  .accounting-mobile-wrap {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }
  .accounting-summary-grid {
    display: grid !important;
    grid-template-columns: 1fr !important;
    gap: 10px !important;
    width: 100% !important;
  }
  .accounting-summary-grid > * {
    width: 100% !important;
    min-width: 0 !important;
  }
  .accounting-table-wrap {
    width: 100% !important;
    max-width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
    touch-action: pan-x pan-y !important;
  }
  .accounting-table {
    width: max-content !important;
    min-width: 900px !important;
  }
  .accounting-table th {
    position: sticky !important;
    top: 0 !important;
    z-index: 3 !important;
  }
  .floating-add {
    bottom: calc(104px + env(safe-area-inset-bottom)) !important;
    right: 18px !important;
    width: 58px !important;
    height: 58px !important;
    box-shadow: 0 12px 32px rgba(0,139,150,0.36) !important;
  }
  .pwa-install-button {
    bottom: calc(90px + env(safe-area-inset-bottom)) !important;
    right: 14px !important;
  }
  .pwa-update-banner {
    display: flex !important;
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: calc(86px + env(safe-area-inset-bottom));
    z-index: 100000;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 16px;
    background: #0f172a;
    color: white;
    box-shadow: 0 18px 50px rgba(15,23,42,0.25);
    font-weight: 800;
  }
  .pwa-update-banner button {
    border: 0;
    border-radius: 12px;
    padding: 10px 12px;
    background: #2563eb;
    color: white;
    font-weight: 900;
  }
}
@media (max-width: 420px) {
  .report-tabs { grid-template-columns: 1fr !important; }
  .bank-register-actions { grid-template-columns: 1fr !important; }
}


/* v3.2.3 Mobile Performance: UI-only optimization, no accounting/report logic changes */
@media (max-width: 900px) {
  html, body {
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  .app-screen {
    min-height: 100dvh;
    overflow-x: hidden;
    contain: layout style;
  }
  .mainContent,
  .card,
  .tableWrap,
  .bc-card,
  .bankRegisterWrap {
    content-visibility: auto;
    contain-intrinsic-size: 1px 720px;
  }
  .tableWrap, .bankRegisterWrap {
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    scroll-snap-type: none;
  }
  .sidebar-open {
    will-change: transform;
  }
  .bottom-nav, .floating-add, .quick-add-sheet, .mobile-sticky-actions, .bc-action-bar {
    transform: translateZ(0);
    will-change: transform;
  }
  input:focus, select:focus, textarea:focus {
    scroll-margin-bottom: 180px;
    outline: 2px solid rgba(37,99,235,0.22);
    outline-offset: 1px;
  }
  .formGrid, .bc-general-grid {
    gap: 12px !important;
  }
  .emptyState {
    min-height: 120px;
  }
}



.email-file-attach {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  padding: 12px 14px;
  border: 1px dashed #94a3b8;
  border-radius: 12px;
  background: #f8fafc;
  color: #0f4c5c;
  font-weight: 900;
  cursor: pointer;
}
.email-file-attach input { display: none; }
.email-attachment button {
  margin-left: auto;
  border: 0;
  border-radius: 8px;
  padding: 7px 9px;
  background: #fee2e2;
  color: #991b1b;
  font-weight: 800;
}

.tax-clear-btn {
  margin-top: 6px;
  width: 100%;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #0f4c5c;
  border-radius: 8px;
  padding: 7px 8px;
  font-weight: 800;
  cursor: pointer;
}
@media (max-width: 760px) {
  
.email-file-attach {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 10px 0;
  padding: 12px 14px;
  border: 1px dashed #94a3b8;
  border-radius: 12px;
  background: #f8fafc;
  color: #0f4c5c;
  font-weight: 900;
  cursor: pointer;
}
.email-file-attach input { display: none; }
.email-attachment button {
  margin-left: auto;
  border: 0;
  border-radius: 8px;
  padding: 7px 9px;
  background: #fee2e2;
  color: #991b1b;
  font-weight: 800;
}

.tax-clear-btn { min-height: 40px; font-size: 14px; }
}
`}
</style>

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
            <button
              style={styles.syncBtn}
              onClick={async () => {
                await loadData();
                setInitialDataLoaded(true);
              }}
            >
              {loading ? "Syncing..." : "Sync"}
            </button>
            <div style={{ position: "relative" }}>
              <button
                style={styles.userMenuButton}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                👤 {profile?.full_name || profile?.email || "Anil Thomas"} ▾
              </button>
              {userMenuOpen && (
                <div style={styles.userMenu}>
                  <div style={styles.userMenuName}>
                    {profile?.full_name || "Aashan ERP User"}
                  </div>
                  <div style={styles.userMenuRole}>
                    {profile?.role || "User"}
                  </div>
                  <div style={styles.userMenuStatusPanel}>
                    <div style={isOnline ? styles.userMenuStatusOnline : styles.userMenuStatusOffline}>
                      {isOnline ? "● Online" : "● Offline mode"}
                    </div>
                    <button
                      type="button"
                      style={styles.userMenuStatusButton}
                      onClick={() => {
                        installPwaApp();
                        setUserMenuOpen(false);
                      }}
                    >
                      📲 Install App
                    </button>
                    <button
                      type="button"
                      style={styles.userMenuStatusButton}
                      onClick={() => {
                        enableMobileBiometric();
                        setUserMenuOpen(false);
                      }}
                    >
                      {biometricEnabled ? "🔐 Face ID On" : "🔐 Enable Face ID"}
                    </button>
                    <button
                      type="button"
                      style={styles.userMenuStatusButton}
                      onClick={() => {
                        if (pushEnabled) disablePushNotifications();
                        else enablePushNotifications();
                        setUserMenuOpen(false);
                      }}
                    >
                      {pushEnabled ? "🔔 Push On" : "🔔 Enable Push"}
                    </button>
                    <div style={styles.userMenuPushNote}>
                      {notificationPermission === "denied"
                        ? "Notifications blocked in browser settings"
                        : notificationPermission === "unsupported"
                          ? "Push support depends on device/browser"
                          : pushEnabled
                            ? "Mobile alerts enabled"
                            : "Tap to allow mobile alerts"}
                    </div>
                    {offlineQueueCount > 0 && (
                      <div style={styles.userMenuQueueNote}>
                        {offlineQueueCount} waiting to sync
                      </div>
                    )}
                  </div>
                  <button
                    style={styles.userMenuItem}
                    onClick={() => {
                      setActiveTab("masters");
                      setUserMenuOpen(false);
                    }}
                  >
                    Settings
                  </button>
                  <button style={styles.userMenuLogout} onClick={logout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
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

              <SidebarGroup title="AI Assistant">
                <SideButton
                  label="Aashan AI"
                  active={activeTab === "aashan_ai"}
                  onClick={() => openTab("aashan_ai")}
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
                <button
                  type="button"
                  className="command-open-button"
                  onClick={() => { setCommandPaletteOpen(true); setCommandQuery(""); }}
                  title="Open command palette"
                >
                  ⌘K / Ctrl+K
                </button>
              </div>

              {/* Quick action tiles are kept only on the Dashboard page under Quick Actions. */}

              {loading && <p>Loading...</p>}

              {activeTab !== "aashan_ai" && (
                <button
                  className="aashan-ai-floating-button"
                  onClick={() => openTab("aashan_ai")}
                  style={{ position: "fixed", right: 22, bottom: 84, zIndex: 30, border: 0, borderRadius: 999, padding: "13px 18px", background: "#0f2742", color: "white", fontWeight: 900, boxShadow: "0 16px 40px rgba(15,39,66,.28)", cursor: "pointer" }}
                >
                  ✨ Aashan AI
                </button>
              )}

              {activeTab === "dashboard" && (
                <>
                  <div style={styles.financeDashboard}>
                    <div style={styles.financePanel}>
                      <div style={styles.financePanelHeader}>
                        <span style={styles.financeIconBlue}>⚖️</span>
                        <div>
                          <h2 style={styles.financePanelTitle}>Balance Sheet</h2>
                          <p style={styles.financePanelSub}>Assets, liabilities, and equity</p>
                        </div>
                      </div>

                      <FinancialBlock
                        title="Assets"
                        amount={balanceSheetAssets}
                        tone="#059669"
                        onClick={() => openDashboardDrillDown("balance_sheet")}
                        rows={[
                          { label: "Accounts receivable", amount: accountsReceivable, bold: true, onClick: () => openDashboardDrillDown("customer_statement") },
                          { label: "Accounts receivable", amount: accountsReceivable, indent: true, onClick: () => openDashboardDrillDown("customer_statement") },
                          { label: "Cash & Bank", amount: bankBalance, bold: true, onClick: () => openDashboardDrillDown("bank_register", "All Accounts", "All Transactions") },
                          ...bankAccountBalanceRows.map((row) => ({
                            label: row.label,
                            amount: row.amount,
                            indent: true,
                            onClick: () => openDashboardDrillDown("bank_register", row.label, "All Transactions"),
                          })),
                        ]}
                      />

                      <FinancialBlock
                        title="Liabilities"
                        amount={balanceSheetLiabilities}
                        tone="#dc2626"
                        onClick={() => openDashboardDrillDown("balance_sheet")}
                        rows={[
                          { label: "Accounts payable", amount: accountsPayable, bold: true, onClick: () => openDashboardDrillDown("vendor_statement") },
                          { label: "Accounts Payable", amount: accountsPayable, indent: true, onClick: () => openDashboardDrillDown("vendor_statement") },
                          { label: "Tax Payable", amount: taxPayable, bold: true, onClick: () => openDashboardDrillDown("general_ledger") },
                          { label: "Tax payable", amount: taxPayable, indent: true, onClick: () => openDashboardDrillDown("general_ledger") },
                        ]}
                      />

                      <FinancialBlock
                        title="Equity"
                        amount={balanceSheetEquity}
                        tone="#7c3aed"
                        onClick={() => openDashboardDrillDown("balance_sheet")}
                        rows={[
                          { label: "Owner's Capital / Opening Balance", amount: ownerCapital, onClick: () => openDashboardDrillDown("balance_sheet") },
                          { label: "Current Year Profit", amount: netProfit, onClick: () => openDashboardDrillDown("profit_loss") },
                        ]}
                      />
                    </div>

                    <div style={styles.financePanel}>
                      <div style={styles.financePanelHeader}>
                        <span style={styles.financeIconGreen}>📈</span>
                        <div>
                          <h2 style={styles.financePanelTitle}>Profit and Loss Statement</h2>
                          <p style={styles.financePanelSub}>Revenue, expenses, and net profit</p>
                        </div>
                      </div>

                      <FinancialBlock
                        title="Income"
                        amount={paidRevenue}
                        tone="#059669"
                        onClick={() => openDashboardDrillDown("profit_loss")}
                        rows={dashboardIncomeRows.map((row: any) => ({ ...row, onClick: () => openDashboardDrillDown("profit_loss") }))}
                      />

                      <FinancialBlock
                        title="Less Expenses"
                        amount={totalVendorPaymentAmount + totalDiscounts}
                        tone="#dc2626"
                        onClick={() => openDashboardDrillDown("profit_loss")}
                        rows={(dashboardExpenseRows.length ? dashboardExpenseRows : [{ label: "No expenses recorded", amount: 0 }]).map((row: any) => ({ ...row, onClick: () => openDashboardDrillDown("profit_loss") }))}
                      />

                      <div style={styles.netProfitCard}>
                        <div>
                          <b>Net profit (loss)</b>
                          <p style={styles.financePanelSub}>Income less expenses</p>
                        </div>
                        <strong style={{ ...styles.netProfitAmount, color: netProfit >= 0 ? "#059669" : "#dc2626" }}>
                          {money(netProfit)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <SectionCard title="Aashan AI Command Center">
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                      <div style={{ background: "linear-gradient(135deg,#0f2742,#047e89)", color: "white", borderRadius: 18, padding: 18 }}>
                        <h2 style={{ margin: 0, fontSize: 24 }}>Good day, Anil 👋</h2>
                        <p style={{ margin: "8px 0 0", opacity: .92, lineHeight: 1.45 }}>Aashan AI is ready to help with quotes, collections, jobs, emails, and accounting questions.</p>
                      </div>
                      <button style={{ textAlign: "left", padding: 18, border: "1px solid #e2e8f0", borderRadius: 18, background: "#ffffff", color: "#0f172a", cursor: "pointer", boxShadow: "0 8px 22px rgba(15,23,42,.06)" }} onClick={() => { runAashanAI("daily business brief"); openTab("aashan_ai"); }}>
                        <b>🌅 Daily Brief</b><br />
                        <span style={styles.helpText}>Today&apos;s work, cash, receivables, and recommended actions.</span>
                      </button>
                      <button style={{ textAlign: "left", padding: 18, border: "1px solid #e2e8f0", borderRadius: 18, background: "#ffffff", color: "#0f172a", cursor: "pointer", boxShadow: "0 8px 22px rgba(15,23,42,.06)" }} onClick={() => { runAashanAI("show unpaid invoices"); openTab("aashan_ai"); }}>
                        <b>💰 Collect Payments</b><br />
                        <span style={styles.helpText}>{invoices.filter((inv: any) => String(inv.status || "").toLowerCase() !== "paid").length} unpaid invoice records loaded.</span>
                      </button>
                      <button style={{ textAlign: "left", padding: 18, border: "1px solid #e2e8f0", borderRadius: 18, background: "#ffffff", color: "#0f172a", cursor: "pointer", boxShadow: "0 8px 22px rgba(15,23,42,.06)" }} onClick={() => { runAashanAI("next best actions"); openTab("aashan_ai"); }}>
                        <b>✅ Next Best Actions</b><br />
                        <span style={styles.helpText}>Follow-ups, open work, quote pipeline, and cash tasks.</span>
                      </button>
                    </div>
                  </SectionCard>

                  <div style={styles.dashboardSummaryStrip}>
                    <MiniMetric title="Total Invoices" value={money(totalInvoiceAmount)} note={`${invoices.length} Invoices`} icon="🧾" />
                    <MiniMetric title="Total Receipts" value={money(totalReceiptAmount)} note={`${receipts.length} Receipts`} icon="💵" />
                    <MiniMetric title="Total Bills" value={money(totalPurchaseInvoiceAmount)} note={`${purchaseInvoices.length} Bills`} icon="📄" />
                    <MiniMetric title="Total Payments" value={money(totalVendorPaymentAmount)} note={`${expenses.length} Payments`} icon="💳" />
                    <MiniMetric title="Bank Balance" value={money(bankBalance)} note={`${banks.length} Accounts`} icon="🏦" />
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
                      <MultiContactInput
                        label="Phone Numbers"
                        value={customer.phone}
                        placeholder="One phone per line"
                        onChange={(v: string) =>
                          setCustomer({ ...customer, phone: v })
                        }
                      />
                      <MultiContactInput
                        label="Email Addresses"
                        value={customer.email}
                        placeholder="One email per line"
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
                        <Td><ContactList value={c.phone} /></Td>
                        <Td><ContactList value={c.email} /></Td>
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
                      <MultiContactInput
                        label="Phone Numbers"
                        value={vendor.phone}
                        placeholder="One phone per line"
                        onChange={(v: string) =>
                          setVendor({ ...vendor, phone: v })
                        }
                      />
                      <MultiContactInput
                        label="Email Addresses"
                        value={vendor.email}
                        placeholder="One email per line"
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
                        <Td><ContactList value={v.phone} /></Td>
                        <Td><ContactList value={v.email} /></Td>
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
                      <button type="button" onClick={applyAashanCopilotToQuote} className="bc-action">
                        ✨ Improve Lines
                      </button>
                      <button type="button" onClick={() => openAashanCopilotEmail("quote")} className="bc-action">
                        📧 AI Email
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
                                <td className="bc-description-cell">
                                  <textarea
                                    className="bc-line-description"
                                    value={line.description}
                                    onChange={(e) =>
                                      updateQuoteLine(
                                        index,
                                        "description",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Service / item description"
                                    rows={2}
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
                                    inputMode="decimal"
                                  />
                                  <button
                                    type="button"
                                    className="tax-clear-btn"
                                    onClick={() =>
                                      updateQuoteLine(index, "tax_rate", "")
                                    }
                                  >
                                    No Tax
                                  </button>
                                </td>
                                <td className="bc-amount">
                                  ${c.total.toFixed(2)}
                                </td>
                                <td>
                                  <div className="bc-line-actions">
                                    <button
                                      type="button"
                                      onClick={() => duplicateQuoteLine(index)}
                                      className="bc-copy"
                                    >
                                      Copy
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteQuoteLine(index)}
                                      className="bc-delete"
                                    >
                                      Delete
                                    </button>
                                  </div>
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
                    <div className="mobile-transaction-sticky">
                      <div>
                        <span>Quote Total</span>
                        <strong>${documentTotals(quoteLines).total.toFixed(2)}</strong>
                      </div>
                      <button type="button" onClick={saveQuote}>Save</button>
                      <button type="button" onClick={addQuoteLine}>+ Line</button>
                    </div>
                    <DocumentPhotoBox documentType="Quote" documentNo={quote.quote_no || nextQuoteNo()} autoSave={!!editingQuoteId} />
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
                                  subtotal: qt.subtotal,
                                  tax_amount: qt.tax_amount,
                                  total_amount: qt.total_amount || qt.amount,
                                  discount: qt.discount,
                                  tax_rate: qt.tax_rate,
                                  service: cleanDocumentDescription(qt.service || qt.notes),
                                  notes: qt.notes,
                                  lines: getDocumentLines({ ...qt, service: qt.service }),
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
                        label="Customer Phone"
                        value={workOrder.customer_phone || ""}
                        onChange={(v: string) =>
                          setWorkOrder({ ...workOrder, customer_phone: v })
                        }
                      />
                      <Input
                        label="Customer Address"
                        value={workOrder.customer_address || ""}
                        onChange={(v: string) =>
                          setWorkOrder({ ...workOrder, customer_address: v })
                        }
                      />
                      <Field label="Priority">
                        <select
                          value={workOrder.priority || "Normal"}
                          onChange={(e) =>
                            setWorkOrder({ ...workOrder, priority: e.target.value })
                          }
                          style={styles.input}
                        >
                          <option>Low</option>
                          <option>Normal</option>
                          <option>High</option>
                          <option>Urgent</option>
                        </select>
                      </Field>
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
                      <Input
                        label="Completion Notes"
                        value={workOrder.completion_notes || ""}
                        onChange={(v: string) =>
                          setWorkOrder({ ...workOrder, completion_notes: v })
                        }
                      />
                      <DocumentPhotoBox documentType="Work Order" documentNo={workOrder.work_order_no || nextWorkOrderNo()} autoSave={!!editingWorkOrderId} />
                    </div>
                    <ButtonRow>
                      <button type="button" onClick={applyAashanCopilotToWorkOrder} style={styles.grayBtn}>
                        ✨ AI Checklist
                      </button>
                      <button type="button" onClick={() => openAashanCopilotEmail("followup")} style={styles.grayBtn}>
                        📧 AI Message
                      </button>
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
                            style={styles.smallBtn}
                            onClick={() => callCustomer(wo.customer_phone)}
                          >
                            Call
                          </button>
                          <button
                            style={styles.smallBtn}
                            onClick={() => navigateToAddress(wo.customer_address)}
                          >
                            Map
                          </button>
                          <button
                            style={styles.greenBtn}
                            onClick={() => convertWorkOrderToInvoice(wo)}
                          >
                            Invoice
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
                                onClick={() => callCustomer(wo.customer_phone)}
                              >
                                Call
                              </button>
                              <button
                                style={styles.smallBtn}
                                onClick={() => textCustomer(wo.customer_phone)}
                              >
                                Text
                              </button>
                              <button
                                style={styles.smallBtn}
                                onClick={() => navigateToAddress(wo.customer_address)}
                              >
                                Navigate
                              </button>
                              <button
                                style={styles.smallBtn}
                                onClick={() => editWorkOrder(wo)}
                              >
                                Photos / Notes
                              </button>
                              <button
                                style={styles.greenBtn}
                                onClick={() => convertWorkOrderToInvoice(wo)}
                              >
                                Convert to Invoice
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
                      <button type="button" onClick={applyAashanCopilotToInvoice} className="bc-action">
                        ✨ Improve Lines
                      </button>
                      <button type="button" onClick={() => openAashanCopilotEmail("invoice")} className="bc-action">
                        📧 AI Email
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
                                <td className="bc-description-cell">
                                  <textarea
                                    className="bc-line-description"
                                    value={line.description}
                                    onChange={(e) =>
                                      updateInvoiceLine(
                                        index,
                                        "description",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Service / item description"
                                    rows={2}
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
                                    inputMode="decimal"
                                  />
                                  <button
                                    type="button"
                                    className="tax-clear-btn"
                                    onClick={() =>
                                      updateInvoiceLine(index, "tax_rate", "")
                                    }
                                  >
                                    No Tax
                                  </button>
                                </td>
                                <td className="bc-amount">
                                  ${c.total.toFixed(2)}
                                </td>
                                <td>
                                  <div className="bc-line-actions">
                                    <button
                                      type="button"
                                      onClick={() => duplicateInvoiceLine(index)}
                                      className="bc-copy"
                                    >
                                      Copy
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteInvoiceLine(index)}
                                      className="bc-delete"
                                    >
                                      Delete
                                    </button>
                                  </div>
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
                    <div className="mobile-transaction-sticky">
                      <div>
                        <span>Invoice Total</span>
                        <strong>${documentTotals(invoiceLines).total.toFixed(2)}</strong>
                      </div>
                      <button type="button" onClick={saveInvoice}>Save</button>
                      <button type="button" onClick={addInvoiceLine}>+ Line</button>
                    </div>
                    <DocumentPhotoBox documentType="Invoice" documentNo={invoice.invoice_no || nextInvoiceNo()} autoSave={!!editingInvoiceId} />
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
                                  subtotal: i.subtotal,
                                  tax_amount: i.tax_amount,
                                  total_amount: i.total_amount || i.amount,
                                  discount: i.discount,
                                  tax_rate: i.tax_rate,
                                  balance: invoiceBalance(i),
                                  due_date: i.due_date,
                                  customer_address: i.customer_address || getCustomerByName(i.customer)?.address || "",
                                  customer_phone: i.customer_phone || getCustomerByName(i.customer)?.phone || "",
                                  customer_email: i.customer_email || getCustomerByName(i.customer)?.email || "",
                                  service: cleanDocumentDescription(i.notes || "Services provided"),
                                  notes: i.notes,
                                  lines: getDocumentLines({ ...i, service: i.notes }),
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
                      <Field label="Paid From Account">
                        <select
                          value={(expense as any).bank_name || "Cash on hand"}
                          onChange={(e) =>
                            setExpense({
                              ...expense,
                              bank_name: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option value="">Select Account</option>
                          {paymentAccountOptions.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </Field>
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
                          <option>ACH</option>
                          <option>Debit Card</option>
                          <option>Credit Card</option>
                          <option>Bank Transfer</option>
                          <option>Other</option>
                        </select>
                      </Field>
                      <Input
                        label="Reference #"
                        value={(expense as any).reference_no || ""}
                        onChange={(v: string) =>
                          setExpense({ ...expense, reference_no: v })
                        }
                      />
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
                      "Paid From",
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
                        <Td>{expenseAccountName(e as any)}</Td>
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
                                  total_amount: r.amount,
                                  invoice_no: r.invoice_no,
                                  service: `Payment received for invoice ${r.invoice_no}`,
                                  lines: [{ description: `Payment received for invoice ${r.invoice_no}`, qty: "1", unit_price: String(r.amount || 0), discount: "0", tax_rate: "" }],
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
                      <Field label="Paid From Account">
                        <select
                          value={(expense as any).bank_name || "Cash on hand"}
                          onChange={(e) =>
                            setExpense({
                              ...expense,
                              bank_name: e.target.value,
                            })
                          }
                          style={styles.input}
                        >
                          <option value="">Select Account</option>
                          {paymentAccountOptions.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </Field>
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
                          <option>ACH</option>
                          <option>Debit Card</option>
                          <option>Credit Card</option>
                          <option>Bank Transfer</option>
                          <option>Other</option>
                        </select>
                      </Field>
                      <Input
                        label="Reference #"
                        value={(expense as any).reference_no || ""}
                        onChange={(v: string) =>
                          setExpense({ ...expense, reference_no: v })
                        }
                      />
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
                      "Paid From",
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
                        <Td>{expenseAccountName(e as any)}</Td>
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
                  <SectionCard title="Reports">
                    <div className="report-tabs" style={styles.reportTabs}>
                      {[
                        ["bank_register", "Bank Register"],
                        ["profit_loss", "Profit & Loss"],
                        ["balance_sheet", "Balance Sheet"],
                        ["trial_balance", "Trial Balance"],
                        ["general_ledger", "General Ledger"],
                        ["customer_statement", "Customer Statement"],
                        ["vendor_statement", "Vendor Statement"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setReportTab(key)}
                          style={reportTab === key ? { ...styles.reportTabButton, ...styles.reportTabButtonActive } : styles.reportTabButton}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </SectionCard>

                  {reportTab === "bank_register" && (
                    <>
                      <SectionCard title="Bank Register">
                        <div className="report-toolbar bank-register-toolbar" style={styles.bankRegisterToolbar}>
                          <Field label="Bank or Cash Account">
                            <select value={bankRegisterAccount} onChange={(e) => setBankRegisterAccount(e.target.value)} style={styles.input}>
                              <option>All Accounts</option>
                              {bankAccountOptions.map((name) => (<option key={name}>{name}</option>))}
                            </select>
                          </Field>
                          <Field label="Show">
                            <select value={bankRegisterShow} onChange={(e) => setBankRegisterShow(e.target.value)} style={styles.input}>
                              <option>All Transactions</option>
                              <option>Receipt</option>
                              <option>Payment</option>
                            </select>
                          </Field>
                          <div className="bank-register-actions" style={styles.bankRegisterActions}>
                            <button style={styles.blueBtn} onClick={printBankRegister}>🖨 Print</button>
                            <button style={styles.greenBtn} onClick={() => exportCsv("bank-register.csv", [["Date", "Transaction", "Bank or Cash Account", "Customer", "Supplier", "Description", "Debit", "Credit", "Balance"], ...bankRegisterRows.map((row) => [row.date, row.transaction, row.account, row.customer, row.supplier, row.description, row.debit ? row.debit.toFixed(2) : "", row.credit ? row.credit.toFixed(2) : "", bankBalanceText(row.runningBalance)])])}>⬇ Export</button>
                          </div>
                        </div>
                        <div className="bank-register-summary" style={styles.bankRegisterSummary}>
                          <div className="bank-register-summary-card" style={styles.bankRegisterSummaryCard}><span>Opening Balance</span><b>{bankBalanceText(selectedBankOpeningBalance)}</b></div>
                          <div className="bank-register-summary-card" style={styles.bankRegisterSummaryCard}><span>Total Debits</span><b style={{ color: "#059669" }}>{money(bankRegisterDebits)}</b></div>
                          <div className="bank-register-summary-card" style={styles.bankRegisterSummaryCard}><span>Total Credits</span><b style={{ color: "#dc2626" }}>{money(bankRegisterCredits)}</b></div>
                          <div className="bank-register-summary-card" style={styles.bankRegisterSummaryCard}><span>Closing Balance</span><b>{bankBalanceText(bankRegisterClosing)}</b></div>
                        </div>
                      </SectionCard>
                      <div className="report-table-wrap bank-register-table-wrap" style={styles.bankRegisterTableWrap}>
                        <table className="bankRegisterTable" style={styles.bankRegisterTable}>
                          <thead><tr><th>Date</th><th>Transaction</th><th>Bank or Cash Account</th><th>Customer</th><th>Supplier</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
                          <tbody>{bankRegisterRows.map((row) => (<tr key={row.id}><td>{row.date}</td><td style={{ color: row.kind === "Receipt" ? "#059669" : "#dc2626", fontWeight: 800 }}>{row.transaction}</td><td>{row.account}</td><td>{row.customer}</td><td>{row.supplier}</td><td style={styles.bankRegisterDescription}>{row.description}</td><td style={{ ...styles.bankRegisterNumber, color: "#059669" }}>{row.debit ? money(row.debit) : "-"}</td><td style={{ ...styles.bankRegisterNumber, color: "#dc2626" }}>{row.credit ? money(row.credit) : "-"}</td><td style={{ ...styles.bankRegisterNumber, color: row.runningBalance >= 0 ? "#059669" : "#dc2626", fontWeight: 900 }}>{bankBalanceText(row.runningBalance)}</td></tr>))}</tbody>
                        </table>
                      </div>
                    </>
                  )}

                  {reportTab === "profit_loss" && (
                    <SectionCard title="Profit & Loss Statement">
                      <div className="report-summary-grid" style={styles.reportSummaryGrid}>
                        <Card title="Income" value={money(paidRevenue)} />
                        <Card title="Expenses" value={money(totalVendorPaymentAmount)} />
                        <Card title="Net Profit" value={money(netProfit)} />
                      </div>
                      <div className="report-table-wrap bank-register-table-wrap" style={styles.bankRegisterTableWrap}>
                        <table className="bankRegisterTable" style={styles.bankRegisterTable}>
                          <thead><tr><th>Account</th><th>Type</th><th>Amount</th></tr></thead>
                          <tbody>
                            {reportProfitLossIncomeRows.map((r) => (<tr key={r.label}><td>{r.label}</td><td>Income</td><td style={styles.bankRegisterNumber}>{money(r.amount)}</td></tr>))}
                            {reportProfitLossExpenseRows.map((r) => (<tr key={r.label}><td>{r.label}</td><td>Expense</td><td style={styles.bankRegisterNumber}>{money(r.amount)}</td></tr>))}
                            <tr><td><b>Net profit (loss)</b></td><td></td><td style={styles.bankRegisterNumber}><b>{money(netProfit)}</b></td></tr>
                          </tbody>
                        </table>
                      </div>
                    </SectionCard>
                  )}

                  {reportTab === "balance_sheet" && (
                    <SectionCard title="Balance Sheet">
                      <div className="report-summary-grid" style={styles.reportSummaryGrid}>
                        <Card title="Assets" value={money(balanceSheetAssets)} />
                        <Card title="Liabilities" value={money(balanceSheetLiabilities)} />
                        <Card title="Equity" value={money(balanceSheetEquity)} />
                      </div>
                      <div className="report-table-wrap bank-register-table-wrap" style={styles.bankRegisterTableWrap}>
                        <table className="bankRegisterTable" style={styles.bankRegisterTable}>
                          <thead><tr><th>Group</th><th>Account</th><th>Amount</th></tr></thead>
                          <tbody>{reportBalanceRows.map((r) => (<tr key={`${r.group}-${r.account}`}><td>{r.group}</td><td>{r.account}</td><td style={styles.bankRegisterNumber}>{money(r.amount)}</td></tr>))}</tbody>
                        </table>
                      </div>
                    </SectionCard>
                  )}

                  {reportTab === "trial_balance" && (
                    <SectionCard title="Trial Balance">
                      <div className="report-table-wrap bank-register-table-wrap" style={styles.bankRegisterTableWrap}>
                        <table className="bankRegisterTable" style={styles.bankRegisterTable}>
                          <thead><tr><th>Account</th><th>Debit</th><th>Credit</th></tr></thead>
                          <tbody>{reportTrialRows.map((r) => (<tr key={r.account}><td>{r.account}</td><td style={styles.bankRegisterNumber}>{r.debit ? money(r.debit) : "-"}</td><td style={styles.bankRegisterNumber}>{r.credit ? money(r.credit) : "-"}</td></tr>))}<tr><td><b>Total</b></td><td style={styles.bankRegisterNumber}><b>{money(trialDebitTotal)}</b></td><td style={styles.bankRegisterNumber}><b>{money(trialCreditTotal)}</b></td></tr></tbody>
                        </table>
                      </div>
                    </SectionCard>
                  )}

                  {reportTab === "general_ledger" && (
                    <SectionCard title="General Ledger">
                      <div className="report-table-wrap bank-register-table-wrap" style={styles.bankRegisterTableWrap}>
                        <table className="bankRegisterTable" style={styles.bankRegisterTable}>
                          <thead><tr><th>Date</th><th>Source</th><th>Account</th><th>Description</th><th>Debit</th><th>Credit</th></tr></thead>
                          <tbody>{reportGeneralLedgerRows.map((r, idx) => (<tr key={idx}><td>{r.date}</td><td>{r.source}</td><td>{r.account}</td><td>{r.description}</td><td style={styles.bankRegisterNumber}>{r.debit ? money(r.debit) : "-"}</td><td style={styles.bankRegisterNumber}>{r.credit ? money(r.credit) : "-"}</td></tr>))}</tbody>
                        </table>
                      </div>
                    </SectionCard>
                  )}

                  {reportTab === "customer_statement" && (
                    <SectionCard title="Customer Statement">
                      <div className="report-table-wrap bank-register-table-wrap" style={styles.bankRegisterTableWrap}>
                        <table className="bankRegisterTable" style={styles.bankRegisterTable}>
                          <thead><tr><th>Date</th><th>Transaction</th><th>Customer</th><th>Invoice/Debit</th><th>Payment/Credit</th><th>Open Balance</th></tr></thead>
                          <tbody>{reportCustomerStatementRows.map((r, idx) => (<tr key={idx}><td>{r.date}</td><td>{r.transaction}</td><td>{r.customer}</td><td style={styles.bankRegisterNumber}>{r.debit ? money(r.debit) : "-"}</td><td style={styles.bankRegisterNumber}>{r.credit ? money(r.credit) : "-"}</td><td style={styles.bankRegisterNumber}>{r.balance ? money(r.balance) : "-"}</td></tr>))}</tbody>
                        </table>
                      </div>
                    </SectionCard>
                  )}

                  {reportTab === "vendor_statement" && (
                    <SectionCard title="Vendor Statement">
                      <div className="report-table-wrap bank-register-table-wrap" style={styles.bankRegisterTableWrap}>
                        <table className="bankRegisterTable" style={styles.bankRegisterTable}>
                          <thead><tr><th>Date</th><th>Transaction</th><th>Vendor</th><th>Description</th><th>Payment/Debit</th><th>Bill/Credit</th></tr></thead>
                          <tbody>{reportVendorStatementRows.map((r, idx) => (<tr key={idx}><td>{r.date}</td><td>{r.transaction}</td><td>{r.vendor}</td><td>{r.description}</td><td style={styles.bankRegisterNumber}>{r.debit ? money(r.debit) : "-"}</td><td style={styles.bankRegisterNumber}>{r.credit ? money(r.credit) : "-"}</td></tr>))}</tbody>
                        </table>
                      </div>
                    </SectionCard>
                  )}
                </>
              )}



              {activeTab === "aashan_ai" && (
                <>
                  <SectionCard title="Aashan AI">
                    <div style={{ display: "grid", gap: 16 }}>
                      <div style={{ background: "linear-gradient(135deg,#0f2742,#047e89)", color: "white", borderRadius: 18, padding: 20 }}>
                        <h2 style={{ margin: 0, fontSize: 26 }}>Aashan AI</h2>
                        <p style={{ margin: "8px 0 0", opacity: .92 }}>Your intelligent business assistant for quotes, invoices, customers, reports, and emails.</p>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                        <button style={styles.blueBtn} onClick={() => runAashanAI("daily business brief")}>🌅 Daily Brief</button>
                        <button style={styles.blueBtn} onClick={() => runAashanAI("summarize business")}>📊 Business Summary</button>
                        <button style={styles.greenBtn} onClick={() => runAashanAI("show unpaid invoices")}>💰 Unpaid Invoices</button>
                        <button style={styles.grayBtn} onClick={() => runAashanAI("find customer")}>🔎 Smart Search</button>
                        <button style={styles.grayBtn} onClick={() => runAashanAI("create quote")}>📝 Quote Helper</button>
                        <button style={styles.grayBtn} onClick={() => runAashanAI("write follow up email")}>📧 Email Writer</button>
                        <button style={styles.grayBtn} onClick={() => runAashanAI("accounting assistant")}>🧾 Accounting Assistant</button>
                        <button style={styles.grayBtn} onClick={() => runAashanAI("explain report")}>📈 Report Explainer</button>
                        <button style={styles.grayBtn} onClick={() => runAashanAI("job profitability")}>👷 Job Profitability</button>
                        <button style={styles.grayBtn} onClick={() => runAashanAI("next best actions")}>✅ Next Actions</button>
                        <button style={styles.grayBtn} onClick={() => openAiEmailWriter("quote")}>Quote Email</button>
                        <button style={styles.grayBtn} onClick={() => openAiEmailWriter("invoice")}>Invoice Email</button>
                        <button style={styles.grayBtn} onClick={() => openAiEmailWriter("receipt")}>Receipt Email</button>
                        <button style={styles.grayBtn} onClick={() => openAiEmailWriter("reminder")}>Payment Reminder</button>
                        <button style={styles.grayBtn} onClick={() => runAashanAI("show today jobs")}>🛠 Today / Open Work</button>
                      </div>

                      <Field label="Ask Aashan AI">
                        <textarea
                          value={aashanAiPrompt}
                          onChange={(e) => setAashanAiPrompt(e.target.value)}
                          placeholder="Example: daily brief, explain owner equity, job profitability, find Roy, unpaid invoices, or create quote for Roy to install ceiling fan"
                          style={{ ...styles.input, minHeight: 110, resize: "vertical", lineHeight: 1.5 }}
                        />
                      </Field>

                      <ButtonRow>
                        <button style={styles.primaryBtn} onClick={() => runAashanAI()}>Ask Aashan AI</button>
                        <button style={styles.greenBtn} onClick={openAiQuoteDraft}>Create Draft Quote</button>
                        <button style={styles.grayBtn} onClick={copyAiResponse}>Copy Response</button>
                        <button style={styles.grayBtn} onClick={() => { setAashanAiPrompt(""); setAashanAiResponse("Ask Aashan AI to find records, draft emails, create quote wording, or summarize the business."); }}>Clear</button>
                      </ButtonRow>

                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, whiteSpace: "pre-wrap", lineHeight: 1.55, color: "#0f172a", fontWeight: 600 }}>
                        {aashanAiResponse}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
                        <Card title="Revenue" value={money(paidRevenue)} />
                        <Card title="Net Profit" value={money(netProfit)} />
                        <Card title="A/R" value={money(accountsReceivable)} />
                        <Card title="Pending Quotes" value={String(quotes.filter((q: any) => !String(q.status || "").toLowerCase().includes("accepted") && !String(q.status || "").toLowerCase().includes("converted")).length)} />
                      </div>
                    </div>
                  </SectionCard>
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

      {quickAddOpen && (
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

      {(
        <button
          className="floating-add"
          style={styles.floatingAdd}
          onClick={() => setQuickAddOpen(!quickAddOpen)}
        >
          {quickAddOpen ? "×" : "+"}
        </button>
      )}

      <nav className="bottom-nav" style={styles.bottomNav} aria-label="Mobile navigation">
        <button
          style={
            activeTab === "dashboard"
              ? styles.bottomNavActive
              : styles.bottomNavBtn
          }
          onClick={() => openTab("dashboard")}
        >
          🏠<span>Dashboard</span>
        </button>
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
            activeTab === "jobs" || activeTab === "workorders" || activeTab === "technician"
              ? styles.bottomNavActive
              : styles.bottomNavBtn
          }
          onClick={() => openTab("jobs")}
        >
          📋<span>Jobs</span>
        </button>
        <button
          style={
            activeTab === "invoices" || activeTab === "receipts"
              ? styles.bottomNavActive
              : styles.bottomNavBtn
          }
          onClick={() => openTab("invoices")}
        >
          🧾<span>Invoices</span>
        </button>
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
              <div className="email-mobile-titlebar">
                <h2>Send {emailDraft.type}</h2>
                <button type="button" className="email-close-x" onClick={() => setEmailDraft(emptyEmailDraft)}>×</button>
              </div>

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

              <label className="email-file-attach">
                📎 Attach images or documents
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  onChange={async (e) => {
                    await addEmailDraftFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </label>

              {(emailDraft.attachments || []).map((a, index) => (
                <div className="email-attachment" key={`${a.file_name}-${index}`}>
                  <span>📎</span>
                  <b>{a.file_name}</b>
                  <button type="button" onClick={() => removeEmailDraftAttachment(index)}>Remove</button>
                </div>
              ))}

              <div className="email-actions">
                <button
                  className="email-send-btn"
                  disabled={emailSending}
                  onClick={sendEmailDraft}
                >
                  {emailSending ? "Sending..." : `Send ${emailDraft.type}`}
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
                  {(() => {
                    const previewLines = getDocumentLines(emailDraft.data);
                    const previewTotals = documentTotals(previewLines);
                    const grossSubtotal = previewLines.reduce(
                      (sum, line) => sum + Number(line.qty || 0) * Number(line.unit_price || 0),
                      0,
                    );
                    const discount = previewLines.reduce(
                      (sum, line) => sum + Number(line.discount || 0),
                      0,
                    );
                    const subtotal = grossSubtotal || Number(emailDraft.data.subtotal ?? previewTotals.subtotal);
                    const tax = Number(emailDraft.data.tax_amount ?? previewTotals.tax);
                    const total = Number(
                      emailDraft.data.total_amount ?? emailDraft.data.amount ?? previewTotals.total,
                    );
                    const balance = Number(emailDraft.data.balance ?? total);
                    const documentNo =
                      emailDraft.data.document_no ||
                      emailDraft.data.invoice_no ||
                      emailDraft.data.quote_no ||
                      emailDraft.data.receipt_no ||
                      "";
                    return (
                      <>
                        <div className="mini-doc-header">
                          <div className="mini-doc-brand">
                            <img
                              src={company.logo_url || LOGO_SRC}
                              className="mini-doc-logo"
                              alt="Aashan & Co LLC"
                            />
                            <div>
                              <h3>{emailDraft.type}</h3>
                              <p>{company.company_name || "Aashan & Co LLC"}</p>
                              <small>{company.phone || "(832) 210-4248"} · {company.email || "support@aashan.co"}</small>
                            </div>
                          </div>
                          <div className="mini-doc-meta">
                            <b>{documentNo}</b>
                            {emailDraft.data.document_date && <span>Date: {emailDraft.data.document_date}</span>}
                            {emailDraft.data.due_date && <span>Due: {emailDraft.data.due_date}</span>}
                          </div>
                        </div>

                        <div className="mini-line" />

                        <div className="mini-bill-grid">
                          <div>
                            <b>Bill To</b>
                            <p>{emailDraft.data.customer || emailDraft.data.customer_name}</p>
                            {emailDraft.data.customer_address && <small>{emailDraft.data.customer_address}</small>}
                            {emailDraft.data.customer_email && <small>{emailDraft.data.customer_email}</small>}
                            {emailDraft.data.customer_phone && <small>{emailDraft.data.customer_phone}</small>}
                          </div>
                          <div>
                            <b>Summary</b>
                            <p>Amount: {money(total)}</p>
                            {emailDraft.data.balance !== undefined && <p>Balance: {money(balance)}</p>}
                          </div>
                        </div>

                        <table className="mini-doc-table">
                          <thead>
                            <tr>
                              <th>Description</th>
                              <th>Qty</th>
                              <th>Price</th>
                              <th>Disc.</th>
                              <th>Tax</th>
                              <th>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewLines.map((line, index) => {
                              const calc = lineCalc(line);
                              return (
                                <tr key={index}>
                                  <td>{cleanDocumentDescription(line.description)}</td>
                                  <td>{line.qty || "1"}</td>
                                  <td>{money(line.unit_price)}</td>
                                  <td>{money(line.discount)}</td>
                                  <td>{line.tax_rate === "" ? "No tax" : `${line.tax_rate || 0}%`}</td>
                                  <td>{money(calc.total)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        <div className="mini-totals">
                          <p><span>Subtotal</span><b>{money(subtotal)}</b></p>
                          {discount > 0 && <p><span>Discount</span><b>-{money(discount)}</b></p>}
                          <p><span>Tax</span><b>{money(tax)}</b></p>
                          <p className="mini-grand-total"><span>Total</span><b>{money(total)}</b></p>
                          {emailDraft.data.balance !== undefined && (
                            <p><span>Balance Due</span><b>{money(balance)}</b></p>
                          )}
                        </div>

                        {cleanDocumentDescription(emailDraft.data.notes) && (
                          <div className="mini-notes">
                            <b>Notes</b>
                            <p>{cleanDocumentDescription(emailDraft.data.notes)}</p>
                          </div>
                        )}

                        <p className="mini-footer">
                          Thank you for choosing Aashan & Co LLC. This preview represents the PDF attachment; the email body is shown on the left.
                        </p>
                      </>
                    );
                  })()}
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
function formatDashboardMoney(value: any) {
  const amount = Number(value || 0);
  if (Math.abs(amount) < 0.005) return "$ -";
  if (amount < 0) return `$(${Math.abs(amount).toFixed(2)})`;
  return `$ ${amount.toFixed(2)}`;
}

function FinancialBlock({ title, amount, tone, rows, onClick }: any) {
  return (
    <div style={styles.financialBlock}>
      <button
        type="button"
        onClick={onClick}
        style={{ ...styles.financialBlockHeader, ...(onClick ? styles.financialDrillButton : {}) }}
        title={onClick ? `Open ${title} report` : undefined}
      >
        <h3 style={styles.financialBlockTitle}>{title}</h3>
        <strong style={{ ...styles.financialBlockAmount, color: tone }}>
          {formatDashboardMoney(amount)}
        </strong>
      </button>
      <div style={styles.financialRows}>
        {rows.map((row: any, idx: number) => {
          const rowStyle = {
            ...styles.financialRow,
            ...(row.onClick ? styles.financialDrillRow : {}),
            paddingLeft: row.indent ? 26 : 0,
            fontWeight: row.bold ? 800 : 500,
          };
          return row.onClick ? (
            <button
              type="button"
              key={`${title}-${row.label}-${idx}`}
              onClick={row.onClick}
              style={rowStyle}
              title={`Open ${row.label} details`}
            >
              <span>{row.label}</span>
              <span style={Number(row.amount || 0) ? styles.financialRowAmount : styles.financialRowZero}>
                {formatDashboardMoney(row.amount)}
              </span>
            </button>
          ) : (
            <div key={`${title}-${row.label}-${idx}`} style={rowStyle}>
              <span>{row.label}</span>
              <span style={Number(row.amount || 0) ? styles.financialRowAmount : styles.financialRowZero}>
                {formatDashboardMoney(row.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MiniMetric({ title, value, note, icon }: any) {
  return (
    <div style={styles.miniMetric}>
      <span style={styles.miniMetricIcon}>{icon}</span>
      <div>
        <div style={styles.miniMetricTitle}>{title}</div>
        <div style={styles.miniMetricValue}>{value}</div>
        <div style={styles.miniMetricNote}>{note}</div>
      </div>
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

function MultiContactInput({ label, value, onChange, placeholder }: any) {
  return (
    <Field label={label}>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "One entry per line"}
        rows={3}
        style={{ ...styles.input, minHeight: 88, resize: "vertical", lineHeight: 1.35 }}
      />
      <small style={{ color: "#64748b", display: "block", marginTop: 4 }}>
        Add multiple values using new lines, commas, or semicolons.
      </small>
    </Field>
  );
}

function ContactList({ value }: any) {
  const entries = String(value || "")
    .split(/[\n;,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (!entries.length) return <span>-</span>;
  return (
    <div style={{ display: "grid", gap: 3 }}>
      {entries.map((entry, index) => (
        <span key={`${entry}-${index}`} style={{ whiteSpace: "nowrap" }}>
          {entry}
        </span>
      ))}
    </div>
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
  return (
    <div className="mobile-sticky-actions" style={styles.buttonRow}>
      {children}
    </div>
  );
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
  userMenuButton: {
    background: "rgba(255,255,255,0.14)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "white",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 900,
    cursor: "pointer",
    maxWidth: 260,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  userMenu: {
    position: "absolute",
    right: 0,
    top: 44,
    width: 250,
    background: "white",
    color: "#0f172a",
    borderRadius: 14,
    boxShadow: "0 20px 45px rgba(15,23,42,0.24)",
    border: "1px solid #d7dee8",
    padding: 12,
    zIndex: 10000,
  },
  userMenuName: {
    fontWeight: 900,
    fontSize: 15,
    marginBottom: 4,
  },
  userMenuRole: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 800,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 10,
    marginBottom: 8,
  },
  userMenuStatusPanel: {
    display: "grid",
    gap: 8,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  userMenuStatusButton: {
    width: "100%",
    textAlign: "left",
    background: "white",
    border: "1px solid #d7dee8",
    padding: "9px 10px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 850,
    color: "#0f3f56",
  },
  userMenuStatusOnline: {
    color: "#047857",
    background: "#ecfdf5",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    padding: "9px 10px",
    fontWeight: 900,
  },
  userMenuStatusOffline: {
    color: "#b45309",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 10,
    padding: "9px 10px",
    fontWeight: 900,
  },
  userMenuQueueNote: {
    color: "#7c3aed",
    background: "#f5f3ff",
    border: "1px solid #ddd6fe",
    borderRadius: 10,
    padding: "8px 10px",
    fontWeight: 850,
    fontSize: 12,
  },
  userMenuItem: {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: 0,
    padding: "10px 8px",
    borderRadius: 9,
    cursor: "pointer",
    fontWeight: 800,
    color: "#0f3f56",
  },
  userMenuLogout: {
    width: "100%",
    textAlign: "left",
    background: "#fee2e2",
    border: 0,
    padding: "10px 8px",
    borderRadius: 9,
    cursor: "pointer",
    fontWeight: 900,
    color: "#991b1b",
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
  financeDashboard: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 18,
    alignItems: "start",
  },
  financePanel: {
    background: "rgba(255,255,255,0.96)",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
    padding: 16,
    display: "grid",
    gap: 14,
  },
  financePanelHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "4px 2px 8px",
  },
  financePanelTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  financePanelSub: {
    margin: "4px 0 0",
    color: "#64748b",
    fontSize: 13,
  },
  financeIconBlue: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "#dbeafe",
    color: "#2563eb",
    fontSize: 20,
  },
  financeIconGreen: {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "#dcfce7",
    color: "#059669",
    fontSize: 20,
  },
  financialBlock: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    overflow: "hidden",
    background: "#ffffff",
  },
  financialBlockHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    background: "#fffef7",
    borderBottom: "1px solid #e2e8f0",
    padding: "16px 18px",
  },
  financialBlockTitle: { margin: 0, fontSize: 19, color: "#0f172a" },
  financialBlockAmount: { fontSize: 20, whiteSpace: "nowrap" },
  financialDrillButton: {
    width: "100%",
    border: 0,
    cursor: "pointer",
    textAlign: "left",
  },
  financialRows: { padding: "16px 18px", display: "grid", gap: 12 },
  financialRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    color: "#0f172a",
    lineHeight: 1.25,
  },
  financialDrillRow: {
    width: "100%",
    border: 0,
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
  },
  financialRowAmount: { color: "#2563eb", fontWeight: 800, whiteSpace: "nowrap" },
  financialRowZero: { color: "#94a3b8", fontWeight: 700, whiteSpace: "nowrap" },
  netProfitCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    padding: "18px 20px",
    borderRadius: 16,
    border: "1px solid #fde68a",
    background: "#fffbeb",
    boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
  },
  netProfitAmount: { fontSize: 25, whiteSpace: "nowrap" },
  dashboardSummaryStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))",
    gap: 16,
    marginTop: 18,
  },
  miniMetric: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
  },
  miniMetricIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "#eef2ff",
    fontSize: 22,
  },
  miniMetricTitle: { color: "#475569", fontWeight: 800, fontSize: 13 },
  miniMetricValue: { color: "#0f172a", fontWeight: 900, fontSize: 18, marginTop: 4 },
  miniMetricNote: { color: "#2563eb", fontWeight: 700, fontSize: 12, marginTop: 3 },
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

  reportTabs: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  reportTabButton: {
    border: "1px solid #d7dee8",
    background: "#ffffff",
    color: "#0f3f56",
    borderRadius: 12,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  reportTabButtonActive: {
    background: "#2563eb",
    color: "#ffffff",
    borderColor: "#2563eb",
  },
  reportSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  bankRegisterToolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) minmax(180px, 260px) auto",
    gap: 14,
    alignItems: "end",
  },
  bankRegisterActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  bankRegisterSummary: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(160px, 1fr))",
    gap: 12,
    marginTop: 16,
  },
  bankRegisterSummaryCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    padding: 14,
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  bankRegisterTableWrap: {
    background: "#ffffff",
    border: "1px solid #d7dee8",
    borderRadius: 16,
    overflow: "auto",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
    marginBottom: 24,
  },
  bankRegisterTable: {
    width: "100%",
    minWidth: 1100,
    borderCollapse: "collapse" as const,
    fontSize: 14,
  },
  bankRegisterDescription: {
    minWidth: 260,
    whiteSpace: "normal" as const,
    lineHeight: 1.35,
  },
  bankRegisterNumber: {
    textAlign: "right" as const,
    whiteSpace: "nowrap" as const,
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


@media screen and (max-width: 700px) {
  .invoice-print {
    padding: 0 !important;
    background: #e5ebf3 !important;
    -webkit-overflow-scrolling: touch;
  }

  .quote-page {
    width: calc(100vw - 18px) !important;
    min-height: auto !important;
    max-width: calc(100vw - 18px) !important;
    margin: 10px auto 84px !important;
    padding: 18px 14px 22px !important;
    border-radius: 10px !important;
    box-shadow: 0 10px 32px rgba(15, 23, 42, 0.14) !important;
    overflow: hidden !important;
  }

  .doc-header {
    display: grid !important;
    grid-template-columns: 76px 1fr !important;
    align-items: start !important;
    gap: 12px !important;
  }

  .doc-brand {
    display: contents !important;
  }

  .doc-logo {
    width: 72px !important;
    height: 72px !important;
  }

  .doc-brand h1 {
    font-size: 25px !important;
    line-height: 1.08 !important;
    word-break: normal !important;
    overflow-wrap: normal !important;
  }

  .doc-brand p {
    font-size: 14px !important;
    margin-top: 5px !important;
  }

  .doc-contact {
    grid-column: 1 / -1 !important;
    min-width: 0 !important;
    text-align: center !important;
    font-size: 13px !important;
    line-height: 1.35 !important;
    margin-top: 8px !important;
  }

  .doc-contact p {
    margin: 2px 0 !important;
  }

  .doc-line {
    margin: 17px 0 16px !important;
    border-top-width: 3px !important;
  }

  .doc-title-row {
    display: block !important;
    margin-bottom: 14px !important;
  }

  .doc-title-row h2 {
    font-size: 34px !important;
    line-height: 1 !important;
    margin-bottom: 10px !important;
    letter-spacing: 0.04em !important;
  }

  .doc-title-row p {
    font-size: 15px !important;
    margin: 5px 0 !important;
  }

  .doc-date-box {
    min-width: 0 !important;
    padding-top: 8px !important;
  }

  .doc-date-box p {
    display: flex !important;
    align-items: baseline !important;
    gap: 6px !important;
    margin: 6px 0 !important;
    font-size: 15px !important;
  }

  .doc-date-box b::after {
    content: ':';
  }

  .doc-bill-box {
    width: auto !important;
    max-width: 100% !important;
    padding: 14px !important;
    margin: 12px 0 18px !important;
    border-radius: 9px !important;
  }

  .doc-bill-box h3 {
    font-size: 18px !important;
  }

  .doc-bill-box p {
    font-size: 15px !important;
    line-height: 1.25 !important;
    overflow-wrap: anywhere !important;
  }

  .doc-service-title {
    font-size: 16px !important;
    margin-bottom: 8px !important;
  }

  .doc-items {
    table-layout: fixed !important;
    width: 100% !important;
    font-size: 12px !important;
  }

  .doc-items th,
  .doc-items td {
    padding: 7px 5px !important;
    font-size: 12px !important;
    line-height: 1.22 !important;
    word-break: normal !important;
    overflow-wrap: anywhere !important;
  }

  .doc-items th:first-child,
  .doc-items td:first-child {
    width: 32% !important;
    text-align: left !important;
  }

  .doc-items th:nth-child(2),
  .doc-items td:nth-child(2) {
    width: 9% !important;
  }

  .doc-items th:nth-child(3),
  .doc-items td:nth-child(3) {
    width: 16% !important;
  }

  .doc-items th:nth-child(4),
  .doc-items td:nth-child(4) {
    width: 16% !important;
  }

  .doc-items th:nth-child(5),
  .doc-items td:nth-child(5) {
    width: 12% !important;
  }

  .doc-items th:nth-child(6),
  .doc-items td:nth-child(6) {
    width: 15% !important;
  }

  .doc-totals {
    width: 100% !important;
    max-width: 100% !important;
    margin-top: 12px !important;
    font-size: 15px !important;
  }

  .doc-totals p {
    padding: 8px 10px !important;
  }

  .doc-grand-total {
    font-size: 17px !important;
  }

  .doc-terms {
    margin-top: 18px !important;
    font-size: 12px !important;
  }

  .doc-footer {
    margin-top: 18px !important;
    padding-top: 10px !important;
    font-size: 13px !important;
  }

  .print-action-row {
    position: fixed !important;
    left: 10px !important;
    right: 10px !important;
    bottom: 10px !important;
    z-index: 100000 !important;
    margin: 0 !important;
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 8px !important;
  }

  .close-print {
    width: 100% !important;
    border-radius: 12px !important;
    padding: 13px 10px !important;
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


.mini-doc-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
}

.mini-doc-brand {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mini-doc-logo {
  width: 74px;
  height: 74px;
  object-fit: contain;
}

.mini-doc-brand h3 {
  margin: 0;
  font-size: 30px;
  color: #0f172a;
}

.mini-doc-brand p {
  margin: 3px 0;
  font-size: 15px;
}

.mini-doc-brand small,
.mini-bill-grid small {
  display: block;
  color: #64748b;
  font-size: 11px;
  line-height: 1.45;
}

.mini-doc-meta {
  text-align: right;
  font-size: 12px;
  color: #334155;
}

.mini-doc-meta b,
.mini-doc-meta span {
  display: block;
  margin-bottom: 5px;
}

.mini-bill-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 18px;
  font-size: 13px;
}

.mini-bill-grid b {
  display: block;
  margin-bottom: 6px;
  color: #0f172a;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.06em;
}

.mini-bill-grid p {
  margin: 2px 0;
}

.mini-doc-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 18px;
  font-size: 11.5px;
}

.mini-doc-table th {
  text-align: left;
  background: #f8fafc;
  border-bottom: 1px solid #cbd5e1;
  padding: 8px 5px;
  color: #334155;
}

.mini-doc-table th:not(:first-child),
.mini-doc-table td:not(:first-child) {
  text-align: right;
  white-space: nowrap;
}

.mini-doc-table td {
  border-bottom: 1px solid #e5e7eb;
  padding: 9px 5px;
  vertical-align: top;
}

.mini-totals {
  width: 235px;
  margin: 18px 0 0 auto;
  border-top: 2px solid #0f172a;
  padding-top: 10px;
  font-size: 13px;
}

.mini-totals p {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 6px 0;
}

.mini-grand-total {
  border-top: 1px solid #cbd5e1;
  padding-top: 8px;
  font-size: 16px;
}

.mini-notes {
  margin-top: 20px;
  border-top: 1px solid #e5e7eb;
  padding-top: 12px;
  font-size: 12px;
  color: #334155;
}

.mini-notes p {
  margin: 6px 0 0;
  line-height: 1.45;
}

.mini-footer {
  margin-top: 24px;
  font-size: 11px;
  color: #64748b;
  line-height: 1.45;
}


.email-mobile-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.email-close-x {
  display: none;
  border: 0;
  background: #f1f5f9;
  color: #0f172a;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  font-size: 26px;
  line-height: 1;
}

@media (max-width: 900px) {
  .email-modal-backdrop {
    padding: 0 !important;
    align-items: stretch !important;
  }

  .email-modal {
    grid-template-columns: 1fr !important;
    width: 100vw !important;
    max-height: 100dvh !important;
    height: 100dvh !important;
    border-radius: 0 !important;
    overflow-y: auto !important;
    display: block !important;
    padding-bottom: 96px !important;
  }

  .email-modal-left {
    padding: 22px 18px 12px !important;
    overflow: visible !important;
    border-right: 0 !important;
  }

  .email-mobile-titlebar h2 {
    font-size: 28px !important;
  }

  .email-close-x {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
  }

  .email-input {
    font-size: 17px !important;
    padding: 14px !important;
  }

  .email-textarea {
    min-height: 280px !important;
    font-size: 16px !important;
  }

  .email-actions {
    position: fixed !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    z-index: 100002 !important;
    background: rgba(255,255,255,0.96) !important;
    backdrop-filter: blur(12px) !important;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom)) !important;
    box-shadow: 0 -10px 30px rgba(15,23,42,0.18) !important;
    margin: 0 !important;
    gap: 10px !important;
  }

  .email-send-btn {
    flex: 1 !important;
    min-height: 56px !important;
    font-size: 18px !important;
    border-radius: 14px !important;
    background: linear-gradient(135deg, #2563eb, #0ea5e9) !important;
  }

  .email-cancel-btn {
    min-height: 56px !important;
    border-radius: 14px !important;
  }

  .email-modal-right {
    display: flex !important;
    max-height: none !important;
    background: #263238 !important;
  }

  .email-preview-header {
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .email-pdf-preview {
    padding: 14px !important;
    overflow: visible !important;
  }

  .mini-doc {
    width: 100% !important;
    min-height: auto !important;
    padding: 18px !important;
    box-shadow: none !important;
  }

  .mini-doc-header,
  .mini-bill-grid {
    grid-template-columns: 1fr;
    display: grid;
    text-align: left;
  }

  .mini-doc-meta {
    text-align: left;
  }

  .mini-doc-table {
    font-size: 10px;
  }

  .mini-totals {
    width: 100%;
  }
}

`;
