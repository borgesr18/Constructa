
export type TransactionType = 'CONTRIBUTION' | 'EXPENSE' | 'REFUND';
export type ExpenseCategory = 'MATERIAL' | 'LABOR' | 'EQUIPMENT' | 'ADMIN' | 'OTHER';
export type ConstructionStage = 'PLANNING' | 'FOUNDATION' | 'STRUCTURE' | 'MASONRY' | 'ELECTRICAL' | 'PLUMBING' | 'FINISHING' | 'PAINTING' | 'EXTERNAL' | 'OTHER';
export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'TRANSFER' | 'BOLETO';
export type PayerType = 'BOX' | 'PARTNER';

export interface Project {
  id: string;
  name: string;
  address: string;
  startDate: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  distributionType: 'PERCENTAGE' | 'FIXED';
}

export interface Partner {
  id: string;
  projectId: string;
  name: string;
  email: string;
  phone?: string; 
  avatarUrl?: string;
  percentage?: number; // For PERCENTAGE distribution
  fixedValue?: number; // For FIXED distribution
}

export interface Supplier {
  id: string;
  projectId: string;
  name: string;
  document?: string; // CPF or CNPJ
  contact?: string;
  defaultCategory?: ExpenseCategory;
}

export interface BudgetForecast {
  id: string;
  projectId: string;
  month: string; // Format: "YYYY-MM"
  totalAmount: number; // Total budget needed for this month
  notes?: string;
}

export interface Transaction {
  id: string;
  projectId: string;
  type: TransactionType;
  date: string;
  amount: number;
  description: string;
  category?: ExpenseCategory;
  stage?: ConstructionStage; 
  supplier?: string; 
  payerType: PayerType; // Who paid? The project box or a partner from their pocket?
  payerId?: string; // If payerType is PARTNER, which one?
  beneficiaryId?: string; // If type is CONTRIBUTION or REFUND, which partner involved?
  paymentMethod?: PaymentMethod;
  notes?: string;
  proofUrl?: string; 
  createdAt: string;
}

export interface FinancialSummary {
  totalExpenses: number;
  boxBalance: number;
  partnerBalances: Record<string, PartnerBalance>;
}

export interface PartnerBalance {
  partnerId: string;
  partnerName: string;
  totalContributed: number; // Aportes
  totalExpensesPaid: number; // Despesas pagas do bolso
  totalRefundsReceived: number; // Reembolsos
  fairShare: number; // Quanto deveria ter pago (baseado no rateio global ou período)
  balance: number; // (Contributed + ExpensesPaid - Refunds) - FairShare. >0 = Crédito, <0 = Débito
}
