
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { User, DollarSign, Receipt, ArrowDownCircle, Pencil, X, Save, Plus, Trash2, Phone, Image } from 'lucide-react';
import { Partner } from '../types';

export const Partners: React.FC = () => {
  const { partners, financials, project, updatePartner, addPartner, deletePartner } = useData();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  
  // Form State
  const initialFormState = {
    name: '',
    email: '',
    phone: '',
    avatarUrl: '',
    percentage: '',
    fixedValue: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const pieData = partners.map(p => ({
    name: p.name,
    value: p.percentage || 0
  }));

  const COLORS = ['#0f172a', '#0ea5e9', '#64748b', '#22c55e', '#f59e0b', '#ef4444'];

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      email: partner.email,
      phone: partner.phone || '',
      avatarUrl: partner.avatarUrl || '',
      percentage: partner.percentage?.toString() || '',
      fixedValue: partner.fixedValue?.toString() || ''
    });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingPartner(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este sócio? Os históricos de transações permanecerão, mas isso pode afetar o cálculo de rateio futuro.')) {
      deletePartner(id);
      setIsModalOpen(false);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setEditingPartner(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      projectId: project.id,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      avatarUrl: formData.avatarUrl,
      percentage: formData.percentage ? parseFloat(formData.percentage) : 0,
      fixedValue: formData.fixedValue ? parseFloat(formData.fixedValue) : 0,
    };

    if (editingPartner) {
      updatePartner(editingPartner.id, payload);
    } else {
      addPartner(payload);
    }

    handleClose();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Sócios & Rateio</h1>
        <button 
          onClick={handleCreate}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Novo Sócio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Distribution Chart */}
        <Card className="md:col-span-1 flex flex-col">
          <h3 className="font-semibold text-gray-900 mb-4">Divisão da Obra</h3>
          <div className="w-full h-[200px] min-w-0 flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   formatter={(value: number) => `${value}%`}
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {partners.map((p, idx) => (
              <div key={p.id} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                  <span className="text-gray-600 truncate max-w-[150px]">{p.name}</span>
                </div>
                <span className="font-medium">{p.percentage}%</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Detailed List */}
        <div className="md:col-span-2 space-y-4">
           {partners.map(partner => {
             const pb = financials.partnerBalances[partner.id];
             const balance = pb?.balance || 0;
             const isCredit = balance >= 0;

             return (
               <Card key={partner.id} className="relative overflow-hidden group hover:border-blue-200 transition-colors">
                 <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                   <User size={120} />
                 </div>
                 
                 <div className="relative z-10">
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                     <div className="flex items-center gap-3">
                        {partner.avatarUrl ? (
                          <img src={partner.avatarUrl} alt={partner.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-gray-600 border-2 border-white shadow-sm">
                            {partner.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-gray-900">{partner.name}</h3>
                            <button 
                              onClick={() => handleEdit(partner)}
                              className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                              title="Editar sócio"
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 text-sm text-gray-500">
                             <span>{partner.email}</span>
                             {partner.phone && (
                               <span className="hidden sm:inline">• {partner.phone}</span>
                             )}
                          </div>
                        </div>
                     </div>
                     <Badge variant={isCredit ? 'success' : 'danger'}>
                        {isCredit ? 'CRÉDITO' : 'DEVEDOR'}
                     </Badge>
                   </div>

                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                     <div className="p-2.5 bg-gray-50 rounded-lg">
                       <span className="text-xs text-gray-500 flex items-center gap-1 mb-1"><ArrowDownCircle size={12}/> Aportes</span>
                       <span className="font-semibold block text-gray-900 text-sm sm:text-base">{formatCurrency(pb?.totalContributed || 0)}</span>
                     </div>
                     <div className="p-2.5 bg-gray-50 rounded-lg">
                       <span className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Receipt size={12}/> Pagou Contas</span>
                       <span className="font-semibold block text-gray-900 text-sm sm:text-base">{formatCurrency(pb?.totalExpensesPaid || 0)}</span>
                     </div>
                     <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100">
                       <span className="text-xs text-blue-600 font-medium mb-1 block">Deveria ({project.distributionType === 'PERCENTAGE' ? `${partner.percentage}%` : 'Fixo'})</span>
                       <span className="font-semibold block text-blue-900 text-sm sm:text-base">{formatCurrency(pb?.fairShare || 0)}</span>
                     </div>
                     <div className={`p-2.5 rounded-lg border ${isCredit ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                       <span className={`text-xs font-medium ${isCredit ? 'text-green-600' : 'text-red-600'} mb-1 block`}>Saldo Final</span>
                       <span className={`font-bold block ${isCredit ? 'text-green-800' : 'text-red-800'} text-sm sm:text-base`}>
                         {balance > 0 ? '+' : ''}{formatCurrency(balance)}
                       </span>
                     </div>
                   </div>
                 </div>
               </Card>
             );
           })}
        </div>
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 transition-all overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-900">{editingPartner ? 'Editar Sócio' : 'Novo Sócio'}</h2>
              <button 
                onClick={handleClose} 
                className="text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Nome <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
                  placeholder="Ex: João da Silva"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Email <span className="text-red-500">*</span></label>
                  <input 
                    type="email" 
                    required
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    value={formData.email}
                    onChange={e => setFormData(prev => ({...prev, email: e.target.value}))}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Telefone</label>
                  <input 
                    type="tel" 
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({...prev, phone: e.target.value}))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

               <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">URL da Foto (Avatar)</label>
                  <div className="relative">
                    <Image className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="url" 
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      value={formData.avatarUrl}
                      onChange={e => setFormData(prev => ({...prev, avatarUrl: e.target.value}))}
                      placeholder="https://..."
                    />
                  </div>
                </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Percentual (%)</label>
                  <div className="relative">
                     <input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none font-semibold text-gray-900"
                      value={formData.percentage}
                      onChange={e => setFormData(prev => ({...prev, percentage: e.target.value}))}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Valor Fixo (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    value={formData.fixedValue}
                    onChange={e => setFormData(prev => ({...prev, fixedValue: e.target.value}))}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between gap-3">
                 {editingPartner && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingPartner.id)}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                    </button>
                 )}
                 <div className="flex gap-3 flex-1 justify-end">
                    <button 
                      type="button" 
                      onClick={handleClose}
                      className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit" 
                      className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-slate-800 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      Salvar
                    </button>
                 </div>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
