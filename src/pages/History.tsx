import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, Transaction, Account, Category } from '@/lib/database';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Search, Filter, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function History() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { if (user?.id) loadData(); }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    const [txns, accts, cats] = await Promise.all([
      db.transactions.where('userId').equals(user.id).reverse().sortBy('date'),
      db.accounts.where('userId').equals(user.id).toArray(),
      db.categories.where('userId').equals(user.id).toArray(),
    ]);
    setTransactions(txns);
    setAccounts(accts);
    setCategories(cats);
  };

  const accountMap = new Map(accounts.map(a => [a.id!, a]));
  const categoryMap = new Map(categories.map(c => [c.id!, c]));

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterAccount !== 'all' && t.accountId.toString() !== filterAccount) return false;
    if (filterCategory !== 'all' && t.categoryId.toString() !== filterCategory) return false;
    if (dateFrom && t.date < new Date(dateFrom)) return false;
    if (dateTo && t.date > new Date(dateTo)) return false;
    if (search) {
      const cat = categoryMap.get(t.categoryId);
      const acc = accountMap.get(t.accountId);
      const s = search.toLowerCase();
      return cat?.name.toLowerCase().includes(s) || acc?.name.toLowerCase().includes(s) || t.note?.toLowerCase().includes(s);
    }
    return true;
  });

  const typeLabels = { income: 'Pemasukan', expense: 'Pengeluaran', transfer: 'Transfer' };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-title">Riwayat Transaksi</h1>

      <div className="finance-card">
        <div className="flex items-center gap-2 mb-4"><Filter size={18} /><h3 className="font-semibold">Filter</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="relative xl:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} /><input type="text" placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" /></div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field"><option value="all">Semua Tipe</option><option value="income">Pemasukan</option><option value="expense">Pengeluaran</option><option value="transfer">Transfer</option></select>
          <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="input-field"><option value="all">Semua Akun</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field" placeholder="Dari" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field" placeholder="Sampai" />
        </div>
      </div>

      <div className="finance-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50"><th className="text-left p-4 font-medium text-sm">Tanggal</th><th className="text-left p-4 font-medium text-sm">Tipe</th><th className="text-left p-4 font-medium text-sm">Kategori</th><th className="text-left p-4 font-medium text-sm">Akun</th><th className="text-left p-4 font-medium text-sm">Catatan</th><th className="text-right p-4 font-medium text-sm">Jumlah</th></tr></thead>
            <tbody>
              {filtered.map(t => {
                const cat = categoryMap.get(t.categoryId);
                const acc = accountMap.get(t.accountId);
                return (
                  <tr key={t.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-sm">{formatDate(t.date)}</td>
                    <td className="p-4"><span className={cn('text-xs px-2 py-1 rounded-full', t.type === 'income' && 'badge-income', t.type === 'expense' && 'badge-expense', t.type === 'transfer' && 'badge-transfer')}>{typeLabels[t.type]}</span></td>
                    <td className="p-4 text-sm">{cat?.icon} {cat?.name}</td>
                    <td className="p-4 text-sm">{acc?.name}</td>
                    <td className="p-4 text-sm text-muted-foreground">{t.note || '-'}</td>
                    <td className={cn('p-4 text-right font-semibold mono-number', t.type === 'income' && 'amount-income', t.type === 'expense' && 'amount-expense', t.type === 'transfer' && 'amount-transfer')}>{formatCurrency(t.amount)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Tidak ada transaksi ditemukan</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border text-sm text-muted-foreground">Menampilkan {filtered.length} dari {transactions.length} transaksi</div>
      </div>
    </div>
  );
}
