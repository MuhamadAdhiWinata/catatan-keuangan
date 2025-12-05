import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, Account, Transaction, Category } from '@/lib/database';
import { getMonthlyCashflow, getCategoryBreakdown, getCashflowForecast, detectAnomalies, getFinancialHealth, MonthlyCashflow, CategoryBreakdown, CashflowForecast, SpendingAnomaly, FinancialHealth } from '@/lib/analytics';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency } from '@/lib/formatters';
import { Wallet, TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle, Target, Clock } from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';

const CHART_COLORS = ['hsl(221, 83%, 53%)', 'hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)', 'hsl(38, 92%, 50%)', 'hsl(262, 83%, 58%)'];

export default function Dashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyCashflow[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>([]);
  const [forecast, setForecast] = useState<CashflowForecast | null>(null);
  const [anomalies, setAnomalies] = useState<SpendingAnomaly[]>([]);
  const [health, setHealth] = useState<FinancialHealth | null>(null);
  const [thisMonthIncome, setThisMonthIncome] = useState(0);
  const [thisMonthExpense, setThisMonthExpense] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    
    const [accts, monthly, breakdown, fc, anom, fin] = await Promise.all([
      db.accounts.where('userId').equals(user.id).toArray(),
      getMonthlyCashflow(user.id, 12),
      getCategoryBreakdown(user.id, 'expense', startOfMonth(new Date()), endOfMonth(new Date())),
      getCashflowForecast(user.id),
      detectAnomalies(user.id),
      getFinancialHealth(user.id),
    ]);

    setAccounts(accts);
    setMonthlyData(monthly);
    setExpenseBreakdown(breakdown);
    setForecast(fc);
    setAnomalies(anom);
    setHealth(fin);

    const currentMonth = monthly[monthly.length - 1];
    if (currentMonth) {
      setThisMonthIncome(currentMonth.income);
      setThisMonthExpense(currentMonth.expense);
    }
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const netCashflow = thisMonthIncome - thisMonthExpense;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.username}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Balance" value={totalBalance} icon={Wallet} variant="primary" />
        <StatCard title="Income (This Month)" value={thisMonthIncome} icon={TrendingUp} variant="income" />
        <StatCard title="Expenses (This Month)" value={thisMonthExpense} icon={TrendingDown} variant="expense" />
        <StatCard title="Net Cashflow" value={netCashflow} icon={ArrowRightLeft} variant={netCashflow >= 0 ? 'income' : 'expense'} />
      </div>

      {/* Anomaly Alert */}
      {anomalies.length > 0 && (
        <div className="finance-card bg-expense-muted border-expense/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-expense mt-0.5" />
            <div>
              <h3 className="font-semibold text-expense">Unusual Spending Detected</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {anomalies.length} transaction(s) significantly exceed your average spending.
                Highest: {formatCurrency(anomalies[0].amount)} in {anomalies[0].categoryName} ({anomalies[0].ratio.toFixed(1)}x average)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cashflow Chart */}
        <div className="finance-card">
          <h3 className="section-title mb-4">Monthly Cashflow</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData.slice(-6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="income" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expense" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="finance-card">
          <h3 className="section-title mb-4">Expense by Category</h3>
          <div className="h-64">
            {expenseBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseBreakdown.slice(0, 5)} dataKey="amount" nameKey="categoryName" cx="50%" cy="50%" outerRadius={80} label={({ categoryName, percentage }) => `${categoryName} (${percentage.toFixed(0)}%)`}>
                    {expenseBreakdown.slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No expense data</div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Health & Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forecast */}
        {forecast && (
          <div className="finance-card">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="section-title">3-Month Forecast</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${forecast.confidence === 'high' ? 'bg-income-muted text-income' : forecast.confidence === 'medium' ? 'bg-transfer-muted text-transfer' : 'bg-expense-muted text-expense'}`}>
                {forecast.confidence} confidence
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-sm text-muted-foreground">Predicted Income</p><p className="text-lg font-semibold amount-income">{formatCurrency(forecast.predictedIncome)}</p></div>
              <div><p className="text-sm text-muted-foreground">Predicted Expense</p><p className="text-lg font-semibold amount-expense">{formatCurrency(forecast.predictedExpense)}</p></div>
              <div><p className="text-sm text-muted-foreground">Predicted Net</p><p className={`text-lg font-semibold ${forecast.predictedNet >= 0 ? 'amount-income' : 'amount-expense'}`}>{formatCurrency(forecast.predictedNet)}</p></div>
            </div>
          </div>
        )}

        {/* Financial Health */}
        {health && (
          <div className="finance-card">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="section-title">Financial Health</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-muted-foreground">Monthly Burn Rate</p><p className="text-lg font-semibold">{formatCurrency(health.burnRate)}</p></div>
              <div><p className="text-sm text-muted-foreground">Financial Runway</p><p className="text-lg font-semibold">{health.runwayMonths > 100 ? '100+' : health.runwayMonths} months</p></div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm">
                Spending is <span className={health.spendingTrend === 'increasing' ? 'text-expense font-medium' : health.spendingTrend === 'decreasing' ? 'text-income font-medium' : 'text-muted-foreground'}>
                  {health.spendingTrend}
                </span> {health.trendPercentage > 0 && `by ${health.trendPercentage}%`} compared to last month.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
