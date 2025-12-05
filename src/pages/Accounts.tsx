import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, Account } from '@/lib/database';
import { formatCurrency } from '@/lib/formatters';
import { Plus, Pencil, Trash2, Wallet, Building, CreditCard, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const accountTypeIcons = { bank: Building, cash: Wallet, 'e-wallet': CreditCard, investment: TrendingUp };
const accountTypeLabels = { bank: 'Bank Account', cash: 'Cash', 'e-wallet': 'E-Wallet', investment: 'Investment' };

export default function Accounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [form, setForm] = useState({ name: '', type: 'bank' as Account['type'], balance: '' });

  useEffect(() => { if (user?.id) loadAccounts(); }, [user?.id]);

  const loadAccounts = async () => {
    if (!user?.id) return;
    const accts = await db.accounts.where('userId').equals(user.id).toArray();
    setAccounts(accts);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    try {
      if (editingAccount) {
        await db.accounts.update(editingAccount.id!, { name: form.name, type: form.type, balance: parseFloat(form.balance) || 0 });
        toast({ title: 'Account updated' });
      } else {
        await db.accounts.add({ userId: user.id, name: form.name, type: form.type, balance: parseFloat(form.balance) || 0, createdAt: new Date() });
        toast({ title: 'Account created' });
      }
      setIsOpen(false);
      setEditingAccount(null);
      setForm({ name: '', type: 'bank', balance: '' });
      loadAccounts();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this account?')) return;
    await db.accounts.delete(id);
    toast({ title: 'Account deleted' });
    loadAccounts();
  };

  const filteredAccounts = filter === 'all' ? accounts : accounts.filter(a => a.type === filter);
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Accounts</h1>
          <p className="text-muted-foreground">Total Balance: <span className="font-semibold text-foreground">{formatCurrency(totalBalance)}</span></p>
        </div>
        <button onClick={() => { setEditingAccount(null); setForm({ name: '', type: 'bank', balance: '' }); setIsOpen(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Account
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'bank', 'cash', 'e-wallet', 'investment'].map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
            {t === 'all' ? 'All' : accountTypeLabels[t as Account['type']]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.map(account => {
          const Icon = accountTypeIcons[account.type];
          return (
            <div key={account.id} className="finance-card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center"><Icon className="w-5 h-5 text-primary" /></div>
                  <div><h3 className="font-semibold">{account.name}</h3><p className="text-xs text-muted-foreground">{accountTypeLabels[account.type]}</p></div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingAccount(account); setForm({ name: account.name, type: account.type, balance: account.balance.toString() }); setIsOpen(true); }} className="p-2 hover:bg-accent rounded-lg"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(account.id!)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="mt-4"><p className={`text-2xl font-bold mono-number ${account.balance >= 0 ? 'text-foreground' : 'amount-expense'}`}>{formatCurrency(account.balance)}</p></div>
            </div>
          );
        })}
        {filteredAccounts.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">No accounts found</div>}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingAccount ? 'Edit Account' : 'Add Account'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium mb-2">Name</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" required /></div>
            <div><label className="block text-sm font-medium mb-2">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Account['type'] })} className="input-field">
                <option value="bank">Bank Account</option><option value="cash">Cash</option><option value="e-wallet">E-Wallet</option><option value="investment">Investment</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-2">Initial Balance</label><input type="number" step="0.01" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} className="input-field" /></div>
            <button type="submit" className="btn-primary w-full">{editingAccount ? 'Update' : 'Create'} Account</button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
