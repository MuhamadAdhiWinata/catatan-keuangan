import { db, Transaction, Category, Account } from './database';
import { startOfMonth, endOfMonth, subMonths, format, getDay, parseISO } from 'date-fns';

export interface MonthlyCashflow {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryBreakdown {
  categoryId: number;
  categoryName: string;
  amount: number;
  percentage: number;
  icon?: string;
}

export interface CashflowForecast {
  predictedIncome: number;
  predictedExpense: number;
  predictedNet: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface SpendingAnomaly {
  transactionId: number;
  categoryName: string;
  amount: number;
  average: number;
  ratio: number;
  date: Date;
}

export interface SpendingInsight {
  topCategories: { name: string; amount: number; icon?: string }[];
  dayOfWeekPattern: { day: string; amount: number }[];
  monthOverMonth: { change: number; direction: 'up' | 'down' | 'stable' };
  largestTransaction: { amount: number; category: string; date: Date } | null;
}

export interface FinancialHealth {
  burnRate: number;
  runwayMonths: number;
  totalBalance: number;
  spendingTrend: 'increasing' | 'decreasing' | 'stable';
  trendPercentage: number;
}

// Get monthly cashflow for the past N months
export async function getMonthlyCashflow(userId: number, months: number = 12): Promise<MonthlyCashflow[]> {
  const result: MonthlyCashflow[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));

    const transactions = await db.transactions
      .where('userId')
      .equals(userId)
      .and(t => t.date >= monthStart && t.date <= monthEnd && t.type !== 'transfer')
      .toArray();

    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    result.push({
      month: format(monthStart, 'MMM yyyy'),
      income,
      expense,
      net: income - expense,
    });
  }

  return result;
}

// Get category breakdown for a specific type and period
export async function getCategoryBreakdown(
  userId: number,
  type: 'income' | 'expense',
  startDate: Date,
  endDate: Date
): Promise<CategoryBreakdown[]> {
  const transactions = await db.transactions
    .where('userId')
    .equals(userId)
    .and(t => t.type === type && t.date >= startDate && t.date <= endDate)
    .toArray();

  const categories = await db.categories.where('userId').equals(userId).toArray();
  const categoryMap = new Map(categories.map(c => [c.id!, c]));

  const breakdown = new Map<number, number>();
  let total = 0;

  transactions.forEach(t => {
    const current = breakdown.get(t.categoryId) || 0;
    breakdown.set(t.categoryId, current + t.amount);
    total += t.amount;
  });

  const result: CategoryBreakdown[] = [];
  breakdown.forEach((amount, categoryId) => {
    const category = categoryMap.get(categoryId);
    result.push({
      categoryId,
      categoryName: category?.name || 'Unknown',
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
      icon: category?.icon,
    });
  });

  return result.sort((a, b) => b.amount - a.amount);
}

// Simple Moving Average forecast
export async function getCashflowForecast(userId: number): Promise<CashflowForecast> {
  const monthlyCashflow = await getMonthlyCashflow(userId, 6);
  
  if (monthlyCashflow.length < 3) {
    return {
      predictedIncome: 0,
      predictedExpense: 0,
      predictedNet: 0,
      confidence: 'low',
    };
  }

  // Use 3-month moving average
  const recentMonths = monthlyCashflow.slice(-3);
  
  const predictedIncome = recentMonths.reduce((sum, m) => sum + m.income, 0) / 3;
  const predictedExpense = recentMonths.reduce((sum, m) => sum + m.expense, 0) / 3;

  // Determine confidence based on variance
  const incomeVariance = calculateVariance(recentMonths.map(m => m.income));
  const avgIncome = predictedIncome;
  const coefficientOfVariation = avgIncome > 0 ? Math.sqrt(incomeVariance) / avgIncome : 1;

  let confidence: 'low' | 'medium' | 'high' = 'medium';
  if (coefficientOfVariation < 0.2) confidence = 'high';
  else if (coefficientOfVariation > 0.5) confidence = 'low';

  return {
    predictedIncome: Math.round(predictedIncome),
    predictedExpense: Math.round(predictedExpense),
    predictedNet: Math.round(predictedIncome - predictedExpense),
    confidence,
  };
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}

// Detect spending anomalies
export async function detectAnomalies(userId: number): Promise<SpendingAnomaly[]> {
  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);
  const oneMonthAgo = subMonths(now, 1);

  // Get historical transactions for averages
  const historicalTransactions = await db.transactions
    .where('userId')
    .equals(userId)
    .and(t => t.type === 'expense' && t.date >= threeMonthsAgo && t.date < oneMonthAgo)
    .toArray();

  // Calculate average per category
  const categoryAverages = new Map<number, { total: number; count: number }>();
  historicalTransactions.forEach(t => {
    const current = categoryAverages.get(t.categoryId) || { total: 0, count: 0 };
    categoryAverages.set(t.categoryId, {
      total: current.total + t.amount,
      count: current.count + 1,
    });
  });

  // Get recent transactions
  const recentTransactions = await db.transactions
    .where('userId')
    .equals(userId)
    .and(t => t.type === 'expense' && t.date >= oneMonthAgo)
    .toArray();

  const categories = await db.categories.where('userId').equals(userId).toArray();
  const categoryMap = new Map(categories.map(c => [c.id!, c]));

  const anomalies: SpendingAnomaly[] = [];

  recentTransactions.forEach(t => {
    const avg = categoryAverages.get(t.categoryId);
    if (avg && avg.count >= 2) {
      const average = avg.total / avg.count;
      const ratio = t.amount / average;
      
      if (ratio >= 2) { // 2x or more than average
        anomalies.push({
          transactionId: t.id!,
          categoryName: categoryMap.get(t.categoryId)?.name || 'Unknown',
          amount: t.amount,
          average,
          ratio,
          date: t.date,
        });
      }
    }
  });

  return anomalies.sort((a, b) => b.ratio - a.ratio);
}

