import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Partners } from './pages/Partners';
import { Suppliers } from './pages/Suppliers';
import { Settings } from './pages/Settings';
import { FinancialPlanning } from './pages/FinancialPlanning';
import { Receipts } from './pages/Receipts';
import { Reports } from './pages/Reports';
import { Auth } from './pages/Auth';
import { DataProvider, useData } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2, PlusCircle } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-primary">
         <Loader2 size={40} className="animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Component to handle "No Project" state
const AppContent: React.FC = () => {
    const { project, loading, createInitialProject } = useData();
    const [newProjectName, setNewProjectName] = useState('');
    const [creating, setCreating] = useState(false);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
               <div className="flex flex-col items-center gap-3">
                 <Loader2 size={40} className="text-primary animate-spin" />
                 <p className="text-gray-500 font-medium">Carregando seus dados...</p>
               </div>
            </div>
        );
    }

    // If logged in but no project exists, force creation
    if (!project) {
        return (
            <div className="h-screen w-screen bg-gray-50 flex items-center justify-center p-4">
               <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                  <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                     <PlusCircle size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Vamos começar!</h2>
                  <p className="text-gray-500 mb-6">Você ainda não tem nenhuma obra cadastrada. Dê um nome para o seu primeiro projeto.</p>
                  
                  <input 
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Ex: Residencial Flores"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                  />
                  
                  <button 
                    onClick={async () => {
                        if(!newProjectName) return;
                        setCreating(true);
                        await createInitialProject(newProjectName);
                        setCreating(false);
                    }}
                    disabled={!newProjectName || creating}
                    className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creating ? <Loader2 className="animate-spin"/> : 'Criar Obra'}
                  </button>
               </div>
            </div>
        );
    }

    return (
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/financial-planning" element={<FinancialPlanning />} /> 
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/partners" element={<Partners />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
    );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <HashRouter>
            <Routes>
                <Route path="/login" element={<Auth />} />
                <Route path="/*" element={
                    <ProtectedRoute>
                        <AppContent />
                    </ProtectedRoute>
                } />
            </Routes>
        </HashRouter>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
