import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth, mapSupabaseUser } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  X, Mail, Lock, User, Eye, EyeOff, Loader2, ArrowLeft,
  CheckCircle2, Star, Zap, Shield, Cloud, Smartphone,
} from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { toast } from 'sonner';

// ── Field (defined OUTSIDE to prevent remount) ────────────────────────────────
interface FieldProps {
  icon: React.ElementType;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  right?: React.ReactNode;
  onEnter?: () => void;
  maxLength?: number;
}

function Field({ icon: Icon, placeholder, value, onChange, type = 'text', right, onEnter, maxLength }: FieldProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-muted/20 hover:border-primary/40 focus-within:border-primary/60 transition-colors">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
      />
      {right}
    </div>
  );
}

function OtpField({ value, onChange, onEnter }: { value: string; onChange: (v: string) => void; onEnter?: () => void }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-muted/20 hover:border-primary/40 focus-within:border-primary/60 transition-colors">
      <span className="text-xs font-mono text-muted-foreground">CODE</span>
      <input
        type="text"
        placeholder="4-digit code"
        value={value}
        maxLength={4}
        onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        className="flex-1 bg-transparent text-sm font-mono tracking-widest text-foreground placeholder:text-muted-foreground outline-none text-center"
      />
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
interface PlanCardProps {
  plan: 'normal' | 'pro';
  selected: boolean;
  onSelect: () => void;
}

function PlanCard({ plan, selected, onSelect }: PlanCardProps) {
  const isPro = plan === 'pro';
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex-1 p-3 rounded-xl border-2 text-left transition-all duration-200',
        selected
          ? isPro
            ? 'border-amber-500/60 bg-amber-500/10'
            : 'border-primary/60 bg-primary/10'
          : 'border-border/40 bg-muted/10 hover:border-border/80'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {isPro ? (
          <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Zap className="h-3 w-3 text-primary" />
          </div>
        )}
        <span className={cn('text-xs font-bold', isPro ? 'text-amber-500' : 'text-primary')}>
          {isPro ? 'PRO' : 'NORMAL'}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground font-medium">Free</span>
      </div>
      <ul className="space-y-1">
        {(isPro ? [
          'All sensors & features',
          'Profile picture',
          'Cloud recording sync',
          'Resume past recordings',
          'Live sensor sharing',
          'Unlimited group shares',
        ] : [
          'All sensors & features',
          'Local recording storage',
          'Up to 10 group shares',
          'One device per account',
        ]).map((f, i) => (
          <li key={i} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <CheckCircle2 className={cn('h-2.5 w-2.5 flex-shrink-0', isPro ? 'text-amber-500' : 'text-primary')} />
            {f}
          </li>
        ))}
      </ul>
      {selected && (
        <div className={cn(
          'mt-2 text-center text-[10px] font-semibold',
          isPro ? 'text-amber-500' : 'text-primary'
        )}>
          ✓ Selected
        </div>
      )}
    </button>
  );
}

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = 'signin' | 'signup';
type SignUpStep = 'email' | 'plan' | 'verify';

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { login, refreshUser } = useAuth();
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
  const [suPlan, setSuPlan] = useState<'normal' | 'pro'>('normal');

  if (!open) return null;

  const resetState = () => {
    setSiEmail(''); setSiPassword('');
    setSuStep('email'); setSuEmail(''); setSuOtp('');
    setSuUsername(''); setSuPassword(''); setSuPlan('normal');
    setShowPass(false); setLoading(false);
  };

  const handleClose = () => { resetState(); onClose(); };

  // ── Sign In ──
  const handleSignIn = async () => {
    if (!siEmail || !siPassword) return toast.error('Please fill in all fields');
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPassword });
    if (error) { toast.error(error.message); setLoading(false); return; }

    // Normal plan: device check
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan, device_id')
      .eq('id', data.user.id)
      .single();

    if (profile?.plan === 'normal' && profile?.device_id) {
      const currentDevice = getDeviceId();
      if (profile.device_id !== currentDevice) {
        // Different device — warn and offer pro plan
        toast.error('Normal plan is limited to one device. Switch to Pro for multi-device access.', {
          duration: 6000,
          action: {
            label: 'Switch to Pro',
            onClick: async () => {
              await supabase.from('user_profiles').update({ plan: 'pro', device_id: null }).eq('id', data.user.id);
              login(mapSupabaseUser(data.user));
              await refreshUser();
              toast.success('Switched to Pro plan!');
              handleClose();
            },
          },
        });
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
    }

    // Set / update device_id for normal plan
    if (!profile?.plan || profile.plan === 'normal') {
      await supabase
        .from('user_profiles')
        .update({ device_id: getDeviceId() })
        .eq('id', data.user.id);
    }

    login(mapSupabaseUser(data.user));
    await refreshUser();
    toast.success('Welcome back!');
    handleClose();
  };

  // ── Sign Up step 1: send OTP ──
  const handleSendOtp = async () => {
    if (!suEmail) return toast.error('Please enter your email');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: suEmail, options: { shouldCreateUser: true } });
    if (error) { toast.error(error.message); setLoading(false); return; }
    toast.success('Verification code sent!');
    setSuStep('plan');
    setLoading(false);
  };

  // ── Sign Up step 2: plan select ──
  const handlePlanNext = () => setSuStep('verify');

  // ── Sign Up step 3: verify OTP + set credentials ──
  const handleVerify = async () => {
    if (!suOtp || !suUsername || !suPassword) return toast.error('Please fill in all fields');
    if (suPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: suEmail, token: suOtp, type: 'email',
    });
    if (verifyError) { toast.error(verifyError.message); setLoading(false); return; }

    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password: suPassword,
      data: { username: suUsername },
    });
    if (updateError) { toast.error(updateError.message); setLoading(false); return; }

    const deviceId = suPlan === 'normal' ? getDeviceId() : null;
    await supabase
      .from('user_profiles')
      .update({ username: suUsername, plan: suPlan, device_id: deviceId })
      .eq('id', verifyData.user!.id);

    login(mapSupabaseUser(updateData.user));
    await refreshUser();
    toast.success(`Account created! Welcome aboard on ${suPlan === 'pro' ? 'Pro' : 'Normal'} plan.`);
    handleClose();
  };

  const switchTab = (t: Tab) => { setTab(t); setSuStep('email'); setShowPass(false); };

  const EyeToggle = (
    <button onClick={() => setShowPass(p => !p)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
      {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
    </button>
  );

  const totalSteps = 3;
  const currentStep = suStep === 'email' ? 1 : suStep === 'plan' ? 2 : 3;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && handleClose()}
    >
      <div className="glass-card w-full max-w-sm p-6 relative animate-in fade-in-0 zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
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
            <Field icon={Mail} placeholder="Email address" value={siEmail} onChange={setSiEmail} type="email" onEnter={handleSignIn} />
            <Field icon={Lock} placeholder="Password" value={siPassword} onChange={setSiPassword} type={showPass ? 'text' : 'password'} onEnter={handleSignIn} right={EyeToggle} />
            <Button onClick={handleSignIn} disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 mt-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign In
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No account?{' '}
              <button onClick={() => switchTab('signup')} className="text-primary hover:underline font-medium">Create one</button>
            </p>
          </div>
        )}

        {/* ── SIGN UP ── */}
        {tab === 'signup' && (
          <div className="space-y-3">
            {/* Step indicator */}
            <div className="flex items-center gap-1.5 mb-3">
              {Array.from({ length: totalSteps }, (_, i) => {
                const step = i + 1;
                const done = step < currentStep;
                const active = step === currentStep;
                return (
                  <div key={step} className="flex items-center gap-1.5 flex-1">
                    <div className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
                      done ? 'bg-green-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}>
                      {done ? <CheckCircle2 className="h-3 w-3" /> : step}
                    </div>
                    {step < totalSteps && <div className={cn('flex-1 h-px', done ? 'bg-green-500/50' : 'bg-border/40')} />}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              {currentStep === 1 ? 'Enter your email to get a verification code'
                : currentStep === 2 ? 'Choose your plan'
                : `Verify code sent to ${suEmail}`}
            </p>

            {/* Step 1: Email */}
            {suStep === 'email' && (
              <>
                <Field icon={Mail} placeholder="Email address" value={suEmail} onChange={setSuEmail} type="email" onEnter={handleSendOtp} />
                <Button onClick={handleSendOtp} disabled={loading} className="w-full gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Send Verification Code
                </Button>
              </>
            )}

            {/* Step 2: Plan */}
            {suStep === 'plan' && (
              <>
                <div className="flex gap-2">
                  <PlanCard plan="normal" selected={suPlan === 'normal'} onSelect={() => setSuPlan('normal')} />
                  <PlanCard plan="pro" selected={suPlan === 'pro'} onSelect={() => setSuPlan('pro')} />
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/40">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-muted-foreground">Both plans are <span className="font-medium text-foreground">free</span>. You can upgrade or downgrade anytime in Account settings.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSuStep('email')} className="gap-1">
                    <ArrowLeft className="h-3 w-3" /> Back
                  </Button>
                  <Button onClick={handlePlanNext} className="flex-1 gap-2">
                    Continue with {suPlan === 'pro' ? 'Pro' : 'Normal'}
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Verify + credentials */}
            {suStep === 'verify' && (
              <>
                <button onClick={() => setSuStep('plan')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <OtpField value={suOtp} onChange={setSuOtp} onEnter={handleVerify} />
                <Field icon={User} placeholder="Choose a username" value={suUsername} onChange={setSuUsername} onEnter={handleVerify} />
                <Field icon={Lock} placeholder="Create password (min 6 chars)" value={suPassword} onChange={setSuPassword} type={showPass ? 'text' : 'password'} onEnter={handleVerify} right={EyeToggle} />
                <Button onClick={handleVerify} disabled={loading} className="w-full gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create Account
                </Button>
              </>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Have an account?{' '}
              <button onClick={() => switchTab('signin')} className="text-primary hover:underline font-medium">Sign in</button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Device fingerprint (simple, stable per browser)
function getDeviceId(): string {
  let id = localStorage.getItem('_sensor_device_id');
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('_sensor_device_id', id);
  }
  return id;
}
