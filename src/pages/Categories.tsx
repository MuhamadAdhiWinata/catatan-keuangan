import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, Category } from '@/lib/database';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [form, setForm] = useState({ name: '', type: 'expense' as Category['type'], icon: '📦' });

  useEffect(() => { if (user?.id) loadCategories(); }, [user?.id]);

  const loadCategories = async () => {
    if (!user?.id) return;
    const cats = await db.categories.where('userId').equals(user.id).toArray();
    setCategories(cats);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    try {
      if (editing) {
        await db.categories.update(editing.id!, { name: form.name, type: form.type, icon: form.icon });
        toast({ title: 'Category updated' });
      } else {
        await db.categories.add({ userId: user.id, name: form.name, type: form.type, icon: form.icon });
        toast({ title: 'Category created' });
      }
      setIsOpen(false);
      setEditing(null);
      setForm({ name: '', type: 'expense', icon: '📦' });
      loadCategories();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this category?')) return;
    await db.categories.delete(id);
    toast({ title: 'Category deleted' });
    loadCategories();
  };

  const filtered = filter === 'all' ? categories : categories.filter(c => c.type === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="page-title">Categories</h1>
        <button onClick={() => { setEditing(null); setForm({ name: '', type: 'expense', icon: '📦' }); setIsOpen(true); }} className="btn-primary flex items-center gap-2"><Plus size={18} /> Add Category</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'income', 'expense', 'transfer'].map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filter === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>{t}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(cat => (
          <div key={cat.id} className={cn('finance-card', cat.type === 'income' && 'border-l-4 border-l-income', cat.type === 'expense' && 'border-l-4 border-l-expense', cat.type === 'transfer' && 'border-l-4 border-l-transfer')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.icon}</span>
                <div><h3 className="font-semibold">{cat.name}</h3><span className={cn('text-xs px-2 py-0.5 rounded-full', cat.type === 'income' && 'badge-income', cat.type === 'expense' && 'badge-expense', cat.type === 'transfer' && 'badge-transfer')}>{cat.type}</span></div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditing(cat); setForm({ name: cat.name, type: cat.type, icon: cat.icon || '📦' }); setIsOpen(true); }} className="p-2 hover:bg-accent rounded-lg"><Pencil size={16} /></button>
                <button onClick={() => handleDelete(cat.id!)} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg"><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">No categories found</div>}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Category' : 'Add Category'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium mb-2">Icon</label><input type="text" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="input-field" maxLength={2} /></div>
            <div><label className="block text-sm font-medium mb-2">Name</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" required /></div>
            <div><label className="block text-sm font-medium mb-2">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as Category['type'] })} className="input-field">
                <option value="income">Income</option><option value="expense">Expense</option><option value="transfer">Transfer</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full">{editing ? 'Update' : 'Create'} Category</button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
