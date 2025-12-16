import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { useData } from '../context/DataContext';
import { TRANSLATIONS } from '../utils';
import { Supplier, ExpenseCategory } from '../types';
import { Plus, Trash2, Pencil, Truck, Phone, Tag, Save, X, FileBadge, Loader2, AlertCircle } from 'lucide-react';

export const Suppliers: React.FC = () => {
  const { project, suppliers, addSupplier, updateSupplier, deleteSupplier } = useData();
  
  // Modal State for Suppliers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  // UI State
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const initialFormState = {
    name: '',
    contact: '',
    document: '',
    defaultCategory: 'MATERIAL' as ExpenseCategory
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleCreate = () => {
    setEditingSupplier(null);
    setFormData(initialFormState);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact: supplier.contact || '',
      document: supplier.document || '',
      defaultCategory: supplier.defaultCategory || 'MATERIAL'
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Deseja remover este fornecedor da lista?')) {
      deleteSupplier(id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');

    try {
      // Treat empty string as NULL to avoid DB constraint issues
      const cleanedDocument = formData.document.trim() === '' ? undefined : formData.document.trim();

      const payload = {
        projectId: project.id,
        name: formData.name,
        contact: formData.contact,
        document: cleanedDocument,
        defaultCategory: formData.defaultCategory
      };

      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, payload);
      } else {
        await addSupplier(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Ocorreu um erro ao salvar o fornecedor. Verifique os dados e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Fornecedores</h1>
        <button 
          onClick={handleCreate}
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus size={18} />
          Novo Fornecedor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.length === 0 && (
           <div className="col-span-full py-16 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400">
             <Truck className="mx-auto mb-2 opacity-50" size={32} />
             <p>Nenhum fornecedor cadastrado.</p>
             <button onClick={handleCreate} className="text-primary font-medium mt-2 hover:underline">Cadastrar o primeiro</button>
           </div>
        )}

        {suppliers.map(supplier => (
          <Card key={supplier.id} className="group hover:border-blue-200 transition-colors p-4">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Truck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{supplier.name}</h3>
                  {supplier.document && (
                     <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                       <FileBadge size={12} />
                       {supplier.document}
                     </div>
                  )}
                  {supplier.contact && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                      <Phone size={12} />
                      {supplier.contact}
                    </div>
                  )}
                  {supplier.defaultCategory && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                      <Tag size={12} />
                      {TRANSLATIONS.CATEGORIES[supplier.defaultCategory]}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleEdit(supplier)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Pencil size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(supplier.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 transition-all">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start gap-2">
                   <AlertCircle size={16} className="mt-0.5 shrink-0"/>
                   <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Nome da Empresa/Pessoa <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
                  placeholder="Ex: Armazém Silva"
                />
              </div>

               <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">CPF / CNPJ</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={formData.document}
                  onChange={e => setFormData(prev => ({...prev, document: e.target.value}))}
                  placeholder="Ex: 000.000.000-00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Contato (Tel/Email)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  value={formData.contact}
                  onChange={e => setFormData(prev => ({...prev, contact: e.target.value}))}
                  placeholder="Ex: (81) 9999-9999"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Categoria Padrão</label>
                <select
                   className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                   value={formData.defaultCategory}
                   onChange={(e) => setFormData(prev => ({...prev, defaultCategory: e.target.value as ExpenseCategory}))}
                >
                  {Object.entries(TRANSLATIONS.CATEGORIES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                 <button 
                   type="button" 
                   disabled={isSaving}
                   onClick={() => setIsModalOpen(false)}
                   className="flex-1 px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   type="submit" 
                   disabled={isSaving}
                   className="flex-1 px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-primary hover:bg-slate-800 transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-70"
                 >
                   {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                   {isSaving ? 'Salvando...' : 'Salvar'}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};