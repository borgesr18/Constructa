import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowRight, Loader2, AlertCircle, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ConstructaLogo } from '../components/ConstructaLogo';

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'LOGIN' | 'FORGOT'>('LOGIN');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Redireciona automaticamente se o usuário já estiver logado
  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const translateError = (msg: string) => {
    if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.';
    if (msg.includes('Email not confirmed')) return 'Email não confirmado. Verifique sua caixa de entrada.';
    if (msg.includes('User already registered')) return 'Este email já está cadastrado.';
    if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
    return msg;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (view === 'LOGIN') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // O redirecionamento é tratado pelo useEffect acima quando a sessão atualizar
      } else if (view === 'FORGOT') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/#/settings', 
        });
        if (error) throw error;
        setSuccessMsg('Email de recuperação enviado! Verifique sua caixa de entrada.');
        setView('LOGIN');
      }
    } catch (err: any) {
      setError(translateError(err.message || 'Ocorreu um erro.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 text-center bg-slate-50 border-b border-gray-100">
           <div className="mx-auto w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary/30">
              <ConstructaLogo className="w-10 h-10" color="text-accent" />
           </div>
           <h1 className="text-2xl font-bold text-gray-900">Constructa</h1>
           <p className="text-sm text-gray-500 mt-2">Gestão Financeira de Obras</p>
        </div>

        <div className="p-8">
           {error && (
             <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={16} className="shrink-0" />
                {error}
             </div>
           )}

           {successMsg && (
             <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={16} className="shrink-0" />
                {successMsg}
             </div>
           )}

           <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="email" 
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              {view !== 'FORGOT' && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase">Senha</label>
                    {view === 'LOGIN' && (
                      <button 
                        type="button"
                        onClick={() => { setView('FORGOT'); setError(''); setSuccessMsg(''); }}
                        className="text-xs text-primary font-bold hover:underline"
                      >
                        Esqueceu?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="password" 
                      required
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : (
                  <>
                    {view === 'LOGIN' && 'Entrar no Sistema'}
                    {view === 'FORGOT' && 'Recuperar Senha'}
                    {view !== 'FORGOT' && <ArrowRight size={18} />}
                  </>
                )}
              </button>
           </form>

           <div className="mt-6 text-center space-y-3">
              {view === 'FORGOT' && (
                <button 
                  onClick={() => { setView('LOGIN'); setError(''); setSuccessMsg(''); }}
                  className="text-sm text-gray-500 hover:text-primary font-medium transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <ArrowLeft size={14} />
                  Voltar para Login
                </button>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};