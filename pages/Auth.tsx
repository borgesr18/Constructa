import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Building, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Cadastro realizado! Verifique seu email ou faça login.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 text-center bg-slate-50 border-b border-gray-100">
           <div className="mx-auto w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
              <Building size={24} />
           </div>
           <h1 className="text-2xl font-bold text-gray-900">Bem-vindo ao Constructa</h1>
           <p className="text-sm text-gray-500 mt-2">Sistema de Gestão Financeira de Obras</p>
        </div>

        <div className="p-8">
           {error && (
             <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
             </div>
           )}

           <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Senha</label>
                <input 
                  type="password" 
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : (
                  <>
                    {isSignUp ? 'Criar Conta' : 'Entrar no Sistema'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
           </form>

           <div className="mt-6 text-center">
              <button 
                onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                className="text-sm text-gray-500 hover:text-primary font-medium transition-colors"
              >
                {isSignUp ? 'Já tem uma conta? Faça Login' : 'Não tem conta? Crie uma agora'}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
