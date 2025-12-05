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
      a.download = `finance-export-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Export successful', description: `Your data has been exported as ${format.toUpperCase()}` });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
    setIsExporting(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-title">Export Data</h1>
      <p className="text-muted-foreground">Download your financial data for backup or use in other applications.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <button onClick={() => handleExport('json')} disabled={isExporting} className="finance-card hover:border-primary transition-colors text-left group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors"><FileJson className="w-6 h-6 text-primary" /></div>
            <div className="flex-1"><h3 className="font-semibold">Export as JSON</h3><p className="text-sm text-muted-foreground">Complete data with all details</p></div>
            <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </button>

        <button onClick={() => handleExport('csv')} disabled={isExporting} className="finance-card hover:border-primary transition-colors text-left group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors"><FileText className="w-6 h-6 text-primary" /></div>
            <div className="flex-1"><h3 className="font-semibold">Export as CSV</h3><p className="text-sm text-muted-foreground">Spreadsheet compatible format</p></div>
            <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </button>
      </div>
    </div>
  );
}
