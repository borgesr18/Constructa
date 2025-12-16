import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Save, AlertTriangle, Building, Wallet, CheckCircle, Trash2, Info, LogOut, Cloud, Download } from 'lucide-react';
import { Project } from '../types';

export const Settings: React.FC = () => {
  const { project, updateProject, clearTransactions } = useData();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<Project | null>(project);
  const [isSaved, setIsSaved] = useState(false);
  const [installable, setInstallable] = useState(false);

  // Sync state if project changes externally
  useEffect(() => {
    setFormData(project);
    
    // Check if install prompt is available
    if ((window as any).deferredPrompt) {
      setInstallable(true);
    }
  }, [project]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) return;
    
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      (window as any).deferredPrompt = null;
      setInstallable(false);
    }
  };

  if (!formData) return null;

  const handleChange = (field: keyof Project, value: any) => {
    setFormData(prev => prev ? ({ ...prev, [field]: value }) : null);
    setIsSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(formData) {
        updateProject(formData);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleClearFinancials = () => {
    if (confirm('ATENÇÃO: Isso apagará TODAS as transações e previsões financeiras deste projeto.\n\nSócios e fornecedores serão MANTIDOS.\n\nDeseja continuar?')) {
      clearTransactions();
      alert('Histórico financeiro limpo com sucesso.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Configurações da Obra</h1>
        <button 
           onClick={handleLogout}
           className="text-red-600 font-medium hover:bg-red-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
            <LogOut size={18} />
            Sair da Conta
        </button>
      </div>
      
      {/* Install App Banner (Only visible if installable) */}
      {installable && (
        <div className="bg-primary text-white p-4 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-4">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                 <Download size={24} />
              </div>
              <div>
                 <h3 className="font-bold text-lg">Instalar Aplicativo</h3>
                 <p className="text-sm text-slate-300">Instale o Constructa no seu dispositivo para acesso rápido.</p>
              </div>
           </div>
           <button 
             onClick={handleInstallClick}
             className="bg-white text-primary px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition-colors"
           >
             Instalar Agora
           </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* User Info */}
        <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                {user?.email?.charAt(0).toUpperCase()}
            </span>
            <span>Logado como <strong>{user?.email}</strong></span>
            <span className="ml-auto flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full">
                <Cloud size={12} />
                Online
            </span>
        </div>

        {/* Project Info Section */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
              <Building size={16} />
            </span>
            Dados Gerais
          </h2>
          <Card className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Nome da Obra</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Status</label>
                <select 
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none"
                >
                  <option value="ACTIVE">Em Andamento</option>
                  <option value="PAUSED">Pausada</option>
                  <option value="COMPLETED">Concluída</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Endereço Completo</label>
              <input 
                type="text" 
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            
            <div className="pt-2">
               <label className="block text-sm font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Data de Início</label>
               <input 
                 type="date"
                 value={formData.startDate}
                 onChange={(e) => handleChange('startDate', e.target.value)}
                 className="w-full md:w-auto px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
               />
            </div>
          </Card>
        </section>

        {/* Financial Logic Section */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Wallet size={16} />
            </span>
            Motor Financeiro
          </h2>
          <Card className="space-y-6">
            <div>
               <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Modelo de Rateio de Custos</label>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <label className={`
                    border p-4 rounded-xl cursor-pointer transition-all hover:bg-gray-50 flex flex-col gap-2
                    ${formData.distributionType === 'PERCENTAGE' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/20' : 'border-gray-200'}
                 `}>
                    <div className="flex items-center gap-2">
                       <input 
                         type="radio" 
                         name="distributionType"
                         value="PERCENTAGE"
                         checked={formData.distributionType === 'PERCENTAGE'}
                         onChange={() => handleChange('distributionType', 'PERCENTAGE')}
                         className="text-blue-600 focus:ring-blue-500"
                       />
                       <span className="font-bold text-gray-900">Porcentagem (%)</span>
                    </div>
                    <p className="text-sm text-gray-500 pl-6">
                       Cada sócio paga uma % fixa sobre o total das despesas. Ideal para sociedades com cotas definidas.
                    </p>
                 </label>

                 <label className={`
                    border p-4 rounded-xl cursor-pointer transition-all hover:bg-gray-50 flex flex-col gap-2
                    ${formData.distributionType === 'FIXED' ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/20' : 'border-gray-200'}
                 `}>
                    <div className="flex items-center gap-2">
                       <input 
                         type="radio" 
                         name="distributionType"
                         value="FIXED"
                         checked={formData.distributionType === 'FIXED'}
                         onChange={() => handleChange('distributionType', 'FIXED')}
                         className="text-blue-600 focus:ring-blue-500"
                       />
                       <span className="font-bold text-gray-900">Valor Fixo (Cota)</span>
                    </div>
                    <p className="text-sm text-gray-500 pl-6">
                       Sócios têm um valor alvo fixo para pagar, independente do custo total da obra.
                    </p>
                 </label>
               </div>
            </div>
          </Card>
        </section>

        {/* Submit Button with Feedback */}
        <div className="flex justify-end pt-4 sticky bottom-4 md:static z-10">
           <button 
             type="submit" 
             disabled={isSaved}
             className={`
               px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg 
               ${isSaved 
                 ? 'bg-green-600 text-white shadow-green-900/20 cursor-default scale-105' 
                 : 'bg-primary text-white hover:bg-slate-800 shadow-primary/20 hover:-translate-y-0.5'}
             `}
           >
             {isSaved ? <CheckCircle size={20} className="animate-bounce" /> : <Save size={20} />}
             {isSaved ? 'Salvo com Sucesso!' : 'Salvar Configurações'}
           </button>
        </div>
      </form>

      {/* Danger Zone */}
      <section className="pt-8 border-t border-gray-200 mt-8">
         <h2 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={20} />
            Zona de Perigo
         </h2>
         <Card className="border-l-4 border-l-red-500 bg-red-50/30 space-y-4">
            {/* Clear Financials */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 pb-4">
               <div>
                  <h3 className="font-bold text-gray-900">Limpar Histórico Financeiro</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Apaga todas as transações, previsões e recibos <strong>deste projeto</strong>. <br/>
                    <strong>Mantém</strong> sócios e fornecedores.
                  </p>
               </div>
               <button 
                 type="button"
                 onClick={handleClearFinancials}
                 className="w-full md:w-auto px-6 py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
               >
                 <Trash2 size={18} />
                 Resetar Transações
               </button>
            </div>
         </Card>
      </section>
    </div>
  );
};