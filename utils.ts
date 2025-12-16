import { Partner, Transaction, FinancialSummary, Project, PartnerBalance, ConstructionStage, ExpenseCategory, PaymentMethod } from './types';

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR').format(date);
};

export const formatDateFull = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  }).format(date);
};

// --- TRANSLATION HELPERS ---

export const TRANSLATIONS = {
  STAGES: {
    PLANNING: 'Planejamento',
    FOUNDATION: 'Fundação',
    STRUCTURE: 'Estrutura',
    MASONRY: 'Alvenaria',
    ELECTRICAL: 'Elétrica',
    PLUMBING: 'Hidráulica',
    FINISHING: 'Acabamento',
    PAINTING: 'Pintura',
    EXTERNAL: 'Área Externa',
    OTHER: 'Outros',
  } as Record<ConstructionStage, string>,
  
  CATEGORIES: {
    MATERIAL: 'Material',
    LABOR: 'Mão de Obra',
    EQUIPMENT: 'Equipamentos',
    ADMIN: 'Administrativo',
    OTHER: 'Outros',
  } as Record<ExpenseCategory, string>,

  PAYMENT_METHODS: {
    PIX: 'Pix',
    CREDIT_CARD: 'Cartão de Crédito',
    DEBIT_CARD: 'Cartão de Débito',
    CASH: 'Dinheiro',
    TRANSFER: 'Transferência',
    BOLETO: 'Boleto',
  } as Record<PaymentMethod, string>
};

// --- THE CORE FINANCIAL ENGINE ---

export const calculateFinancials = (
  project: Project,
  partners: Partner[],
  transactions: Transaction[]
): FinancialSummary => {
  let totalExpenses = 0;
  let boxInflow = 0; // Money entering the box (Contributions)
  let boxOutflow = 0; // Money leaving the box (Expenses paid by box + Refunds)

  // 1. Calculate Aggregates
  transactions.forEach((t) => {
    if (t.type === 'EXPENSE') {
      totalExpenses += t.amount;
      if (t.payerType === 'BOX') {
        boxOutflow += t.amount;
      }
    } else if (t.type === 'CONTRIBUTION') {
      boxInflow += t.amount;
    } else if (t.type === 'REFUND') {
      boxOutflow += t.amount;
    }
  });

  const boxBalance = boxInflow - boxOutflow;

  // 2. Calculate Partner Balances
  const partnerBalances: Record<string, PartnerBalance> = {};

  partners.forEach((partner) => {
    // A. Calculate what they ACTUALLY paid
    const contributions = transactions
      .filter((t) => t.type === 'CONTRIBUTION' && t.beneficiaryId === partner.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const expensesPaid = transactions
      .filter((t) => t.type === 'EXPENSE' && t.payerType === 'PARTNER' && t.payerId === partner.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const refundsReceived = transactions
      .filter((t) => t.type === 'REFUND' && t.beneficiaryId === partner.id)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPaidActual = contributions + expensesPaid - refundsReceived;

    // B. Calculate what they SHOULD have paid (Fair Share)
    let fairShare = 0;
    if (project.distributionType === 'PERCENTAGE') {
      const pct = partner.percentage || 0;
      fairShare = totalExpenses * (pct / 100);
    } else {
      // FIXED value model (simplification: assumes fixed value is total expected contribution for the period)
      // In a real app, this would be multiplied by months active, but for MVP we use the static value as target
      fairShare = partner.fixedValue || 0; 
    }

    // C. Final Balance (Positive = Credit/Receivable, Negative = Debt/Payable)
    const balance = totalPaidActual - fairShare;

    partnerBalances[partner.id] = {
      partnerId: partner.id,
      partnerName: partner.name,
      totalContributed: contributions,
      totalExpensesPaid: expensesPaid,
      totalRefundsReceived: refundsReceived,
      fairShare,
      balance,
    };
  });

  return {
    totalExpenses,
    boxBalance,
    partnerBalances,
  };
};