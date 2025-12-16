import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate, formatDateFull, TRANSLATIONS } from '../utils';
import { TransactionType, PayerType, ExpenseCategory, ConstructionStage, PaymentMethod, Transaction } from '../types';
import { Search, Plus, X, ArrowUpRight, ArrowDownLeft, RefreshCcw, Trash2, Filter, Upload, FileText, ChevronDown, ChevronUp, Calendar, Check, Pencil } from 'lucide-react';

type PeriodFilter = 'ALL' | 'THIS_MONTH' | 'LAST_30_DAYS' | 'CUSTOM';

const Label = ({ children, required }: { children?: React.ReactNode, required?: boolean }) => (
  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
    {children}
    {required && <span className="text-red-500 ml-0.5" title="Campo obrigatório">*</span>}
  </label>
);

export const Transactions: React.FC = () => {
  const { project, transactions, partners, suppliers, addTransaction, updateTransaction, deleteTransaction } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Refactored Type Filter: Multi-select support
  const [selectedTypes, setSelectedTypes] = useState<TransactionType[]>([]);
  
  // Date Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Form State
  const initialFormState = {
    type: 'EXPENSE' as TransactionType,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    payerType: 'BOX' as PayerType,
    payerId: '',
    beneficiaryId: '',
    category: 'MATERIAL' as ExpenseCategory,
    stage: 'STRUCTURE' as ConstructionStage,
    paymentMethod: 'PIX' as PaymentMethod,
    supplier: '',
    notes: '',
  };
  const [formData, setFormData] = useState(initialFormState);

  const toggleTypeFilter = (type: TransactionType) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const clearTypeFilters = () => {
    setSelectedTypes([]);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      date: transaction.date,
      payerType: transaction.payerType,
      payerId: transaction.payerId || '',
      beneficiaryId: transaction.beneficiaryId || '',
      category: transaction.category || 'MATERIAL',
      stage: transaction.stage || 'STRUCTURE',
      paymentMethod: transaction.paymentMethod || 'PIX',
      supplier: transaction.supplier || '',
      notes: transaction.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    const payload = {
      projectId: project.id,
      type: formData.type,
      amount: parseFloat(formData.amount),
      description: formData.description,
      date: formData.date,
      payerType: formData.payerType,
      payerId: formData.payerType === 'PARTNER' ? formData.payerId : undefined,
      beneficiaryId: (formData.type === 'CONTRIBUTION' || formData.type === 'REFUND') ? formData.beneficiaryId : undefined,
      category: formData.type === 'EXPENSE' ? formData.category : undefined,
      stage: formData.type === 'EXPENSE' ? formData.stage : undefined,
      supplier: formData.type === 'EXPENSE' ? formData.supplier : undefined,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes,
    };

    if (editingId) {
      updateTransaction(editingId, payload);
    } else {
      addTransaction(payload);
    }
    
    handleCloseModal();
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Search Filter
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.amount.toString().includes(searchTerm) ||
                            (t.supplier && t.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // 2. Type Filter (Multi-select logic)
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(t.type);

      // 3. Date Filter
      let matchesDate = true;
      const tDate = new Date(t.date + 'T12:00:00'); // Force midday to avoid timezone issues with simple dates
      const now = new Date();

      if (periodFilter === 'THIS_MONTH') {
        matchesDate = tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      } else if (periodFilter === 'LAST_30_DAYS') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        matchesDate = tDate >= thirtyDaysAgo && tDate <= now;
      } else if (periodFilter === 'CUSTOM') {
        if (customStartDate) {
           const startDate = new Date(customStartDate + 'T00:00:00');
           matchesDate = matchesDate && tDate >= startDate;
        }
        if (customEndDate) {
           const endDate = new Date(customEndDate + 'T23:59:59');
           matchesDate = matchesDate && tDate <= endDate;
        }
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }, [transactions, searchTerm, selectedTypes, periodFilter, customStartDate, customEndDate]);

  // Group by Month
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    // Sort descending by date first
    const sorted = [...filteredTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    sorted.forEach(t => {
      const date = new Date(t.date + 'T12:00:00');
      const key = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      // Capitalize first letter
      const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
      if (!groups[formattedKey]) groups[formattedKey] = [];
      groups[formattedKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Explicit confirmation
    if (window.confirm('ATENÇÃO: Deseja realmente excluir esta transação?\n\nEsta ação não poderá ser desfeita.')) {
      deleteTransaction(id);
      if (isModalOpen) handleCloseModal();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Transações</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Nova Transação
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3">
        {/* Top Row: Search + Date Filter */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar por descrição, valor ou fornecedor..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
             <div className="relative min-w-[180px]">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white appearance-none cursor-pointer"
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                >
                  <option value="ALL">Todo o período</option>
                  <option value="THIS_MONTH">Este Mês</option>
                  <option value="LAST_30_DAYS">Últimos 30 dias</option>
                  <option value="CUSTOM">Personalizado</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
             </div>
             
             {periodFilter === 'CUSTOM' && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-left-2">
                  <input 
                    type="date" 
                    className="px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-sm"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    title="Data Inicial"
                  />
                  <input 
                    type="date" 
                    className="px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-sm"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    title="Data Final"
                  />
                </div>
             )}
          </div>
        </div>
        
        {/* Bottom Row: Type Filters (Multi-select) */}
        <div className="flex gap-2 overflow-x-auto pb-1 items-center">
          <button 
            onClick={clearTypeFilters}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              selectedTypes.length === 0 
                ? 'bg-gray-800 text-white' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
             {selectedTypes.length === 0 && <Check size={14} />}
             Todas
          </button>
          
          <button 
            onClick={() => toggleTypeFilter('EXPENSE')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              selectedTypes.includes('EXPENSE') 
                ? 'bg-red-100 text-red-700 border border-red-200 ring-2 ring-red-500/20' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {selectedTypes.includes('EXPENSE') && <Check size={14} />}
            Despesas
          </button>
          
          <button 
            onClick={() => toggleTypeFilter('CONTRIBUTION')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              selectedTypes.includes('CONTRIBUTION') 
                ? 'bg-green-100 text-green-700 border border-green-200 ring-2 ring-green-500/20' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {selectedTypes.includes('CONTRIBUTION') && <Check size={14} />}
            Aportes
          </button>
          
          <button 
            onClick={() => toggleTypeFilter('REFUND')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              selectedTypes.includes('REFUND') 
                ? 'bg-amber-100 text-amber-700 border border-amber-200 ring-2 ring-amber-500/20' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {selectedTypes.includes('REFUND') && <Check size={14} />}
            Reembolsos
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-6">
        {Object.keys(groupedTransactions).length === 0 && (
           <div className="text-center py-16 bg-white rounded-xl border border-gray-100 border-dashed">
             <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
               <FileText size={32} />
             </div>
             <p className="text-gray-500 font-medium">Nenhuma transação encontrada.</p>
             <p className="text-sm text-gray-400 mt-1">
               {selectedTypes.length > 0 || periodFilter !== 'ALL' 
                 ? 'Tente ajustar os filtros.' 
                 : 'Adicione uma nova transação para começar.'}
             </p>
           </div>
        )}

        {Object.entries(groupedTransactions).map(([month, items]) => (
          <div key={month}>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">{month}</h3>
            <div className="space-y-3">
              {(items as Transaction[]).map(t => {
                const isExpense = t.type === 'EXPENSE';
                const isContribution = t.type === 'CONTRIBUTION';
                const isRefund = t.type === 'REFUND';
                
                const partnerName = t.payerType === 'PARTNER' 
                  ? partners.find(p => p.id === t.payerId)?.name?.split(' ')[0] 
                  : null;
                const beneficiaryName = t.beneficiaryId
                  ? partners.find(p => p.id === t.beneficiaryId)?.name?.split(' ')[0]
                  : null;

                return (
                  <Card key={t.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 py-4 hover:border-gray-300 transition-all cursor-pointer" onClick={() => handleEdit(t)}>
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      isExpense ? 'bg-red-50 text-red-600' : 
                      isContribution ? 'bg-green-50 text-green-600' : 
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {isExpense ? <ArrowUpRight size={24} /> : 
                       isContribution ? <ArrowDownLeft size={24} /> : 
                       <RefreshCcw size={24} />}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900 truncate text-base">{t.description}</span>
                        {t.supplier && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{t.supplier}</span>}
                      </div>
                      
                      <div className="text-sm text-gray-500 flex flex-wrap gap-x-3 gap-y-1 items-center">
                        <span>{formatDate(t.date)}</span>
                        
                        {isExpense && (
                          <>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span>{TRANSLATIONS.CATEGORIES[t.category || 'OTHER']}</span>
                            {t.stage && (
                              <>
                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span>{TRANSLATIONS.STAGES[t.stage]}</span>
                              </>
                            )}
                          </>
                        )}
                        
                        {(partnerName || beneficiaryName) && (
                          <>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className={`font-medium ${isExpense ? 'text-orange-600' : 'text-blue-600'}`}>
                              {isExpense ? `Pago por ${partnerName}` : `Ref: ${beneficiaryName}`}
                            </span>
                          </>
                        )}
                        
                        {t.payerType === 'BOX' && isExpense && (
                          <>
                             <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                             <span className="text-gray-500">Pago pelo Caixa</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Value & Actions */}
                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
                      <div className={`font-bold text-lg whitespace-nowrap text-right ${
                        isExpense ? 'text-red-600' : 
                        isContribution ? 'text-green-600' : 
                        'text-amber-600'
                      }`}>
                        {isContribution ? '+' : '-'}{formatCurrency(t.amount)}
                        <div className="text-[10px] font-normal text-gray-400 uppercase tracking-wide">
                          {t.paymentMethod ? TRANSLATIONS.PAYMENT_METHODS[t.paymentMethod] : 'Indefinido'}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                         <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(t); }}
                          className="text-gray-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(t.id, e)}
                          className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 transition-all">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Editar Transação' : 'Nova Transação'}</h2>
                <p className="text-sm text-gray-500">{editingId ? 'Altere os dados abaixo' : 'Preencha os dados do lançamento'}</p>
              </div>
              <button 
                onClick={handleCloseModal} 
                className="text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form id="transaction-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Type Selection - Segmented Control */}
                <div className="p-1 bg-gray-100 rounded-xl grid grid-cols-3 gap-1">
                  {(['EXPENSE', 'CONTRIBUTION', 'REFUND'] as TransactionType[]).map(type => {
                    const isActive = formData.type === type;
                    let activeClass = '';
                    let icon = null;
                    
                    if (type === 'EXPENSE') {
                      activeClass = 'bg-white text-red-600 shadow-sm ring-1 ring-black/5';
                      icon = <ArrowUpRight size={16} />;
                    } else if (type === 'CONTRIBUTION') {
                      activeClass = 'bg-white text-green-600 shadow-sm ring-1 ring-black/5';
                      icon = <ArrowDownLeft size={16} />;
                    } else {
                      activeClass = 'bg-white text-amber-600 shadow-sm ring-1 ring-black/5';
                      icon = <RefreshCcw size={16} />;
                    }

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type }))}
                        className={`
                          flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all
                          ${isActive ? activeClass : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}
                        `}
                      >
                        {icon}
                        <span>
                          {type === 'EXPENSE' ? 'Despesa' : type === 'CONTRIBUTION' ? 'Aporte' : 'Reembolso'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Primary Fields Group */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                   <div className="space-y-1.5">
                      <Label required>Valor</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">R$</span>
                        <input 
                          type="number" 
                          step="0.01" 
                          required
                          placeholder="0,00"
                          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-lg font-bold text-gray-900 transition-all placeholder:font-normal"
                          value={formData.amount}
                          onChange={e => setFormData(prev => ({...prev, amount: e.target.value}))}
                        />
                      </div>
                   </div>
                   
                   <div className="space-y-1.5">
                      <Label required>Data</Label>
                      <input 
                        type="date" 
                        required
                        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-gray-900 font-medium transition-all"
                        value={formData.date}
                        onChange={e => setFormData(prev => ({...prev, date: e.target.value}))}
                      />
                   </div>
                </div>

                <div className="space-y-1.5">
                   <Label required>Descrição</Label>
                   <input 
                     type="text" 
                     required
                     placeholder={formData.type === 'EXPENSE' ? 'Ex: Compra de Cimento CP II' : 'Ex: Aporte Mensal Referente a Outubro'}
                     className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-gray-900 placeholder:text-gray-400 transition-all"
                     value={formData.description}
                     onChange={e => setFormData(prev => ({...prev, description: e.target.value}))}
                   />
                </div>

                {/* Expense Specific Section */}
                {formData.type === 'EXPENSE' && (
                  <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-5 space-y-5 animate-in fade-in slide-in-from-top-2">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2 border-b border-gray-200 pb-2">
                      Detalhes da Despesa
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label required>Categoria</Label>
                        <div className="relative">
                          <select
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none"
                            value={formData.category}
                            onChange={(e) => setFormData(prev => ({...prev, category: e.target.value as ExpenseCategory}))}
                          >
                            {Object.entries(TRANSLATIONS.CATEGORIES).map(([key, label]) => (
                               <option key={key} value={key}>{label}</option>
                             ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label required>Etapa da Obra</Label>
                        <div className="relative">
                          <select
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none"
                            value={formData.stage}
                            onChange={(e) => setFormData(prev => ({...prev, stage: e.target.value as ConstructionStage}))}
                          >
                            {Object.entries(TRANSLATIONS.STAGES).map(([key, label]) => (
                               <option key={key} value={key}>{label}</option>
                             ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                       <Label>Fornecedor (Opcional)</Label>
                       <div className="relative">
                         <select
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none"
                            value={formData.supplier}
                            onChange={(e) => {
                              const selectedName = e.target.value;
                              const supplierObj = suppliers.find(s => s.name === selectedName);
                              
                              setFormData(prev => ({
                                ...prev, 
                                supplier: selectedName,
                                category: (supplierObj && supplierObj.defaultCategory) ? supplierObj.defaultCategory : prev.category
                              }));
                            }}
                          >
                            <option value="">Selecione um fornecedor...</option>
                            {suppliers.map(s => (
                              <option key={s.id} value={s.name}>{s.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                       </div>
                       {suppliers.length === 0 && (
                         <div className="text-xs text-amber-600 mt-1">Nenhum fornecedor cadastrado. Vá em "Fornecedores" para adicionar.</div>
                       )}
                    </div>

                    <div className="pt-2">
                       <Label required>Quem pagou?</Label>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                          <label 
                            className={`
                              relative flex items-start p-3 rounded-xl border cursor-pointer transition-all hover:bg-white
                              ${formData.payerType === 'BOX' 
                                ? 'bg-white border-primary ring-1 ring-primary shadow-sm' 
                                : 'bg-transparent border-gray-200 hover:border-gray-300'}
                            `}
                          >
                            <input 
                              type="radio" 
                              name="payerType"
                              className="mt-1 w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                              checked={formData.payerType === 'BOX'}
                              onChange={() => setFormData(prev => ({...prev, payerType: 'BOX'}))}
                            />
                            <div className="ml-3">
                              <span className="block text-sm font-semibold text-gray-900">Caixa da Obra</span>
                              <span className="block text-xs text-gray-500 mt-0.5">Saldo do projeto</span>
                            </div>
                          </label>

                          <label 
                            className={`
                              relative flex items-start p-3 rounded-xl border cursor-pointer transition-all hover:bg-white
                              ${formData.payerType === 'PARTNER' 
                                ? 'bg-white border-primary ring-1 ring-primary shadow-sm' 
                                : 'bg-transparent border-gray-200 hover:border-gray-300'}
                            `}
                          >
                            <input 
                              type="radio" 
                              name="payerType"
                              className="mt-1 w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                              checked={formData.payerType === 'PARTNER'}
                              onChange={() => setFormData(prev => ({...prev, payerType: 'PARTNER'}))}
                            />
                            <div className="ml-3 w-full">
                              <span className="block text-sm font-semibold text-gray-900">Sócio (Reembolso)</span>
                              <span className="block text-xs text-gray-500 mt-0.5">Pagou do próprio bolso</span>
                              
                              {formData.payerType === 'PARTNER' && (
                                <select
                                  required
                                  className="mt-2 w-full text-sm py-1.5 pl-2 pr-8 border-gray-200 rounded-md bg-gray-50 focus:bg-white focus:ring-1 focus:ring-primary outline-none"
                                  value={formData.payerId}
                                  onChange={(e) => setFormData(prev => ({...prev, payerId: e.target.value}))}
                                  onClick={(e) => e.stopPropagation()} // Prevent radio trigger
                                >
                                  <option value="">Selecione o sócio...</option>
                                  {partners.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </label>
                       </div>
                    </div>
                  </div>
                )}

                {/* Partner for Contribution/Refund */}
                {(formData.type === 'CONTRIBUTION' || formData.type === 'REFUND') && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <Label required>Sócio Relacionado</Label>
                    <div className="relative">
                      <select
                        required
                        className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none"
                        value={formData.beneficiaryId}
                        onChange={(e) => setFormData(prev => ({...prev, beneficiaryId: e.target.value}))}
                      >
                        <option value="">Selecione o sócio...</option>
                        {partners.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                )}

                {/* Payment Method & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                   <div className="space-y-1.5">
                      <Label>Forma de Pagamento</Label>
                      <div className="relative">
                        <select
                          className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none"
                          value={formData.paymentMethod}
                          onChange={(e) => setFormData(prev => ({...prev, paymentMethod: e.target.value as PaymentMethod}))}
                        >
                           {Object.entries(TRANSLATIONS.PAYMENT_METHODS).map(([key, label]) => (
                             <option key={key} value={key}>{label}</option>
                           ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                   </div>
                   
                   <div className="space-y-1.5">
                      <Label>Comprovante</Label>
                      <button type="button" className="w-full py-2.5 px-4 bg-white border border-gray-200 border-dashed rounded-lg text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                         <Upload size={18} />
                         <span className="text-sm">Anexar Arquivo</span>
                      </button>
                   </div>
                </div>

                <div className="space-y-1.5">
                    <Label>Observações</Label>
                    <textarea 
                      rows={2}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                      placeholder="Detalhes adicionais..."
                      value={formData.notes}
                      onChange={e => setFormData(prev => ({...prev, notes: e.target.value}))}
                    />
                 </div>

              </form>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0 flex justify-between items-center gap-3">
               <div>
                 {editingId && (
                   <button 
                     type="button" 
                     onClick={() => handleDelete(editingId)}
                     className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                   >
                     <Trash2 size={16} />
                     <span className="hidden sm:inline">Excluir</span>
                   </button>
                 )}
               </div>
               <div className="flex gap-3">
                 <button 
                   type="button" 
                   onClick={handleCloseModal}
                   className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="submit" 
                   form="transaction-form"
                   className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-slate-800 transition-all shadow-md shadow-primary/20"
                 >
                   {editingId ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};