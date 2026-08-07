import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth, mapSupabaseUser } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { toast } from 'sonner';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = 'signin' | 'signup';
type SignUpStep = 'email' | 'verify';

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { login } = useAuth();
  const [tab, setTab] = useState<Tab>('signin');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Sign-in
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');

  // Sign-up
  const [suStep, setSuStep] = useState<SignUpStep>('email');
  const [suEmail, setSuEmail] = useState('');
  const [suOtp, setSuOtp] = useState('');
  const [suUsername, setSuUsername] = useState('');
  const [suPassword, setSuPassword] = useState('');

  if (!open) return null;

  const resetState = () => {
    setSiEmail(''); setSiPassword('');
    setSuStep('email'); setSuEmail(''); setSuOtp('');
    setSuUsername(''); setSuPassword('');
    setShowPass(false); setLoading(false);
  };

  const handleClose = () => { resetState(); onClose(); };

  // ── Sign In ──────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!siEmail || !siPassword) return toast.error('Please fill in all fields');
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPassword });
    if (error) { toast.error(error.message); setLoading(false); return; }
    login(mapSupabaseUser(data.user));
    toast.success('Welcome back!');
    handleClose();
  };

  // ── Sign Up step 1: send OTP ─────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!suEmail) return toast.error('Please enter your email');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: suEmail, options: { shouldCreateUser: true } });
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success('Verification code sent!');
    setSuStep('verify');
    setLoading(false);
  };

  // ── Sign Up step 2: verify OTP + set credentials ─────────────────────
  const handleVerify = async () => {
    if (!suOtp || !suUsername || !suPassword) return toast.error('Please fill in all fields');
    if (suPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);

    // Verify OTP
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: suEmail, token: suOtp, type: 'email',
    });
    if (verifyError) { toast.error(verifyError.message); setLoading(false); return; }

    // Set password + username metadata
    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password: suPassword,
      data: { username: suUsername },
    });
    if (updateError) { toast.error(updateError.message); setLoading(false); return; }

    // Sync username to user_profiles
    await supabase
      .from('user_profiles')
      .update({ username: suUsername })
      .eq('id', verifyData.user!.id);

    login(mapSupabaseUser(updateData.user));
    toast.success('Account created! Welcome aboard.');
    handleClose();
  };

  const switchTab = (t: Tab) => { setTab(t); setSuStep('email'); setShowPass(false); };

  // ── Field wrapper ─────────────────────────────────────────────────────
  const Field = ({
    icon: Icon, placeholder, value, onChange, type = 'text', right,
  }: {
    icon: React.ElementType; placeholder: string; value: string;
    onChange: (v: string) => void; type?: string; right?: React.ReactNode;
  }) => (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-muted/20 hover:border-primary/40 focus-within:border-primary/60 transition-colors">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            if (tab === 'signin') handleSignIn();
            else if (suStep === 'email') handleSendOtp();
            else handleVerify();
          }
        }}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
      />
      {right}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      <div className="glass-card w-full max-w-sm p-6 relative animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Logo */}
        <div className="flex flex-col items-center mb-5">
          <img src={logoImg} alt="Logo" className="w-12 h-12 rounded-xl shadow-lg shadow-primary/20 mb-2" />
          <h2 className="text-base font-semibold text-foreground">Sensor Dashboard</h2>
          <p className="text-xs text-muted-foreground">Sign in to unlock data sharing</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-muted/30 p-1 mb-5">
          {(['signin', 'signup'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={cn(
                'flex-1 py-1.5 text-sm font-medium rounded-lg transition-all',
                tab === t
                  ? 'bg-background/80 text-foreground shadow-sm border border-border/40'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* ── SIGN IN ── */}
        {tab === 'signin' && (
          <div className="space-y-3">
            <Field icon={Mail} placeholder="Email address" value={siEmail} onChange={setSiEmail} type="email" />
            <Field
              icon={Lock}
              placeholder="Password"
              value={siPassword}
              onChange={setSiPassword}
              type={showPass ? 'text' : 'password'}
              right={
                <button onClick={() => setShowPass(p => !p)} className="text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              }
            />
            <Button
              onClick={handleSignIn}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 mt-1"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign In
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No account?{' '}
              <button onClick={() => switchTab('signup')} className="text-primary hover:underline font-medium">
                Create one
              </button>
            </p>
          </div>
        )}

        {/* ── SIGN UP ── */}
        {tab === 'signup' && (
          <div className="space-y-3">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {[1, 2].map(step => {
                const current = suStep === 'email' ? 1 : 2;
                return (
                  <div key={step} className="flex items-center gap-2 flex-1">
                    <div className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all',
                      step < current ? 'bg-green-500 text-white'
                        : step === current ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {step < current ? <CheckCircle2 className="h-3 w-3" /> : step}
                    </div>
                    <span className={cn(
                      'text-[11px] flex-1 truncate',
                      step === current ? 'text-foreground font-medium' : 'text-muted-foreground'
                    )}>
                      {step === 1 ? 'Enter email' : 'Set credentials'}
                    </span>
                    {step < 2 && <div className="w-4 h-px bg-border flex-shrink-0" />}
                  </div>
                );
              })}
            </div>

            {suStep === 'email' ? (
              <>
                <Field icon={Mail} placeholder="Email address" value={suEmail} onChange={setSuEmail} type="email" />
                <Button onClick={handleSendOtp} disabled={loading} className="w-full gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Send Verification Code
                </Button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setSuStep('email')}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <p className="text-xs text-muted-foreground -mt-1 mb-2">
                  Code sent to <span className="text-foreground font-medium">{suEmail}</span>
                </p>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-muted/20 focus-within:border-primary/60 transition-colors">
                  <span className="text-xs font-mono text-muted-foreground">CODE</span>
                  <input
                    type="text"
                    placeholder="4-digit code"
                    value={suOtp}
                    maxLength={4}
                    onChange={e => setSuOtp(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 bg-transparent text-sm font-mono tracking-widest text-foreground placeholder:text-muted-foreground outline-none text-center"
                  />
                </div>
                <Field icon={User} placeholder="Choose a username" value={suUsername} onChange={setSuUsername} />
                <Field
                  icon={Lock}
                  placeholder="Create password (min 6 chars)"
                  value={suPassword}
                  onChange={setSuPassword}
                  type={showPass ? 'text' : 'password'}
                  right={
                    <button onClick={() => setShowPass(p => !p)} className="text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  }
                />
                <Button onClick={handleVerify} disabled={loading} className="w-full gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create Account
                </Button>
              </>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Have an account?{' '}
              <button onClick={() => switchTab('signin')} className="text-primary hover:underline font-medium">
                Sign in
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
