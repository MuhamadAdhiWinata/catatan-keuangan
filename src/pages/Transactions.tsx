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
      toast({ title: 'Transaction added' });
      setIsOpen(false);
      setForm({ accountId: accounts[0]?.id?.toString() || '', categoryId: '', type: 'expense', amount: '', date: new Date().toISOString().split('T')[0], note: '', destinationAccountId: '' });
      loadData();
    } catch (err) { toast({ title: 'Error', description: 'Failed to add transaction', variant: 'destructive' }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this transaction?')) return;
    await deleteTransaction(id);
    toast({ title: 'Transaction deleted' });
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-title">Transactions</h1>
        <button onClick={() => setIsOpen(true)} className="btn-primary flex items-center gap-2"><Plus size={18} /> Add Transaction</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} /><input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" /></div>
        <div className="flex gap-2">
          {['all', 'income', 'expense', 'transfer'].map(t => (
            <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-2 rounded-lg text-sm font-medium capitalize ${filterType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="finance-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-border bg-muted/50"><th className="text-left p-4 font-medium text-sm">Date</th><th className="text-left p-4 font-medium text-sm">Category</th><th className="text-left p-4 font-medium text-sm">Account</th><th className="text-left p-4 font-medium text-sm">Note</th><th className="text-right p-4 font-medium text-sm">Amount</th><th className="p-4"></th></tr></thead>
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
              {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No transactions found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              {(['income', 'expense', 'transfer'] as const).map(t => (
                <button key={t} type="button" onClick={() => setForm({ ...form, type: t, categoryId: '' })} className={cn('flex-1 py-2 rounded-lg text-sm font-medium capitalize', form.type === t ? (t === 'income' ? 'btn-income' : t === 'expense' ? 'btn-expense' : 'btn-transfer') : 'bg-secondary text-secondary-foreground')}>{t}</button>
              ))}
            </div>
            <div><label className="block text-sm font-medium mb-2">{form.type === 'transfer' ? 'From Account' : 'Account'}</label>
              <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} className="input-field" required>
                <option value="">Select account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            {form.type === 'transfer' && (
              <div><label className="block text-sm font-medium mb-2">To Account</label>
                <select value={form.destinationAccountId} onChange={e => setForm({ ...form, destinationAccountId: e.target.value })} className="input-field" required>
                  <option value="">Select destination</option>{accounts.filter(a => a.id?.toString() !== form.accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}
            <div><label className="block text-sm font-medium mb-2">Category</label>
              <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="input-field" required>
                <option value="">Select category</option>{filteredCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-2">Amount</label><input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="input-field" required /></div>
            <div><label className="block text-sm font-medium mb-2">Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" required /></div>
            <div><label className="block text-sm font-medium mb-2">Note (optional)</label><input type="text" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} className="input-field" /></div>
            <button type="submit" className="btn-primary w-full">Add Transaction</button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
