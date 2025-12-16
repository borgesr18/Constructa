import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { formatCurrency, formatDateFull } from '../utils';
import { Supplier, Transaction } from '../types';
import { Printer, ChevronDown, FileText, Search } from 'lucide-react';
import { Card } from '../components/ui/Card';

export const Receipts: React.FC = () => {
  const { project, suppliers, transactions } = useData();
  
  // State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [city, setCity] = useState<string>('Recife');
  const [linkTransactionId, setLinkTransactionId] = useState<string>('');

  // Derived
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Filter expenses for selected supplier
  const supplierExpenses = selectedSupplierId 
    ? transactions
        .filter(t => t.type === 'EXPENSE' && t.supplier === selectedSupplier?.name)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5) // Show last 5
    : [];

  const handleTransactionSelect = (tId: string) => {
    setLinkTransactionId(tId);
    const t = transactions.find(tr => tr.id === tId);
    if (t) {
      setAmount(t.amount.toString());
      setDate(t.date);
      setDescription(t.description);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emissor de Recibos</h1>
          <p className="text-gray-500">Gere recibos de pagamento para prestadores de serviço</p>
        </div>
        <button 
          onClick={handlePrint}
          className="bg-primary text-white px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Printer size={18} />
          Imprimir Recibo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM (Hidden on print) */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
          <Card className="space-y-5">
             <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Fornecedor / Prestador</label>
                <div className="relative">
                  <select
                    className="w-full pl-3 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none"
                    value={selectedSupplierId}
                    onChange={(e) => {
                        setSelectedSupplierId(e.target.value);
                        setLinkTransactionId(''); // Reset linked transaction
                    }}
                  >
                    <option value="">Selecione...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>
                {!selectedSupplierId && (
                  <p className="text-xs text-amber-600 mt-2">
                    Selecione um fornecedor para começar.
                  </p>
                )}
             </div>

             {/* Link Transaction (Smart Feature) */}
             {selectedSupplierId && (
               <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <label className="flex items-center gap-2 text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">
                    <Search size={14} />
                    Buscar Lançamento Existente
                  </label>
                  {supplierExpenses.length > 0 ? (
                    <div className="space-y-2">
                      {supplierExpenses.map(t => (
                        <button
                          key={t.id}
                          onClick={() => handleTransactionSelect(t.id)}
                          className={`w-full text-left p-2 rounded text-xs border transition-colors ${
                            linkTransactionId === t.id 
                              ? 'bg-blue-600 text-white border-blue-600' 
                              : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex justify-between font-bold">
                            <span>{formatCurrency(t.amount)}</span>
                            <span>{t.date.split('-').reverse().join('/')}</span>
                          </div>
                          <div className="truncate opacity-80">{t.description}</div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-blue-400">Nenhum lançamento recente encontrado para este fornecedor.</p>
                  )}
               </div>
             )}

             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Valor (R$)</label>
               <input 
                  type="number" 
                  step="0.01"
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-bold text-lg"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
               />
             </div>

             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Data do Pagamento</label>
               <input 
                  type="date" 
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
               />
             </div>

             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Referente a (Descrição)</label>
               <textarea 
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Serviços de instalação elétrica..."
               />
             </div>

             <div>
               <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Cidade</label>
               <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
               />
             </div>
          </Card>
        </div>

        {/* PREVIEW (Visible on print) */}
        <div className="lg:col-span-2">
           <div className="bg-white p-8 sm:p-12 shadow-lg border border-gray-200 min-h-[600px] print:fixed print:top-0 print:left-0 print:w-screen print:h-screen print:z-[9999] print:bg-white print:border-none print:shadow-none">
              
              {/* Receipt Header */}
              <div className="border-b-2 border-gray-900 pb-4 mb-8 flex justify-between items-end">
                <div>
                   <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Recibo</h2>
                   <p className="text-sm text-gray-500 mt-1">Comprovante de Pagamento</p>
                </div>
                <div className="text-right">
                   <div className="text-sm font-bold text-gray-400 uppercase">Valor</div>
                   <div className="text-3xl font-mono font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded">
                     {amount ? formatCurrency(parseFloat(amount)) : 'R$ 0,00'}
                   </div>
                </div>
              </div>

              {/* Receipt Body */}
              <div className="space-y-8 text-xl leading-relaxed text-gray-800 font-serif">
                <p>
                  <strong>RECEBI(EMOS)</strong> de <span className="uppercase font-bold underline decoration-dotted underline-offset-4">{project.name}</span>, 
                  situado em {project.address}, a importância de <span className="font-bold">{amount ? formatCurrency(parseFloat(amount)) : '___'}</span>.
                </p>

                <p>
                  Referente a: <br/>
                  <span className="block mt-2 p-4 bg-gray-50 border border-gray-200 border-dashed rounded italic min-h-[80px]">
                    {description || '(Descreva o serviço realizado...)'}
                  </span>
                </p>

                <p>
                  Para maior clareza firmo(amos) o presente recibo para que produza os seus efeitos, dando plena, rasa e geral quitação.
                </p>
              </div>

              {/* Date and Location */}
              <div className="mt-12 text-right text-gray-600">
                 {city}, {formatDateFull(date)}.
              </div>

              {/* Signatures */}
              <div className="mt-24 grid grid-cols-2 gap-12">
                 <div className="text-center">
                    <div className="border-t border-gray-900 pt-2 w-full mx-auto"></div>
                    <p className="font-bold text-gray-900">{selectedSupplier?.name || 'Nome do Prestador'}</p>
                    <p className="text-sm text-gray-500">{selectedSupplier?.document || 'CPF/CNPJ'}</p>
                    <p className="text-xs text-gray-400 mt-1 uppercase">Assinatura do Prestador</p>
                 </div>

                 <div className="text-center">
                    <div className="border-t border-gray-900 pt-2 w-full mx-auto"></div>
                    <p className="font-bold text-gray-900">{project.name}</p>
                    <p className="text-xs text-gray-400 mt-1 uppercase">Assinatura do Pagador</p>
                 </div>
              </div>

              {/* Footer */}
              <div className="mt-auto pt-8 text-center">
                 <p className="text-[10px] text-gray-300 uppercase tracking-widest">
                   Gerado automaticamente por Constructa - Sistema de Gestão
                 </p>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
};