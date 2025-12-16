
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency, formatDate } from '../utils';
import { 
  PiggyBank, Target, Calendar, CheckCircle2, AlertCircle, 
  TrendingUp, Wallet, ArrowDownLeft, X, Plus, DollarSign,
  TrendingDown, AlertTriangle, Info, Pencil, Landmark,
  ChevronDown, ChevronUp, History, ArrowUpRight, RefreshCcw
} from 'lucide-react';
import { PartnerBalance } from '../types';

type Tab = 'FORECAST' | 'CREDITS';

export const FinancialPlanning: React.FC = () => {
  const { project, partners, budgetForecasts, transactions, financials, addForecast, updateForecast, addTransaction } = useData();
  const [activeTab, setActiveTab] = useState<Tab>('FORECAST');
  
  // Forecast State
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isEditingForecast, setIsEditingForecast] = useState(false);
  const [forecastAmount, setForecastAmount] = useState('');
  
  // Toggle for Details
  const [expandedPartners, setExpandedPartners] = useState<Set<string>>(new Set());

  // LIQUIDITY CONTROL
  const [allowCreditAbatement, setAllowCreditAbatement] = useState(false);

  // Contribution Modal State
  const [contributionModalOpen, setContributionModalOpen] = useState(false);
  const [selectedContributionPartner, setSelectedContributionPartner] = useState<{id: string, name: string, amount: number} | null>(null);
  const [contributionDate, setContributionDate] = useState(new Date().toISOString().split('T')[0]);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedRefundPartnerId, setSelectedRefundPartnerId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState('');

  // --- LOGIC: FORECAST ---
  const currentForecast = budgetForecasts.find(f => f.month === selectedMonth);
  
  const handleSaveForecast = () => {
    if (!forecastAmount) return;
    const amount = parseFloat(forecastAmount);
    
    if (currentForecast) {
      updateForecast(currentForecast.id, { totalAmount: amount });
    } else {
      addForecast({
        projectId: project.id,
        month: selectedMonth,
        totalAmount: amount,
        notes: ''
      });
    }
    setIsEditingForecast(false);
  };

  const togglePartnerDetails = (partnerId: string) => {
    const newSet = new Set(expandedPartners);
    if (newSet.has(partnerId)) {
      newSet.delete(partnerId);
    } else {
      newSet.add(partnerId);
    }
    setExpandedPartners(newSet);
  };

  const forecastData = useMemo(() => {
    if (!currentForecast) return [];

    return partners.map(partner => {
      // 1. Expected (Accounting Share)
      const percentage = partner.percentage || 0;
      const expectedAmount = currentForecast.totalAmount * (percentage / 100);

      // 2. Realized (Paid in this month)
      const partnerTransactions = transactions.filter(t => {
        const tDate = t.date.slice(0, 7);
        if (tDate !== selectedMonth) return false;
        // Contribution OR Expense paid by Partner OR Refund received
        if (t.type === 'CONTRIBUTION' && t.beneficiaryId === partner.id) return true;
        if (t.type === 'EXPENSE' && t.payerType === 'PARTNER' && t.payerId === partner.id) return true;
        if (t.type === 'REFUND' && t.beneficiaryId === partner.id) return true;
        return false;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Split realized into Cash vs Direct Expense
      const directExpenses = partnerTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const cashContributions = partnerTransactions
        .filter(t => t.type === 'CONTRIBUTION')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const refundsReceived = partnerTransactions
        .filter(t => t.type === 'REFUND')
        .reduce((sum, t) => sum + t.amount, 0);

      // Realized calculation: (Contributions + Direct Expenses) - Refunds
      const realizedAmount = (directExpenses + cashContributions) - refundsReceived;

      // 3. Credit Logic
      const globalBalance = financials.partnerBalances[partner.id]?.balance || 0;
      const availableCredit = Math.max(0, globalBalance); 
      
      // 4. Pending Calculation
      let pending = expectedAmount - realizedAmount;
      let usedCredit = 0;

      if (allowCreditAbatement && pending > 0) {
        const abatement = Math.min(pending, availableCredit);
        pending -= abatement;
        usedCredit = abatement;
      }

      pending = Math.max(0, pending);

      const progress = expectedAmount > 0 ? ((realizedAmount + usedCredit) / expectedAmount) * 100 : 0;

      return {
        partner,
        percentage,
        expectedAmount,
        realizedAmount,
        directExpenses,
        cashContributions,
        refundsReceived,
        transactions: partnerTransactions, // Exposing transactions for the UI
        availableCredit,
        usedCredit,
        pending,
        progress
      };
    });
  }, [currentForecast, partners, transactions, selectedMonth, allowCreditAbatement, financials]);

  // --- AGGREGATES FOR BUDGET FULFILLMENT ---
  const totalExpectedInMonth = currentForecast?.totalAmount || 0; // Meta
  const totalRealizedInMonth = forecastData.reduce((acc, curr) => acc + curr.realizedAmount, 0); // Already paid (cash or expense)
  const totalPendingInMonth = Math.max(0, totalExpectedInMonth - totalRealizedInMonth);

  // --- AGGREGATES FOR CASH FLOW / LIQUIDITY ANALYSIS ---
  const totalDirectExpensesInMonth = forecastData.reduce((acc, curr) => acc + curr.directExpenses, 0);
  const totalProjectedCashInflow = forecastData.reduce((acc, curr) => acc + curr.pending, 0); // Future CASH coming in
  const totalCreditsUsed = forecastData.reduce((acc, curr) => acc + curr.usedCredit, 0);
  
  // 1. CASH NEEDED FROM BOX: The part of the budget that MUST be paid with cash (Meta - DirectExpenses)
  const cashNeededForBudget = Math.max(0, totalExpectedInMonth - totalDirectExpensesInMonth);
  
  // 2. CASH AVAILABLE: Money we have now + Money coming in soon
  const cashAvailable = financials.boxBalance + totalProjectedCashInflow;
  
  // 3. PROJECTED ENDING BALANCE: Will we have money left or are we short?
  const projectedEndingBalance = cashAvailable - cashNeededForBudget;
  const isLiquidityShortfall = projectedEndingBalance < 0;
  const liquidityGap = Math.abs(projectedEndingBalance);

  // --- LOGIC: CONTRIBUTION ---
  const handleOpenContribution = (partnerId: string, name: string, pendingAmount: number) => {
    setSelectedContributionPartner({ id: partnerId, name, amount: pendingAmount });
    setContributionModalOpen(true);
  };

  const handleProcessContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContributionPartner) return;

    addTransaction({
      projectId: project.id,
      type: 'CONTRIBUTION',
      date: contributionDate,
      amount: selectedContributionPartner.amount,
      description: `Aporte - Ref. ${selectedMonth}`,
      beneficiaryId: selectedContributionPartner.id,
      payerType: 'PARTNER',
      paymentMethod: 'TRANSFER', 
      notes: 'Gerado via Planejamento Financeiro'
    });

    setContributionModalOpen(false);
    setSelectedContributionPartner(null);
  };

  // --- LOGIC: CREDITS ---
  const creditPartners = useMemo(() => {
    return Object.values(financials.partnerBalances)
      .filter((pb: PartnerBalance) => pb.balance > 0.01)
      .sort((a: PartnerBalance, b: PartnerBalance) => b.balance - a.balance);
  }, [financials]);

  const handleOpenRefund = (partnerId: string, maxAmount: number) => {
    setSelectedRefundPartnerId(partnerId);
    setRefundAmount(maxAmount.toFixed(2));
    setRefundModalOpen(true);
  };

  const handleProcessRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefundPartnerId || !refundAmount) return;

    addTransaction({
      projectId: project.id,
      type: 'REFUND',
      date: new Date().toISOString().split('T')[0],
      amount: parseFloat(refundAmount),
      description: 'Reembolso de Créditos',
      beneficiaryId: selectedRefundPartnerId,
      payerType: 'BOX',
      paymentMethod: 'TRANSFER',
      notes: 'Gerado via módulo de Gestão de Créditos'
    });

    setRefundModalOpen(false);
    setSelectedRefundPartnerId(null);
    setRefundAmount('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planejamento Financeiro</h1>
          <p className="text-gray-500">Gerencie chamadas de capital e liquidez da obra</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('FORECAST')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'FORECAST' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Previsão & Liquidez
        </button>
        <button
          onClick={() => setActiveTab('CREDITS')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'CREDITS' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Gestão de Créditos
        </button>
      </div>

      {/* TAB CONTENT: FORECAST */}
      {activeTab === 'FORECAST' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
          
          {/* Controls Header */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
             <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="month" 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 bg-gray-50 font-medium text-gray-900"
                  />
                </div>
                
                {/* META INPUT */}
                <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-gray-200 pt-3 sm:pt-0 sm:pl-3">
                   {isEditingForecast || !currentForecast ? (
                    <div className="flex w-full sm:w-auto gap-2">
                        <input 
                        type="number" 
                        placeholder="Meta R$"
                        className="w-full sm:w-32 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold text-gray-900"
                        value={forecastAmount}
                        onChange={(e) => setForecastAmount(e.target.value)}
                        />
                        <button 
                        onClick={handleSaveForecast}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors whitespace-nowrap text-sm"
                        >
                        Definir Meta
                        </button>
                        {currentForecast && (
                            <button onClick={() => setIsEditingForecast(false)} className="text-gray-500 px-1 hover:text-gray-800"><X size={20}/></button>
                        )}
                    </div>
                    ) : (
                    <div className="flex items-center gap-2">
                        <div className="text-right">
                           <span className="text-[10px] text-gray-500 uppercase font-bold block">Meta do Mês</span>
                           <span className="text-lg font-bold text-gray-900 block leading-tight">{formatCurrency(currentForecast.totalAmount)}</span>
                        </div>
                        <button 
                        onClick={() => { setForecastAmount(currentForecast.totalAmount.toString()); setIsEditingForecast(true); }}
                        className="p-1.5 hover:bg-gray-100 rounded-md text-primary transition-colors"
                        title="Editar Meta"
                        >
                          <Pencil size={16} />
                        </button>
                    </div>
                    )}
                </div>
             </div>

             {/* ABATEMENT TOGGLE */}
             <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100 w-full lg:w-auto justify-between lg:justify-start">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-700">Abater Créditos?</span>
                    <span className="text-[10px] text-gray-500">Usar saldo anterior</span>
                </div>
                <button 
                  onClick={() => setAllowCreditAbatement(!allowCreditAbatement)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-2 ${
                    allowCreditAbatement ? 'bg-primary' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    allowCreditAbatement ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
             </div>
          </div>

          {currentForecast ? (
            <>
              {/* LIQUIDITY WARNING / ANALYSIS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Left: Expected Accounting */}
                 <Card className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Orçamento (Contábil)</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalExpectedInMonth)}</h3>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                <span>Realizado: {formatCurrency(totalRealizedInMonth)}</span>
                                <span className="text-gray-300">|</span>
                                <span>Falta: {formatCurrency(totalPendingInMonth)}</span>
                            </div>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            <Target size={24} />
                        </div>
                    </div>
                 </Card>

                 {/* Right: Real Liquidity */}
                 <Card className={`p-4 border-l-4 ${isLiquidityShortfall ? 'border-l-red-500 bg-red-50/30' : 'border-l-green-500 bg-green-50/30'}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Saldo Projetado no Caixa</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <h3 className={`text-2xl font-bold ${isLiquidityShortfall ? 'text-red-700' : 'text-green-700'}`}>
                                    {isLiquidityShortfall ? '-' : ''}{formatCurrency(liquidityGap)}
                                </h3>
                                {isLiquidityShortfall && (
                                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                                        Faltarão {formatCurrency(liquidityGap)}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {isLiquidityShortfall
                                  ? 'O caixa atual + entradas previstas não cobrem a meta.' 
                                  : 'O caixa cobre a meta, mesmo com abatimentos.'}
                            </p>
                        </div>
                        <div className={`p-2 rounded-lg ${isLiquidityShortfall ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            <Landmark size={24} />
                        </div>
                    </div>
                 </Card>
              </div>
              
              {allowCreditAbatement && totalCreditsUsed > 0 && (
                  <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm animate-in slide-in-from-top-2 ${isLiquidityShortfall ? 'bg-red-50 border-red-100 text-red-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
                     <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                     <div>
                        <span className="font-bold block mb-1">Impacto dos Créditos: {formatCurrency(totalCreditsUsed)}</span>
                        {isLiquidityShortfall ? (
                           <>
                             Você está permitindo o abatimento de <strong>{formatCurrency(totalCreditsUsed)}</strong> em créditos, mas o caixa não tem saldo suficiente para cobrir isso. 
                             <br/>Sugestão: <strong>Desative o abatimento</strong> para forçar a entrada de dinheiro novo.
                           </>
                        ) : (
                           <>
                             O abatimento de créditos está sendo coberto pelo <strong>Saldo em Caixa</strong> acumulado. O fluxo financeiro segue saudável.
                           </>
                        )}
                     </div>
                  </div>
              )}

              {/* Partners List */}
              <div className="grid grid-cols-1 gap-4">
                {forecastData.map((data) => {
                  const isExpanded = expandedPartners.has(data.partner.id);

                  return (
                    <Card key={data.partner.id} className="relative overflow-hidden group">
                      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 relative z-10">
                        
                        {/* Partner Info */}
                        <div className="flex items-center gap-4 w-full lg:w-1/4">
                          <button 
                             onClick={() => togglePartnerDetails(data.partner.id)}
                             className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-gray-600 border-2 border-white shadow-sm shrink-0 hover:bg-gray-200 transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                          </button>
                          <div>
                            <h3 className="font-bold text-gray-900">{data.partner.name}</h3>
                            <Badge variant="neutral">{data.percentage}% Cota</Badge>
                          </div>
                        </div>

                        {/* Financial Breakdown (Desktop) */}
                        <div className="hidden lg:flex flex-1 justify-around text-center px-4">
                           <div>
                              <span className="block text-[10px] text-gray-400 uppercase font-bold">Cota Contábil</span>
                              <span className="block font-medium text-gray-900">{formatCurrency(data.expectedAmount)}</span>
                           </div>
                           <div>
                              <span className="block text-[10px] text-gray-400 uppercase font-bold">Pago (Mês)</span>
                              <span className="block font-medium text-green-600">{formatCurrency(data.realizedAmount)}</span>
                           </div>
                           {allowCreditAbatement && (
                               <div>
                                  <span className="block text-[10px] text-gray-400 uppercase font-bold">Crédito Usado</span>
                                  <span className="block font-medium text-amber-600">-{formatCurrency(data.usedCredit)}</span>
                               </div>
                           )}
                        </div>

                        {/* Mobile View Breakdown */}
                        <div className="lg:hidden w-full flex justify-between text-xs bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <span>Meta: <strong>{formatCurrency(data.expectedAmount)}</strong></span>
                            <span>Pago: <strong className="text-green-600">{formatCurrency(data.realizedAmount)}</strong></span>
                            {allowCreditAbatement && <span>Crédito: <strong className="text-amber-600">-{formatCurrency(data.usedCredit)}</strong></span>}
                        </div>

                        {/* Action / Status */}
                        <div className="w-full lg:w-auto text-right min-w-[180px] flex justify-end">
                          {data.pending <= 0.01 ? (
                            <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-lg border border-green-100 w-full justify-center lg:w-auto">
                              <CheckCircle2 size={18} />
                              <span>Quitado</span>
                            </div>
                          ) : (
                            <div className="text-right w-full lg:w-auto flex items-center justify-between lg:block">
                               <div className="lg:mb-1">
                                  <div className="text-xs text-gray-500 uppercase font-bold lg:text-right text-left">
                                     {allowCreditAbatement && data.availableCredit > 0 ? 'A Pagar (Líquido)' : 'A Pagar'}
                                  </div>
                                  <div className="text-xl font-bold text-red-600 lg:text-right text-left">{formatCurrency(data.pending)}</div>
                               </div>
                               
                               <button 
                                  onClick={() => handleOpenContribution(data.partner.id, data.partner.name, data.pending)}
                                  className="bg-primary text-white px-3 py-2 rounded-lg hover:bg-slate-800 shadow-sm transition-colors flex items-center gap-2 ml-4"
                                  title="Registrar Aporte (Pagamento)"
                                 >
                                   <DollarSign size={16} />
                                   <span className="lg:hidden">Pagar</span>
                                 </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Transaction History (Expandable) */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-2">
                           <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                             <History size={14} />
                             Histórico de Transações ({selectedMonth})
                           </h4>
                           
                           {data.transactions.length === 0 ? (
                             <p className="text-sm text-gray-400 italic">Nenhuma transação registrada para este sócio neste mês.</p>
                           ) : (
                             <div className="space-y-2">
                               {data.transactions.map(t => {
                                 const isContribution = t.type === 'CONTRIBUTION';
                                 const isRefund = t.type === 'REFUND';
                                 const isExpense = t.type === 'EXPENSE';

                                 let icon = null;
                                 let textColor = '';
                                 let label = '';

                                 if (isContribution) {
                                   icon = <ArrowDownLeft size={16} />;
                                   textColor = 'text-green-600';
                                   label = 'Aporte';
                                 } else if (isRefund) {
                                   icon = <RefreshCcw size={16} />;
                                   textColor = 'text-red-600';
                                   label = 'Reembolso';
                                 } else {
                                   icon = <ArrowUpRight size={16} />;
                                   textColor = 'text-blue-600';
                                   label = 'Despesa Paga';
                                 }

                                 return (
                                   <div key={t.id} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-50">
                                      <div className="flex items-center gap-3">
                                         <div className={`p-1.5 rounded-md bg-gray-100 ${textColor}`}>
                                            {icon}
                                         </div>
                                         <div>
                                            <span className="font-bold text-gray-800 block">{label}</span>
                                            <span className="text-xs text-gray-400">{formatDate(t.date)} • {t.description}</span>
                                         </div>
                                      </div>
                                      <span className={`font-bold ${isRefund ? 'text-red-600' : 'text-green-600'}`}>
                                         {isRefund ? '-' : '+'}{formatCurrency(t.amount)}
                                      </span>
                                   </div>
                                 );
                               })}
                               
                               <div className="flex justify-between items-center text-sm p-2 pt-3 border-t border-gray-100 mt-2">
                                  <span className="font-bold text-gray-500">Total Realizado (Líquido)</span>
                                  <span className="font-bold text-gray-900">{formatCurrency(data.realizedAmount)}</span>
                               </div>
                             </div>
                           )}
                        </div>
                      )}

                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Target size={32} />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Planejamento não iniciado</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">Defina o valor total necessário para cobrir os custos da obra em <strong>{selectedMonth}</strong>.</p>
              <button 
                onClick={() => {
                  setForecastAmount('');
                  setIsEditingForecast(true); 
                }}
                className="bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-shadow shadow-lg shadow-primary/20"
              >
                Definir Meta Mensal
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: CREDITS */}
      {activeTab === 'CREDITS' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-blue-800">
             <AlertCircle className="shrink-0 mt-0.5" size={20} />
             <div>
               <p className="font-bold text-sm">Como funcionam os Créditos?</p>
               <p className="text-sm mt-1 opacity-90 leading-relaxed">
                 Créditos são gerados automaticamente quando um sócio paga despesas do próprio bolso ou aporta mais do que sua cota. 
                 Use esta tela apenas se você decidir devolver o dinheiro (Reembolso). Para usar créditos no pagamento mensal, use a opção <strong>"Abater Créditos"</strong> na aba de Previsão.
               </p>
             </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {creditPartners.length === 0 && (
               <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
                 <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <PiggyBank size={32} />
                 </div>
                 <h3 className="text-lg font-medium text-gray-900">Nenhum crédito pendente</h3>
                 <p className="text-gray-500">No momento, nenhum sócio possui saldo positivo acumulado para reembolso.</p>
               </div>
            )}

            {creditPartners.map((pb) => (
              <Card key={pb.partnerId} className="border-l-4 border-l-green-500 shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 bg-green-100 text-green-700 rounded-full flex items-center justify-center shrink-0">
                       <PiggyBank size={28} />
                     </div>
                     <div>
                       <h3 className="text-lg font-bold text-gray-900">{pb.partnerName}</h3>
                       <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1"><Wallet size={14}/> Pagou contas do bolso: {formatCurrency(pb.totalExpensesPaid)}</span>
                       </div>
                     </div>
                  </div>

                  <div className="text-center md:text-right bg-green-50/50 p-3 rounded-lg border border-green-100 md:border-0 md:bg-transparent">
                    <span className="block text-xs text-gray-500 uppercase font-bold tracking-wide">Saldo Disponível</span>
                    <span className="block text-2xl font-bold text-green-600">{formatCurrency(pb.balance)}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                     {/* Info Button */}
                    <div className="relative group/tooltip w-full sm:w-auto">
                        <button 
                          onClick={() => { setActiveTab('FORECAST'); setAllowCreditAbatement(true); }}
                          className="w-full px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center gap-2"
                        >
                          <TrendingUp size={16} />
                          Usar no Abatimento
                        </button>
                    </div>

                    <button 
                      onClick={() => handleOpenRefund(pb.partnerId, pb.balance)}
                      className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm shadow-green-200"
                    >
                      <ArrowDownLeft size={16} />
                      Realizar Reembolso
                    </button>
                  </div>

                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. Contribution Modal (Quick Action) */}
      {contributionModalOpen && selectedContributionPartner && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Registrar Aporte</h3>
                <button onClick={() => setContributionModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleProcessContribution} className="p-5 space-y-4">
                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                    <p className="text-gray-500">Sócio:</p>
                    <p className="font-bold text-gray-900">{selectedContributionPartner.name}</p>
                    <p className="text-gray-500 mt-2">Referência:</p>
                    <p className="font-bold text-gray-900 capitalize">{new Date(selectedMonth + '-02').toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                 </div>

                 <div className="space-y-1.5">
                   <label className="block text-xs font-bold text-gray-700 uppercase">Valor do Aporte</label>
                   <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        required
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg text-gray-900"
                        value={selectedContributionPartner.amount}
                        onChange={e => setSelectedContributionPartner(prev => prev ? {...prev, amount: parseFloat(e.target.value)} : null)}
                      />
                   </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Data do Pagamento</label>
                    <input 
                      type="date"
                      required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                      value={contributionDate}
                      onChange={e => setContributionDate(e.target.value)}
                    />
                 </div>

                 <button 
                   type="submit"
                   className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-slate-800 shadow-lg shadow-primary/20 mt-2"
                 >
                   Confirmar Pagamento
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* 2. Refund Modal */}
      {refundModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Registrar Reembolso</h3>
              <button onClick={() => setRefundModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleProcessRefund} className="p-5 space-y-4">
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 text-xs text-amber-800">
                Atenção: Esta ação retirará dinheiro do <strong>Caixa da Obra</strong> para pagar o sócio.
              </div>
              
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase">Valor a Reembolsar</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    max={creditPartners.find(p => p.partnerId === selectedRefundPartnerId)?.balance}
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg"
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                  />
                </div>
                <p className="text-xs text-gray-500 text-right">
                  Máximo: {formatCurrency(creditPartners.find(p => p.partnerId === selectedRefundPartnerId)?.balance || 0)}
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                 <button 
                   type="button" 
                   onClick={() => setRefundModalOpen(false)}
                   className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="submit"
                   className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-200"
                 >
                   Confirmar
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
