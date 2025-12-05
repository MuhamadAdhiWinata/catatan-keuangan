import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Wallet, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Auth() {
  const { user, login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = isLogin 
      ? await login(username, password)
      : await register(username, password);

    setIsLoading(false);

    if (result.success) {
      toast({
        title: isLogin ? 'Selamat datang kembali!' : 'Akun berhasil dibuat',
        description: isLogin ? 'Anda berhasil masuk.' : 'Akun Anda telah berhasil dibuat.',
      });
    } else {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar flex-col justify-center items-center p-12">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-sidebar-primary rounded-2xl flex items-center justify-center mx-auto mb-8">
            <Wallet className="w-10 h-10 text-sidebar-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-sidebar-foreground mb-4">
            FinanceFlow
          </h1>
          <p className="text-lg text-sidebar-foreground/70 mb-8">
            Kelola keuangan Anda dengan pelacakan, analitik, dan wawasan yang powerful.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              'Multi-akun',
              'Analitik arus kas',
              'Prediksi cerdas',
              'Pelacakan pengeluaran',
              'Manajemen transfer',
              'Wawasan keuangan',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sidebar-foreground/60">
                <div className="w-1.5 h-1.5 bg-sidebar-primary rounded-full" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">FinanceFlow</h1>
          </div>

          <div className="finance-card">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground">
                {isLogin ? 'Selamat datang kembali' : 'Buat akun'}
              </h2>
              <p className="text-muted-foreground mt-2">
                {isLogin 
                  ? 'Masukkan kredensial untuk mengakses akun Anda' 
                  : 'Mulai perjalanan keuangan Anda'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nama Pengguna
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field"
                  placeholder="Masukkan nama pengguna"
                  required
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Masukkan kata sandi"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLogin ? 'Masuk' : 'Buat Akun'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Belum punya akun?" : 'Sudah punya akun?'}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-1 text-primary hover:underline font-medium"
                >
                  {isLogin ? 'Daftar' : 'Masuk'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
