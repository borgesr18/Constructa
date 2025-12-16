import React from 'react';
import { LayoutDashboard, Wallet, Users, ArrowRightLeft, Menu, LogOut, Building, Truck, Landmark, FileText, PieChart } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

// New Custom Icon for Constructa
const ConstructaLogo = ({ className = "w-8 h-8", color = "text-accent" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M3 21V8L12 2L21 8V21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={color} />
    <path d="M9 10L12 8L15 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white opacity-80" />
    <path d="M9 21V14H15V21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={color} />
  </svg>
);

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Resumo', path: '/' },
    { icon: Landmark, label: 'Financeiro', path: '/financial-planning' },
    { icon: ArrowRightLeft, label: 'Transações', path: '/transactions' },
    { icon: PieChart, label: 'Relatórios', path: '/reports' },
    { icon: FileText, label: 'Recibos', path: '/receipts' },
    { icon: Users, label: 'Sócios', path: '/partners' },
    { icon: Truck, label: 'Fornecedores', path: '/suppliers' },
    { icon: Building, label: 'Config', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-primary text-white h-screen sticky top-0 p-4 print:hidden shadow-xl z-20">
        <div className="flex items-center gap-3 mb-10 px-2 mt-2">
          <div className="p-1.5 bg-white/10 rounded-xl shadow-inner backdrop-blur-sm">
            <ConstructaLogo className="w-8 h-8" color="text-accent" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight block leading-none">Constructa</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">SaaS System</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-accent text-white font-medium shadow-md shadow-accent/20 translate-x-1' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={20} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-white transition-colors'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-4">
          <button className="flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-white w-full transition-colors">
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0 overflow-y-auto h-screen print:h-auto print:overflow-visible scroll-smooth">
        {/* Mobile Header */}
        <header className="md:hidden bg-primary border-b border-primary/50 p-4 flex justify-between items-center sticky top-0 z-20 print:hidden text-white shadow-md">
          <div className="flex items-center gap-3">
             <div className="p-1 bg-white/10 rounded-lg">
               <ConstructaLogo className="w-6 h-6" color="text-accent" />
             </div>
             <span className="font-bold text-lg tracking-tight">Constructa</span>
          </div>
          <button className="text-gray-300 hover:text-white">
            <Menu size={24} />
          </button>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto print:p-0 print:max-w-none">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 pb-safe print:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center py-3 px-2 min-w-[3.5rem] transition-colors ${
                  isActive ? 'text-accent' : 'text-gray-400'
                }`}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className="mb-1" />
              </Link>
            );
          })}
          <Link to="/settings" className={`flex flex-col items-center py-3 px-2 min-w-[3.5rem] transition-colors ${location.pathname === '/settings' ? 'text-accent' : 'text-gray-400'}`}>
             <Menu size={22} />
          </Link>
        </div>
      </nav>
    </div>
  );
};