
import React from 'react';
import { useData } from '../context/DataContext';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../utils';
import { PartnerBalance } from '../types';
import { Wallet, TrendingDown, TrendingUp, AlertCircle, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Dashboard: React.FC = () => {
  const { project, financials, partners } = useData();

  // Prepare Chart Data (Simple aggregation by partner for demo)
  const chartData = Object.values(financials.partnerBalances).map((pb: PartnerBalance) => ({
    name: pb.partnerName.split(' ')[0], // First name
    balance: pb.balance
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">{project.address}</span>
            <Badge variant="success">Em Andamento</Badge>
          </div>
        </div>
        <Link 
          to="/transactions" 
          className="bg-primary hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors"
        >
          <PlusCircle size={18} />
          Nova Transação
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-slate-400 text-sm font-medium">Saldo em Caixa</p>
              <h2 className="text-3xl font-bold mt-1">{formatCurrency(financials.boxBalance)}</h2>
            </div>
            <div className="bg-white/10 p-2 rounded-lg">
              <Wallet className="text-white" size={24} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Disponível para uso imediato
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Despesas</p>
              <h2 className="text-3xl font-bold mt-1 text-gray-900">{formatCurrency(financials.totalExpenses)}</h2>
            </div>
            <div className="bg-red-50 p-2 rounded-lg">
              <TrendingDown className="text-red-500" size={24} />
            </div>
          </div>
           <p className="text-xs text-gray-400">Acumulado desde o início</p>
        </Card>

        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-gray-500 text-sm font-medium">Aportes Totais</p>
              <h2 className="text-3xl font-bold mt-1 text-gray-900">
                {formatCurrency(Object.values(financials.partnerBalances).reduce((acc: number, curr: PartnerBalance) => acc + curr.totalContributed, 0) as number)}
              </h2>
            </div>
            <div className="bg-green-50 p-2 rounded-lg">
              <TrendingUp className="text-green-500" size={24} />
            </div>
          </div>
          <p className="text-xs text-gray-400">Investimento realizado</p>
        </Card>
      </div>

      {/* Partners Balance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-full">
          <CardHeader 
            title="Situação dos Sócios" 
            subtitle="Saldo calculado vs. Rateio definido"
          />
          <div className="space-y-4">
            {partners.map(partner => {
              const pb = financials.partnerBalances[partner.id];
              if (!pb) return null;
              const isCredit = pb.balance >= 0;

              return (
                <div key={partner.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                        {partner.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{partner.name}</p>
                        <p className="text-xs text-gray-500">Participação: {partner.percentage}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className={`font-bold block ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                        {isCredit ? '+' : ''}{formatCurrency(pb.balance)}
                       </span>
                       <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                         {isCredit ? 'Crédito' : 'A Pagar'}
                       </span>
                    </div>
                  </div>
                  
                  {/* Mini details */}
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-200/50 text-xs">
                    <div>
                      <span className="text-gray-400 block">Investiu</span>
                      <span className="font-medium">{formatCurrency(pb.totalContributed)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Pagou Despesas</span>
                      <span className="font-medium">{formatCurrency(pb.totalExpensesPaid)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Chart Section */}
        <Card className="h-full flex flex-col min-h-[300px]">
          <CardHeader title="Balanço Comparativo" subtitle="Saldo líquido por sócio" />
          <div className="w-full h-[300px] min-w-0 flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="balance" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.balance >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-start gap-2 mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p>
              O sistema calcula automaticamente o rateio com base em <strong>{project.distributionType === 'PERCENTAGE' ? 'Porcentagem (%)' : 'Valor Fixo'}</strong>. 
              Despesas pagas por sócios geram crédito.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
