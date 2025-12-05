import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getSpendingInsights, getMonthlyCashflow, SpendingInsight, MonthlyCashflow } from '@/lib/analytics';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function Analytics() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<SpendingInsight | null>(null);
  const [monthly, setMonthly] = useState<MonthlyCashflow[]>([]);

  useEffect(() => { if (user?.id) loadData(); }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    const [ins, mon] = await Promise.all([getSpendingInsights(user.id), getMonthlyCashflow(user.id, 12)]);
    setInsights(ins);
    setMonthly(mon);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-title">Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Cashflow Trend */}
        <div className="finance-card">
          <h3 className="section-title mb-4">Net Cashflow Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="net" stroke="hsl(221, 83%, 53%)" strokeWidth={2} dot={{ fill: 'hsl(221, 83%, 53%)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Spending Categories */}
        <div className="finance-card">
          <h3 className="section-title mb-4">Top Spending Categories</h3>
          {insights?.topCategories.length ? (
            <div className="space-y-3">
              {insights.topCategories.map((cat, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span>{cat.icon}</span><span className="font-medium">{cat.name}</span></div>
                  <span className="font-semibold mono-number amount-expense">{formatCurrency(cat.amount)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-muted-foreground">No data available</p>}
        </div>

        {/* Day of Week Pattern */}
        <div className="finance-card">
          <h3 className="section-title mb-4">Spending by Day of Week</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights?.dayOfWeekPattern || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="amount" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="finance-card">
          <h3 className="section-title mb-4">Quick Insights</h3>
          <div className="space-y-4">
            {insights?.monthOverMonth && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Month-over-month change</p>
                <p className={`text-lg font-semibold ${insights.monthOverMonth.direction === 'up' ? 'amount-expense' : insights.monthOverMonth.direction === 'down' ? 'amount-income' : ''}`}>
                  {insights.monthOverMonth.direction === 'up' ? '↑' : insights.monthOverMonth.direction === 'down' ? '↓' : '→'} {insights.monthOverMonth.change.toFixed(1)}% {insights.monthOverMonth.direction}
                </p>
              </div>
            )}
            {insights?.largestTransaction && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Largest single expense</p>
                <p className="text-lg font-semibold amount-expense">{formatCurrency(insights.largestTransaction.amount)}</p>
                <p className="text-sm text-muted-foreground">{insights.largestTransaction.category} • {formatDate(insights.largestTransaction.date)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