// Get spending habit insights
export async function getSpendingInsights(userId: number): Promise<SpendingInsight> {
  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);

  const transactions = await db.transactions
    .where('userId')
    .equals(userId)
    .and(t => t.type === 'expense' && t.date >= threeMonthsAgo)
    .toArray();

  const categories = await db.categories.where('userId').equals(userId).toArray();
  const categoryMap = new Map(categories.map(c => [c.id!, c]));

  // Top categories
  const categoryTotals = new Map<number, number>();
  transactions.forEach(t => {
    const current = categoryTotals.get(t.categoryId) || 0;
    categoryTotals.set(t.categoryId, current + t.amount);
  });

  const topCategories = Array.from(categoryTotals.entries())
    .map(([id, amount]) => ({
      name: categoryMap.get(id)?.name || 'Unknown',
      amount,
      icon: categoryMap.get(id)?.icon,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  // Day of week pattern
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayTotals = new Array(7).fill(0);
  transactions.forEach(t => {
    const day = getDay(t.date);
    dayTotals[day] += t.amount;
  });

  const dayOfWeekPattern = dayNames.map((day, i) => ({
    day,
    amount: dayTotals[i],
  }));

  // Month over month comparison
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const thisMonthExpense = transactions
    .filter(t => t.date >= thisMonthStart)
    .reduce((sum, t) => sum + t.amount, 0);

  const lastMonthExpense = transactions
    .filter(t => t.date >= lastMonthStart && t.date <= lastMonthEnd)
    .reduce((sum, t) => sum + t.amount, 0);

  const change = lastMonthExpense > 0 
    ? ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100 
    : 0;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (change > 5) direction = 'up';
  else if (change < -5) direction = 'down';

  const monthOverMonth = {
    change: Math.abs(change),
    direction,
  };

  // Largest transaction
  const sorted = [...transactions].sort((a, b) => b.amount - a.amount);
  const largest = sorted[0];

  return {
    topCategories,
    dayOfWeekPattern,
    monthOverMonth,
    largestTransaction: largest ? {
      amount: largest.amount,
      category: categoryMap.get(largest.categoryId)?.name || 'Unknown',
      date: largest.date,
    } : null,
  };
}

// Calculate financial health indicators
export async function getFinancialHealth(userId: number): Promise<FinancialHealth> {
  const accounts = await db.accounts.where('userId').equals(userId).toArray();
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const now = new Date();
  const threeMonthsAgo = subMonths(now, 3);
  const oneMonthAgo = subMonths(now, 1);
  const twoMonthsAgo = subMonths(now, 2);

  // Get expenses for burn rate calculation
  const recentExpenses = await db.transactions
    .where('userId')
    .equals(userId)
    .and(t => t.type === 'expense' && t.date >= threeMonthsAgo)
    .toArray();

  // Calculate monthly expenses
  const monthlyExpenses: number[] = [];
  
  for (let i = 0; i < 3; i++) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));
    const monthTotal = recentExpenses
      .filter(t => t.date >= monthStart && t.date <= monthEnd)
      .reduce((sum, t) => sum + t.amount, 0);
    monthlyExpenses.push(monthTotal);
  }

  const burnRate = monthlyExpenses.reduce((sum, e) => sum + e, 0) / 3;
  const runwayMonths = burnRate > 0 ? totalBalance / burnRate : 999;

  // Spending trend (compare last month to previous month)
  const lastMonthExpense = monthlyExpenses[1] || 0;
  const prevMonthExpense = monthlyExpenses[2] || 0;
  
  const trendPercentage = prevMonthExpense > 0 
    ? ((lastMonthExpense - prevMonthExpense) / prevMonthExpense) * 100 
    : 0;

  let spendingTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (trendPercentage > 10) spendingTrend = 'increasing';
  else if (trendPercentage < -10) spendingTrend = 'decreasing';

  return {
    burnRate: Math.round(burnRate),
    runwayMonths: Math.round(runwayMonths * 10) / 10,
    totalBalance,
    spendingTrend,
    trendPercentage: Math.abs(Math.round(trendPercentage)),
  };
}

// Export data to JSON
export async function exportToJSON(userId: number): Promise<string> {
  const accounts = await db.accounts.where('userId').equals(userId).toArray();
  const categories = await db.categories.where('userId').equals(userId).toArray();
  const transactions = await db.transactions.where('userId').equals(userId).toArray();

  return JSON.stringify({
    exportDate: new Date().toISOString(),
    accounts,
    categories,
    transactions,
  }, null, 2);
}

// Export data to CSV
export async function exportToCSV(userId: number): Promise<string> {
  const transactions = await db.transactions.where('userId').equals(userId).toArray();
  const accounts = await db.accounts.where('userId').equals(userId).toArray();
  const categories = await db.categories.where('userId').equals(userId).toArray();

  const accountMap = new Map(accounts.map(a => [a.id!, a.name]));
  const categoryMap = new Map(categories.map(c => [c.id!, c.name]));

  const headers = ['Date', 'Type', 'Category', 'Account', 'Amount', 'Note'];
  const rows = transactions.map(t => [
    format(t.date, 'yyyy-MM-dd'),
    t.type,
    categoryMap.get(t.categoryId) || '',
    accountMap.get(t.accountId) || '',
    t.amount.toString(),
    t.note || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}
