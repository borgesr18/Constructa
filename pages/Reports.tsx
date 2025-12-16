import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { formatCurrency, formatDate, TRANSLATIONS } from '../utils';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, CartesianGrid 
} from 'recharts';
import { Printer, BarChart3, UserCheck, FileSpreadsheet, ArrowRight } from 'lucide-react';

type ReportTab = 'GENERAL' | 'CATEGORIES' | 'PARTNER_STATEMENT' | 'EXPENSES_DETAILED';

export const Reports: React.FC = () => {
  const { project, transactions, partners } = useData();
  const [activeTab, setActiveTab] = useState<ReportTab>('EXPENSES_DETAILED');

  // Filters
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); // First day of current month
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]); // Last day of current month
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('ALL');

  // --- DATA PROCESSING ---

  // 1. Filter Transactions by Date
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = t.date;
      return tDate >= startDate && tDate <= endDate;
    });
  }, [transactions, startDate, endDate]);

  // 2. Aggregate for General View (Monthly Trend)
  const monthlyData = useMemo(() => {
    const groups: Record<string, { expenses: number, contributions: number }> = {};
    
    // Sort chronological
    const sorted = [...filteredTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach(t => {
      const monthKey = t.date.slice(0, 7); // YYYY-MM
      if (!groups[monthKey]) groups[monthKey] = { expenses: 0, contributions: 0 };
      
      if (t.type === 'EXPENSE') groups[monthKey].expenses += t.amount;
      if (t.type === 'CONTRIBUTION') groups[monthKey].contributions += t.amount;
    });

    return Object.entries(groups).map(([key, val]) => ({
      name: key, // YYYY-MM
      label: new Date(key + '-02').toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
      ...val
    }));
  }, [filteredTransactions]);

  // 3. Aggregate for Category View
  const categoryData = useMemo(() => {
    const groups: Record<string, number> = {};
    const stageGroups: Record<string, number> = {};

    filteredTransactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      // Category
      const cat = t.category || 'OTHER';
      groups[cat] = (groups[cat] || 0) + t.amount;

      // Stage
      const stage = t.stage || 'OTHER';
      stageGroups[stage] = (stageGroups[stage] || 0) + t.amount;
    });

    const categoryChart = Object.entries(groups)
      .map(([key, value]) => ({ name: TRANSLATIONS.CATEGORIES[key as any], value }))
      .sort((a, b) => b.value - a.value);

    const stageChart = Object.entries(stageGroups)
      .map(([key, value]) => ({ name: TRANSLATIONS.STAGES[key as any], value }))
      .sort((a, b) => b.value - a.value);

    return { categoryChart, stageChart };
  }, [filteredTransactions]);

  // 4. Aggregate for Partner Statement
  const partnerStatement = useMemo(() => {
    if (selectedPartnerId === 'ALL') return null;

    const partner = partners.find(p => p.id === selectedPartnerId);
    if (!partner) return null;

    const txs = filteredTransactions.filter(t => {
      if (t.type === 'CONTRIBUTION' && t.beneficiaryId === partner.id) return true;
      if (t.type === 'EXPENSE' && t.payerType === 'PARTNER' && t.payerId === partner.id) return true;
      if (t.type === 'REFUND' && t.beneficiaryId === partner.id) return true;
      return false;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalContributed = txs.filter(t => t.type === 'CONTRIBUTION').reduce((sum, t) => sum + t.amount, 0);
    const totalExpensesPaid = txs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
    const totalRefunds = txs.filter(t => t.type === 'REFUND').reduce((sum, t) => sum + t.amount, 0);
    
    // Total Credits Generated in Period
    const totalCredits = totalContributed + totalExpensesPaid;
    const invested = totalCredits - totalRefunds;

    return {
      partner,
      transactions: txs,
      summary: { totalContributed, totalExpensesPaid, totalRefunds, totalCredits, net: invested }
    };
  }, [filteredTransactions, selectedPartnerId, partners]);

  // 5. Aggregate for Expenses Detailed (Prestação de Contas)
  const detailedExpenses = useMemo(() => {
    const expenses = filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    
    const byCategory = expenses.reduce((acc, t) => {
        const cat = t.category || 'OTHER';
        acc[cat] = (acc[cat] || 0) + t.amount;
        return acc;
    }, {} as Record<string, number>);

    return { expenses, total, byCategory };
  }, [filteredTransactions]);

  const COLORS = ['#0f172a', '#0ea5e9', '#64748b', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios Gerenciais</h1>
          <p className="text-gray-500">Acompanhamento detalhado e prestação de contas</p>
        </div>
        <button 
          onClick={handlePrint}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Printer size={18} />
          Imprimir Relatório
        </button>
      </div>

      {/* FILTER BAR (Hidden on print) */}
      <Card className="print:hidden border-l-4 border-l-primary">
         <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
            <div className="w-full md:w-auto">
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Período (Início)</label>
               <input 
                 type="date" 
                 className="px-3 py-2 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-primary/20 outline-none bg-gray-50"
                 value={startDate}
                 onChange={e => setStartDate(e.target.value)}
               />
            </div>
            <div className="w-full md:w-auto">
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Período (Fim)</label>
               <input 
                 type="date" 
                 className="px-3 py-2 border border-gray-200 rounded-lg w-full focus:ring-2 focus:ring-primary/20 outline-none bg-gray-50"
                 value={endDate}
                 onChange={e => setEndDate(e.target.value)}
               />
            </div>
            
            <div className="flex-1"></div>

            <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
              <button 
                onClick={() => setActiveTab('EXPENSES_DETAILED')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 justify-center ${activeTab === 'EXPENSES_DETAILED' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <FileSpreadsheet size={16} />
                Prestação de Contas
              </button>
              <button 
                onClick={() => setActiveTab('GENERAL')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 justify-center ${activeTab === 'GENERAL' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <BarChart3 size={16} />
                Gráficos
              </button>
              <button 
                onClick={() => setActiveTab('CATEGORIES')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 justify-center ${activeTab === 'CATEGORIES' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <PieChart size={16} />
                Categorias
              </button>
              <button 
                onClick={() => setActiveTab('PARTNER_STATEMENT')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 justify-center ${activeTab === 'PARTNER_STATEMENT' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <UserCheck size={16} />
                Extrato Sócio
              </button>
            </div>
         </div>
      </Card>

      {/* PRINT HEADER ONLY */}
      <div className="hidden print:block mb-8 border-b-2 border-gray-900 pb-4">
         <div className="flex justify-between items-start">
            <div>
               <h1 className="text-3xl font-black uppercase tracking-tight">{project.name}</h1>
               <p className="text-gray-500">{project.address}</p>
            </div>
            <div className="text-right">
                <div className="text-sm font-bold text-gray-400 uppercase">Relatório Gerencial</div>
                <div className="text-lg font-bold text-gray-900">
                    {activeTab === 'EXPENSES_DETAILED' ? 'Prestação de Contas Detalhada' : 
                     activeTab === 'GENERAL' ? 'Visão Geral' : 
                     activeTab === 'CATEGORIES' ? 'Custos por Categoria' : 'Extrato de Sócio'}
                </div>
                <div className="text-sm text-gray-600 mt-1">Ref: {formatDate(startDate)} a {formatDate(endDate)}</div>
            </div>
         </div>
      </div>

      {/* --- REPORT CONTENT --- */}

      {/* 0. PRESTAÇÃO DE CONTAS (NOVO) */}
      {activeTab === 'EXPENSES_DETAILED' && (
        <div className="space-y-8 animate-in fade-in">
           
           {/* Summary Header */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900 text-white rounded-xl print:border print:border-gray-200 print:bg-gray-50 print:text-gray-900">
                 <p className="text-xs font-bold opacity-70 uppercase mb-1">Total Gasto (Período)</p>
                 <p className="text-2xl font-bold">{formatCurrency(detailedExpenses.total)}</p>
              </div>
              <div className="p-4 bg-white border border-gray-200 rounded-xl">
                 <p className="text-xs font-bold text-gray-500 uppercase mb-1">Materiais</p>
                 <p className="text-lg font-bold text-gray-900">{formatCurrency(detailedExpenses.byCategory['MATERIAL'] || 0)}</p>
              </div>
              <div className="p-4 bg-white border border-gray-200 rounded-xl">
                 <p className="text-xs font-bold text-gray-500 uppercase mb-1">Mão de Obra</p>
                 <p className="text-lg font-bold text-gray-900">{formatCurrency(detailedExpenses.byCategory['LABOR'] || 0)}</p>
              </div>
              <div className="p-4 bg-white border border-gray-200 rounded-xl">
                 <p className="text-xs font-bold text-gray-500 uppercase mb-1">Outros/Admin</p>
                 <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(
                        (detailedExpenses.byCategory['EQUIPMENT'] || 0) + 
                        (detailedExpenses.byCategory['ADMIN'] || 0) + 
                        (detailedExpenses.byCategory['OTHER'] || 0)
                    )}
                 </p>
              </div>
           </div>

           {/* Detailed Table */}
           <Card className="overflow-hidden print:shadow-none print:border-none print:p-0">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center print:bg-white print:px-0">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                     <FileSpreadsheet size={18} className="text-primary"/>
                     Detalhamento de Gastos
                  </h3>
                  <span className="text-xs text-gray-500 print:hidden">{detailedExpenses.expenses.length} registros encontrados</span>
              </div>
              
              {detailedExpenses.expenses.length === 0 ? (
                 <div className="p-12 text-center text-gray-400">Nenhuma despesa registrada neste período.</div>
              ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100 text-gray-600 font-bold uppercase text-xs print:bg-gray-200 print:text-black">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap">Data</th>
                            <th className="px-4 py-3">Descrição / Fornecedor</th>
                            <th className="px-4 py-3">Categoria / Etapa</th>
                            <th className="px-4 py-3">Origem</th>
                            <th className="px-4 py-3 text-right">Valor</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                        {detailedExpenses.expenses.map((t, idx) => {
                            const isOdd = idx % 2 !== 0;
                            const partnerName = t.payerType === 'PARTNER' 
                                ? partners.find(p => p.id === t.payerId)?.name?.split(' ')[0] 
                                : null;

                            return (
                                <tr key={t.id} className={`${isOdd ? 'bg-gray-50/50 print:bg-gray-50' : 'bg-white'} hover:bg-blue-50/30 break-inside-avoid`}>
                                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-600">{formatDate(t.date)}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-gray-900">{t.description}</div>
                                        {t.supplier && <div className="text-xs text-gray-500 flex items-center gap-1"><ArrowRight size={10}/> {t.supplier}</div>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 w-fit print:border print:border-gray-300">
                                                {TRANSLATIONS.CATEGORIES[t.category || 'OTHER']}
                                            </span>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                                                {TRANSLATIONS.STAGES[t.stage || 'OTHER']}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {t.payerType === 'BOX' ? (
                                            <span className="flex items-center gap-1 text-xs"><div className="w-2 h-2 bg-slate-400 rounded-full"></div> Caixa</span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs text-orange-600 font-medium"><div className="w-2 h-2 bg-orange-400 rounded-full"></div> {partnerName}</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                                        {formatCurrency(t.amount)}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                        <tfoot className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300 print:bg-gray-200">
                           <tr>
                              <td colSpan={4} className="px-4 py-3 text-right uppercase text-xs tracking-wider">Total do Período</td>
                              <td className="px-4 py-3 text-right text-base">{formatCurrency(detailedExpenses.total)}</td>
                           </tr>
                        </tfoot>
                    </table>
                </div>
              )}
           </Card>

           <div className="hidden print:block text-center mt-12 pt-4 border-t border-gray-300 text-xs text-gray-500">
              <p>Relatório gerado em {new Date().toLocaleString('pt-BR')} pelo sistema Constructa.</p>
           </div>
        </div>
      )}

      {/* 1. GENERAL REPORT */}
      {activeTab === 'GENERAL' && (
        <div className="space-y-6 animate-in fade-in">
           {/* Summary Cards */}
           <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm print:border-gray-900">
                 <p className="text-xs font-bold text-gray-500 uppercase">Total Despesas (Período)</p>
                 <p className="text-2xl font-bold text-red-600 mt-1">
                   {formatCurrency(filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0))}
                 </p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm print:border-gray-900">
                 <p className="text-xs font-bold text-gray-500 uppercase">Total Aportes (Período)</p>
                 <p className="text-2xl font-bold text-green-600 mt-1">
                   {formatCurrency(filteredTransactions.filter(t => t.type === 'CONTRIBUTION').reduce((acc, t) => acc + t.amount, 0))}
                 </p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm print:border-gray-900">
                 <p className="text-xs font-bold text-gray-500 uppercase">Balanço do Período</p>
                 <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(
                      filteredTransactions.filter(t => t.type === 'CONTRIBUTION').reduce((acc, t) => acc + t.amount, 0) -
                      filteredTransactions.filter(t => t.type !== 'CONTRIBUTION').reduce((acc, t) => acc + t.amount, 0)
                    )}
                 </p>
              </div>
           </div>

           {/* Chart */}
           <Card className="print:break-inside-avoid">
             <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
               <BarChart3 size={20} className="text-primary"/>
               Evolução Financeira
             </h3>
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="contributions" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={60} />
                    <Bar dataKey="expenses" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </Card>
        </div>
      )}

      {/* 2. CATEGORY REPORT */}
      {activeTab === 'CATEGORIES' && (
        <div className="space-y-6 animate-in fade-in">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
             <Card>
                <h3 className="font-bold text-gray-900 mb-4 text-center">Despesas por Categoria</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie 
                         data={categoryData.categoryChart} 
                         cx="50%" cy="50%" 
                         outerRadius={80} 
                         dataKey="value"
                         label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                       >
                          {categoryData.categoryChart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                       </Pie>
                       <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                   {categoryData.categoryChart.map((entry, index) => (
                     <div key={index} className="flex justify-between items-center text-sm border-b border-gray-50 pb-1">
                        <div className="flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                           <span>{entry.name}</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(entry.value)}</span>
                     </div>
                   ))}
                </div>
             </Card>

             <Card>
                <h3 className="font-bold text-gray-900 mb-4 text-center">Despesas por Etapa</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie 
                         data={categoryData.stageChart} 
                         cx="50%" cy="50%" 
                         outerRadius={80} 
                         dataKey="value"
                         label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                       >
                          {categoryData.stageChart.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                          ))}
                       </Pie>
                       <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                   {categoryData.stageChart.map((entry, index) => (
                     <div key={index} className="flex justify-between items-center text-sm border-b border-gray-50 pb-1">
                        <div className="flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }}></div>
                           <span>{entry.name}</span>
                        </div>
                        <span className="font-semibold">{formatCurrency(entry.value)}</span>
                     </div>
                   ))}
                </div>
             </Card>
           </div>
        </div>
      )}

      {/* 3. PARTNER STATEMENT */}
      {activeTab === 'PARTNER_STATEMENT' && (
        <div className="space-y-6 animate-in fade-in">
           {/* Partner Selector */}
           <div className="print:hidden mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selecione o Sócio</label>
              <div className="relative max-w-md">
                 <select 
                   className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                   value={selectedPartnerId}
                   onChange={(e) => setSelectedPartnerId(e.target.value)}
                 >
                    <option value="ALL">Selecione...</option>
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                 </select>
               </div>
           </div>

           {!partnerStatement ? (
             <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed text-gray-400">
               <UserCheck className="mx-auto mb-2 opacity-50" size={32} />
               <p>Selecione um sócio para visualizar o extrato.</p>
             </div>
           ) : (
             <div className="space-y-6">
                {/* Header Card */}
                <Card className="bg-slate-900 text-white border-none">
                   <div className="flex justify-between items-start">
                      <div>
                         <h2 className="text-2xl font-bold">{partnerStatement.partner.name}</h2>
                         <p className="text-slate-400 text-sm">Extrato Consolidado ({formatDate(startDate)} - {formatDate(endDate)})</p>
                      </div>
                      <div className="text-right">
                         <p className="text-xs uppercase text-slate-400 font-bold">Investimento Líquido (Período)</p>
                         <p className="text-3xl font-bold text-emerald-400">{formatCurrency(partnerStatement.summary.net)}</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-700/50">
                      <div>
                         <p className="text-xs text-slate-400">Aportes em Dinheiro</p>
                         <p className="font-bold text-lg">{formatCurrency(partnerStatement.summary.totalContributed)}</p>
                      </div>
                      <div>
                         <p className="text-xs text-slate-400">Despesas Pagas (Direto)</p>
                         <p className="font-bold text-lg">{formatCurrency(partnerStatement.summary.totalExpensesPaid)}</p>
                      </div>
                      <div>
                         <p className="text-xs text-slate-400">Reembolsos Recebidos</p>
                         <p className="font-bold text-lg text-red-400">-{formatCurrency(partnerStatement.summary.totalRefunds)}</p>
                      </div>
                   </div>
                </Card>

                {/* Transaction List */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                   <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800">Detalhamento das Movimentações</h3>
                      <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                        {partnerStatement.transactions.length} Lançamentos
                      </span>
                   </div>
                   
                   {partnerStatement.transactions.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">Nenhuma movimentação neste período.</div>
                   ) : (
                     <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                           <tr>
                              <th className="px-6 py-3">Data</th>
                              <th className="px-6 py-3">Descrição</th>
                              <th className="px-6 py-3">Tipo</th>
                              <th className="px-6 py-3 text-right">Valor</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                           {partnerStatement.transactions.map(t => {
                             const isExpense = t.type === 'EXPENSE';
                             const isContribution = t.type === 'CONTRIBUTION';
                             const isRefund = t.type === 'REFUND';

                             return (
                               <tr key={t.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-3 whitespace-nowrap text-gray-600">{formatDate(t.date)}</td>
                                  <td className="px-6 py-3 text-gray-900 font-medium">
                                    {t.description}
                                    {t.category && <span className="ml-2 text-[10px] text-gray-400 border border-gray-200 px-1 rounded">{TRANSLATIONS.CATEGORIES[t.category]}</span>}
                                  </td>
                                  <td className="px-6 py-3">
                                     {isContribution && <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-0.5 rounded">Aporte</span>}
                                     {isExpense && <span className="text-blue-600 font-bold text-xs bg-blue-50 px-2 py-0.5 rounded">Despesa Paga</span>}
                                     {isRefund && <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-0.5 rounded">Reembolso</span>}
                                  </td>
                                  <td className={`px-6 py-3 text-right font-bold ${isRefund ? 'text-red-600' : 'text-green-600'}`}>
                                     {isRefund ? '-' : '+'}{formatCurrency(t.amount)}
                                  </td>
                               </tr>
                             );
                           })}
                        </tbody>
                     </table>
                   )}
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};