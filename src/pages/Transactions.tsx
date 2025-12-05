import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, Account, Category, Transaction, createTransaction, deleteTransaction } from '@/lib/database';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [form, setForm] = useState({ accountId: '', categoryId: '', type: 'expense' as Transaction['type'], amount: '', date: new Date().toISOString().split('T')[0], note: '', destinationAccountId: '' });

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
    if (accts.length > 0) setForm(f => ({ ...f, accountId: accts[0].id!.toString() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    try {
      await createTransaction({
        userId: user.id,
        accountId: parseInt(form.accountId),
        categoryId: parseInt(form.categoryId),
        type: form.type,
        amount: parseFloat(form.amount),
        date: new Date(form.date),
        note: form.note || undefined,
        destinationAccountId: form.type === 'transfer' ? parseInt(form.destinationAccountId) : undefined,
      });
      toast({ title: 'Transaksi ditambahkan' });
      setIsOpen(false);
      setForm({ accountId: accounts[0]?.id?.toString() || '', categoryId: '', type: 'expense', amount: '', date: new Date().toISOString().split('T')[0], note: '', destinationAccountId: '' });
      loadData();
    } catch (err) { toast({ title: 'Error', description: 'Gagal menambahkan transaksi', variant: 'destructive' }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus transaksi ini?')) return;
    await deleteTransaction(id);
    toast({ title: 'Transaksi dihapus' });
    loadData();
  };

  const filteredCategories = categories.filter(c => c.type === form.type);
  const accountMap = new Map(accounts.map(a => [a.id!, a]));
  const categoryMap = new Map(categories.map(c => [c.id!, c]));

  const filtered = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (search) {
      const cat = categoryMap.get(t.categoryId);
      const acc = accountMap.get(t.accountId);
      const searchLower = search.toLowerCase();
      return cat?.name.toLowerCase().includes(searchLower) || acc?.name.toLowerCase().includes(searchLower) || t.note?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  const typeLabels = { all: 'Semua', income: 'Pemasukan', expense: 'Pengeluaran', transfer: 'Transfer' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-title">Transaksi</h1>
        <button onClick={() => setIsOpen(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Tambah Transaksi</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} /><input type="text" placeholder="Cari..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" /></div>
        <div className="flex gap-2">
          {(['all', 'income', 'expense', 'transfer'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-2 rounded-lg text-sm font-medium ${filterType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{typeLabels[t]}</button>
          ))}
        </div>
      </div>

      <div className="finance-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50"><th className="text-left p-4 font-medium text-sm">Tanggal</th><th className="text-left p-4 font-medium text-sm">Kategori</th><th className="text-left p-4 font-medium text-sm">Akun</th><th className="text-left p-4 font-medium text-sm">Catatan</th><th className="text-right p-4 font-medium text-sm">Jumlah</th><th className="p-4"></th></tr></thead>
            <tbody>
              {filtered.map(t => {
                const cat = categoryMap.get(t.categoryId);
                const acc = accountMap.get(t.accountId);
                const destAcc = t.destinationAccountId ? accountMap.get(t.destinationAccountId) : null;
                return (
                  <tr key={t.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-sm">{formatDate(t.date)}</td>
                    <td className="p-4"><div className="flex items-center gap-2">
                      {t.type === 'income' && <ArrowUpCircle size={16} className="text-income" />}
                      {t.type === 'expense' && <ArrowDownCircle size={16} className="text-expense" />}
                      {t.type === 'transfer' && <ArrowRightLeft size={16} className="text-transfer" />}
                      <span className="text-sm">{cat?.icon} {cat?.name}</span>
                    </div></td>
                    <td className="p-4 text-sm">{acc?.name}{destAcc && <span className="text-muted-foreground"> → {destAcc.name}</span>}</td>
                    <td className="p-4 text-sm text-muted-foreground">{t.note || '-'}</td>
                    <td className={cn('p-4 text-right font-semibold mono-number', t.type === 'income' && 'amount-income', t.type === 'expense' && 'amount-expense', t.type === 'transfer' && 'amount-transfer')}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : '↔'}{formatCurrency(t.amount)}
                    </td>
                    <td className="p-4"><button onClick={() => handleDelete(t.id!)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"><Trash2 size={16} /></button></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Tidak ada transaksi ditemukan</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tambah Transaksi</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              {(['income', 'expense', 'transfer'] as const).map(t => (
                <button key={t} type="button" onClick={() => setForm({ ...form, type: t, categoryId: '' })} className={cn('flex-1 py-2 rounded-lg text-sm font-medium', form.type === t ? (t === 'income' ? 'btn-income' : t === 'expense' ? 'btn-expense' : 'btn-transfer') : 'bg-secondary text-secondary-foreground')}>{typeLabels[t]}</button>
              ))}
            </div>
            <div><label className="block text-sm font-medium mb-2">{form.type === 'transfer' ? 'Dari Akun' : 'Akun'}</label>
              <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} className="input-field" required>
                <option value="">Pilih akun</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            {form.type === 'transfer' && (
              <div><label className="block text-sm font-medium mb-2">Ke Akun</label>
                <select value={form.destinationAccountId} onChange={e => setForm({ ...form, destinationAccountId: e.target.value })} className="input-field" required>
                  <option value="">Pilih tujuan</option>{accounts.filter(a => a.id?.toString() !== form.accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <div><label className="block text-sm font-medium mb-2">Kategori</label>
              <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="input-field" required>
                <option value="">Pilih kategori</option>{filteredCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-2">Jumlah</label><input type="number" step="1" min="1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="input-field" required /></div>
            <div><label className="block text-sm font-medium mb-2">Tanggal</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" required /></div>
            <div><label className="block text-sm font-medium mb-2">Catatan (opsional)</label><input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="input-field" /></div>
            <button type="submit" className="btn-primary w-full">Tambah Transaksi</button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
