import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { exportToJSON, exportToCSV } from '@/lib/analytics';
import { Download, FileJson, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Export() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'json' | 'csv') => {
    if (!user?.id) return;
    setIsExporting(true);
    try {
      const data = format === 'json' ? await exportToJSON(user.id) : await exportToCSV(user.id);
      const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ekspor-keuangan-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Ekspor berhasil', description: `Data Anda telah diekspor sebagai ${format.toUpperCase()}` });
    } catch {
      toast({ title: 'Ekspor gagal', variant: 'destructive' });
    }
    setIsExporting(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-title">Ekspor Data</h1>
      <p className="text-muted-foreground">Unduh data keuangan Anda untuk backup atau digunakan di aplikasi lain.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <button onClick={() => handleExport('json')} disabled={isExporting} className="finance-card hover:border-primary transition-colors text-left group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors"><FileJson className="w-6 h-6 text-primary" /></div>
            <div className="flex-1"><h3 className="font-semibold">Ekspor sebagai JSON</h3><p className="text-sm text-muted-foreground">Data lengkap dengan semua detail</p></div>
            <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </button>

        <button onClick={() => handleExport('csv')} disabled={isExporting} className="finance-card hover:border-primary transition-colors text-left group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors"><FileText className="w-6 h-6 text-primary" /></div>
            <div className="flex-1"><h3 className="font-semibold">Ekspor sebagai CSV</h3><p className="text-sm text-muted-foreground">Format kompatibel spreadsheet</p></div>
            <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </button>
      </div>
    </div>
  );
}
