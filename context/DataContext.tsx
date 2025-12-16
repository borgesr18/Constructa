import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, Partner, Transaction, FinancialSummary, Supplier, BudgetForecast } from '../types';
import { calculateFinancials } from '../utils';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface DataContextType {
  loading: boolean;
  project: Project | null;
  partners: Partner[];
  suppliers: Supplier[];
  transactions: Transaction[];
  budgetForecasts: BudgetForecast[];
  financials: FinancialSummary;
  // Transactions
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, t: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  clearTransactions: () => Promise<void>;
  // Project
  updateProject: (p: Partial<Project>) => Promise<void>;
  createInitialProject: (name: string) => Promise<void>;
  // Partners
  addPartner: (p: Omit<Partner, 'id'>) => Promise<void>;
  updatePartner: (id: string, p: Partial<Partner>) => Promise<void>;
  deletePartner: (id: string) => Promise<void>;
  // Suppliers
  addSupplier: (s: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  // Budget Forecasts
  addForecast: (f: Omit<BudgetForecast, 'id'>) => Promise<void>;
  updateForecast: (id: string, f: Partial<BudgetForecast>) => Promise<void>;
  deleteForecast: (id: string) => Promise<void>;
  // System
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [project, setProject] = useState<Project | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetForecasts, setBudgetForecasts] = useState<BudgetForecast[]>([]);
  
  const [financials, setFinancials] = useState<FinancialSummary>({
    totalExpenses: 0,
    boxBalance: 0,
    partnerBalances: {},
  });

  // --- FETCH DATA ---
  const refreshData = useCallback(async () => {
    if (!user) {
        setProject(null);
        setPartners([]);
        setSuppliers([]);
        setTransactions([]);
        setBudgetForecasts([]);
        setLoading(false);
        return;
    }

    try {
        setLoading(true);
        // 1. Get Project
        const { data: projects, error: pError } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .limit(1);

        if (pError) throw pError;

        if (projects && projects.length > 0) {
            const currentProject = projects[0];
            // Normalize DB keys to CamelCase if needed, but lets assume we adjust Types or map them
            // For simplicity, we assume the DB columns match the types or we map them here.
            // Since Supabase returns snake_case by default, we map manually:
            const mappedProject: Project = {
                id: currentProject.id,
                name: currentProject.name,
                address: currentProject.address || '',
                startDate: currentProject.start_date,
                status: currentProject.status,
                distributionType: currentProject.distribution_type
            };
            setProject(mappedProject);

            // 2. Get Partners
            const { data: dbPartners } = await supabase.from('partners').select('*').eq('project_id', currentProject.id);
            setPartners(dbPartners?.map(p => ({
                id: p.id, projectId: p.project_id, name: p.name, email: p.email, phone: p.phone, avatarUrl: p.avatar_url, percentage: p.percentage, fixedValue: p.fixed_value
            })) || []);

            // 3. Get Suppliers
            const { data: dbSuppliers } = await supabase.from('suppliers').select('*').eq('project_id', currentProject.id);
            setSuppliers(dbSuppliers?.map(s => ({
                id: s.id, projectId: s.project_id, name: s.name, document: s.document, contact: s.contact, defaultCategory: s.default_category
            })) || []);

            // 4. Get Transactions
            const { data: dbTransactions } = await supabase.from('transactions').select('*').eq('project_id', currentProject.id).order('date', { ascending: false });
            setTransactions(dbTransactions?.map(t => ({
                id: t.id, projectId: t.project_id, type: t.type, amount: t.amount, description: t.description, date: t.date,
                category: t.category, stage: t.stage, supplier: t.supplier, payerType: t.payer_type, payerId: t.payer_id,
                beneficiaryId: t.beneficiary_id, paymentMethod: t.payment_method, notes: t.notes, proofUrl: t.proof_url, createdAt: t.created_at
            })) || []);

            // 5. Get Forecasts
            const { data: dbForecasts } = await supabase.from('budget_forecasts').select('*').eq('project_id', currentProject.id);
            setBudgetForecasts(dbForecasts?.map(f => ({
                id: f.id, projectId: f.project_id, month: f.month, totalAmount: f.total_amount, notes: f.notes
            })) || []);

        } else {
            setProject(null); // No project found, user needs to create one
        }

    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Recalculate financials whenever data changes
  useEffect(() => {
    if (project) {
        const summary = calculateFinancials(project, partners, transactions);
        setFinancials(summary);
    }
  }, [project, partners, transactions]);


  // --- ACTIONS (Wrapped in async/await with mapping) ---

  const createInitialProject = async (name: string) => {
      if (!user) return;
      const { error } = await supabase.from('projects').insert({
          user_id: user.id,
          name: name,
          start_date: new Date().toISOString(),
          status: 'ACTIVE',
          distribution_type: 'PERCENTAGE'
      });
      if (!error) refreshData();
  };

  const addTransaction = async (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    // Map CamelCase to snake_case
    const dbT = {
        project_id: t.projectId, type: t.type, amount: t.amount, description: t.description, date: t.date,
        category: t.category, stage: t.stage, supplier: t.supplier, payer_type: t.payerType, payer_id: t.payerId,
        beneficiary_id: t.beneficiaryId, payment_method: t.paymentMethod, notes: t.notes
    };
    const { error } = await supabase.from('transactions').insert(dbT);
    if (!error) refreshData();
  };

  const updateTransaction = async (id: string, t: Partial<Transaction>) => {
    // Basic mapping (incomplete, but sufficient for demo)
    const dbT: any = {};
    if (t.amount !== undefined) dbT.amount = t.amount;
    if (t.description !== undefined) dbT.description = t.description;
    if (t.date !== undefined) dbT.date = t.date;
    if (t.payerType !== undefined) dbT.payer_type = t.payerType;
    if (t.payerId !== undefined) dbT.payer_id = t.payerId;
    if (t.beneficiaryId !== undefined) dbT.beneficiary_id = t.beneficiaryId;
    if (t.category !== undefined) dbT.category = t.category;
    if (t.stage !== undefined) dbT.stage = t.stage;
    if (t.supplier !== undefined) dbT.supplier = t.supplier;
    if (t.paymentMethod !== undefined) dbT.payment_method = t.paymentMethod;
    if (t.notes !== undefined) dbT.notes = t.notes;

    const { error } = await supabase.from('transactions').update(dbT).eq('id', id);
    if (!error) refreshData();
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) refreshData();
  };

  const clearTransactions = async () => {
     if (!project) return;
     await supabase.from('transactions').delete().eq('project_id', project.id);
     await supabase.from('budget_forecasts').delete().eq('project_id', project.id);
     refreshData();
  };

  // --- Project ---
  const updateProject = async (updates: Partial<Project>) => {
    if (!project) return;
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.address) dbUpdates.address = updates.address;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.startDate) dbUpdates.start_date = updates.startDate;
    if (updates.distributionType) dbUpdates.distribution_type = updates.distributionType;

    const { error } = await supabase.from('projects').update(dbUpdates).eq('id', project.id);
    if (!error) refreshData();
  };

  // --- Partners ---
  const addPartner = async (p: Omit<Partner, 'id'>) => {
    const dbP = {
        project_id: p.projectId, name: p.name, email: p.email, phone: p.phone, 
        avatar_url: p.avatarUrl, percentage: p.percentage, fixed_value: p.fixedValue
    };
    const { error } = await supabase.from('partners').insert(dbP);
    if (!error) refreshData();
  };

  const updatePartner = async (id: string, updates: Partial<Partner>) => {
    const dbP: any = {};
    if (updates.name) dbP.name = updates.name;
    if (updates.email) dbP.email = updates.email;
    if (updates.phone) dbP.phone = updates.phone;
    if (updates.percentage !== undefined) dbP.percentage = updates.percentage;
    if (updates.fixedValue !== undefined) dbP.fixed_value = updates.fixedValue;

    const { error } = await supabase.from('partners').update(dbP).eq('id', id);
    if (!error) refreshData();
  };

  const deletePartner = async (id: string) => {
    const { error } = await supabase.from('partners').delete().eq('id', id);
    if (!error) refreshData();
  };

  // --- Suppliers ---
  const addSupplier = async (s: Omit<Supplier, 'id'>) => {
    const dbS = {
        project_id: s.projectId, 
        name: s.name, 
        document: s.document || null, // Ensure empty strings become null
        contact: s.contact, 
        default_category: s.defaultCategory
    };
    const { error } = await supabase.from('suppliers').insert(dbS);
    if (error) throw error; // Throw error to be caught by UI
    await refreshData();
  };

  const updateSupplier = async (id: string, s: Partial<Supplier>) => {
     const dbS: any = {};
     if (s.name) dbS.name = s.name;
     if (s.contact) dbS.contact = s.contact;
     if (s.document !== undefined) dbS.document = s.document || null;
     if (s.defaultCategory) dbS.default_category = s.defaultCategory;
     
     const { error } = await supabase.from('suppliers').update(dbS).eq('id', id);
     if (error) throw error; // Throw error to be caught by UI
     await refreshData();
  };

  const deleteSupplier = async (id: string) => {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (!error) refreshData();
  };

  // --- Budget Forecasts ---
  const addForecast = async (f: Omit<BudgetForecast, 'id'>) => {
    const dbF = {
        project_id: f.projectId, month: f.month, total_amount: f.totalAmount, notes: f.notes
    };
    const { error } = await supabase.from('budget_forecasts').insert(dbF);
    if (!error) refreshData();
  };

  const updateForecast = async (id: string, f: Partial<BudgetForecast>) => {
     const dbF: any = {};
     if (f.totalAmount !== undefined) dbF.total_amount = f.totalAmount;
     const { error } = await supabase.from('budget_forecasts').update(dbF).eq('id', id);
     if (!error) refreshData();
  };

  const deleteForecast = async (id: string) => {
     const { error } = await supabase.from('budget_forecasts').delete().eq('id', id);
     if (!error) refreshData();
  };

  return (
    <DataContext.Provider value={{
      loading,
      project,
      partners,
      suppliers,
      transactions,
      budgetForecasts,
      financials,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      clearTransactions,
      updateProject,
      createInitialProject,
      addPartner,
      updatePartner,
      deletePartner,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      addForecast,
      updateForecast,
      deleteForecast,
      refreshData
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};