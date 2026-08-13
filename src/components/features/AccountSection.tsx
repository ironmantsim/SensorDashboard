import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { SensorCard } from '@/components/features/SensorCard';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  UserCircle2, LogOut, Lock, User, Eye, EyeOff, Loader2,
  Star, Zap, Shield, CheckCircle2, Camera, Trash2,
  ArrowUpRight, ArrowDownLeft, X,
} from 'lucide-react';
import logoImg from '@/assets/logo.png';

interface AccountSectionProps {
  onOpenAuth: () => void;
}

// ── Field (outside to prevent remount) ────────────────────────────────────────
interface FieldProps {
  icon: React.ElementType;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  right?: React.ReactNode;
  autoFocus?: boolean;
}
function Field({ icon: Icon, placeholder, value, onChange, type = 'text', right, autoFocus }: FieldProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-muted/20 hover:border-primary/40 focus-within:border-primary/60 transition-colors">
      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
      />
      {right}
    </div>
  );
}

// ── Plan Feature List ──────────────────────────────────────────────────────────
function PlanFeatures({ plan }: { plan: 'normal' | 'pro' }) {
  const normalFeatures = [
    'All sensors & real-time monitoring',
    'Local recording storage',
    'Up to 10 group shares',
    'One device per account',
  ];
  const proFeatures = [
    'Everything in Normal',
    'Profile picture',
    'Cloud recording sync (any device)',
    'Resume past recordings',
    'View friends\' live sensor data',
    'Unlimited group shares',
  ];
  const features = plan === 'pro' ? proFeatures : normalFeatures;
  return (
    <ul className="space-y-1.5 mt-2">
      {features.map((f, i) => (
        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className={cn('h-3 w-3 flex-shrink-0 mt-0.5', plan === 'pro' ? 'text-amber-500' : 'text-primary')} />
          {f}
        </li>
      ))}
    </ul>
  );
}

export function AccountSection({ onOpenAuth }: AccountSectionProps) {
  const { user, signOut, refreshUser, loading: authLoading } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Edit states
  const [editUsername, setEditUsername] = useState('');
  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveUsername = async () => {
    if (!editUsername.trim() || !user) return;
    const ok = await confirm({
      title: 'Change Username?',
      description: `Your username will be changed to "${editUsername.trim()}".`,
      confirmLabel: 'Change',
    });
    if (!ok) return;
    setSavingUsername(true);
    await supabase.auth.updateUser({ data: { username: editUsername.trim() } });
    await supabase.from('user_profiles').update({ username: editUsername.trim() }).eq('id', user.id);
    await refreshUser();
    toast.success('Username updated!');
    setShowUsernameEdit(false);
    setEditUsername('');
    setSavingUsername(false);
  };

  const handleSavePassword = async () => {
    if (!newPassword || !confirmPassword) return toast.error('Fill in all fields');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    const ok = await confirm({
      title: 'Change Password?',
      description: 'Your account password will be updated.',
      confirmLabel: 'Change',
    });
    if (!ok) return;
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast.error(error.message); } else { toast.success('Password updated!'); setShowPasswordEdit(false); setNewPassword(''); setConfirmPassword(''); }
    setSavingPassword(false);
  };

  const handleChangePlan = async (newPlan: 'normal' | 'pro') => {
    if (!user || user.plan === newPlan) return;
    const ok = await confirm({
      title: newPlan === 'pro' ? 'Upgrade to Pro?' : 'Downgrade to Normal?',
      description: newPlan === 'pro'
        ? 'You\'ll get profile pictures, cloud sync, live sensor sharing, and unlimited group shares. Free!'
        : 'Your account will be limited to one device and 10 group shares. Cloud recordings already shared will remain.',
      confirmLabel: newPlan === 'pro' ? 'Upgrade to Pro' : 'Downgrade to Normal',
      variant: newPlan === 'normal' ? 'warning' : 'default',
    });
    if (!ok) return;
    setSavingPlan(true);
    await supabase.from('user_profiles').update({ plan: newPlan, device_id: newPlan === 'normal' ? getDeviceId() : null }).eq('id', user.id);
    await refreshUser();
    toast.success(newPlan === 'pro' ? 'Upgraded to Pro! Enjoy all features.' : 'Downgraded to Normal plan.');
    setSavingPlan(false);
  };

  const handleDeleteAccount = async () => {
    const ok = await confirm({
      title: 'Delete Account?',
      description: 'This will permanently delete your account and all your data. This action cannot be undone.',
      confirmLabel: 'Delete My Account',
      variant: 'danger',
    });
    if (!ok) return;
    // Second confirmation
    const ok2 = await confirm({
      title: 'Are you absolutely sure?',
      description: 'Type "delete" in the next step to confirm account deletion.',
      confirmLabel: 'Yes, Delete Forever',
      variant: 'danger',
    });
    if (!ok2) return;
    try {
      await supabase.from('user_profiles').delete().eq('id', user!.id);
      await supabase.auth.admin?.deleteUser(user!.id);
    } catch {}
    await signOut();
    toast.success('Account deleted. Goodbye!');
  };

  const handleSignOut = async () => {
    const ok = await confirm({ title: 'Sign Out?', description: 'You will be signed out of your account.', confirmLabel: 'Sign Out' });
    if (!ok) return;
    await signOut();
    toast.success('Signed out');
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    if (user.plan !== 'pro') {
      toast.error('Profile pictures are a Pro feature. Upgrade to Pro to add a profile picture.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    setUploadingAvatar(true);
    const ext = file.name.split('.').pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { toast.error('Failed to upload: ' + uploadError.message); setUploadingAvatar(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('user_profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
    await refreshUser();
    toast.success('Profile picture updated!');
    setUploadingAvatar(false);
  };

  if (authLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <img src={logoImg} alt="Logo" className="w-16 h-16 rounded-2xl shadow-lg shadow-primary/20" />
        <div>
          <p className="text-sm font-medium text-foreground">Sign in to your account</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">Access personal settings, manage your plan, and connect with others.</p>
        </div>
        <Button onClick={onOpenAuth} className="gap-2"><UserCircle2 className="h-4 w-4" /> Sign In / Sign Up</Button>
      </div>
    );
  }

  const isPro = user.plan === 'pro';

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {confirmDialog}
      <h2 className="section-title flex items-center gap-2">
        <UserCircle2 className="h-5 w-5 text-primary" /> Account Settings
      </h2>

      {/* ── Profile Card ── */}
      <div className="glass-card p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className={cn(
                'w-16 h-16 rounded-2xl overflow-hidden border-2 flex items-center justify-center',
                isPro ? 'border-amber-500/40 cursor-pointer hover:opacity-80 transition-opacity' : 'border-primary/30',
              )}
              onClick={() => isPro && avatarInputRef.current?.click()}
              title={isPro ? 'Click to change profile picture' : 'Upgrade to Pro to add profile picture'}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className={cn('w-full h-full flex items-center justify-center', isPro ? 'bg-amber-500/15' : 'bg-primary/15')}>
                  <span className={cn('text-2xl font-bold', isPro ? 'text-amber-500' : 'text-primary')}>
                    {user.username.slice(0, 1).toUpperCase()}
                  </span>
                </div>
              )}
              {isPro && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-2xl">
                  {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                </div>
              )}
            </div>
            {isPro && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center border-2 border-background">
                <Star className="h-2.5 w-2.5 text-white fill-white" />
              </div>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-semibold text-foreground">{user.username}</span>
              <span className={cn(
                'flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                isPro ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' : 'bg-primary/10 text-primary border border-primary/20'
              )}>
                {isPro ? <Star className="h-2.5 w-2.5 fill-amber-500" /> : <Zap className="h-2.5 w-2.5" />}
                {isPro ? 'PRO' : 'NORMAL'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
            {isPro && !user.avatarUrl && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="mt-1.5 text-[11px] text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
              >
                <Camera className="h-3 w-3" /> Add profile picture
              </button>
            )}
            {!isPro && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                <Star className="h-2.5 w-2.5 text-amber-500 inline mr-0.5" />
                Profile pics available on Pro plan
              </p>
            )}
          </div>

          {/* Sign out */}
          <Button variant="outline" size="sm" onClick={handleSignOut} className="border-red-500/30 text-red-500 hover:bg-red-500/10 gap-1.5 flex-shrink-0">
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Button>
        </div>
      </div>

      {/* ── Edit Username ── */}
      <SensorCard title="Username" icon={<User className="h-4 w-4 text-primary" />}>
        {!showUsernameEdit ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground font-medium">{user.username}</span>
            <Button size="sm" variant="outline" onClick={() => { setEditUsername(user.username); setShowUsernameEdit(true); }} className="h-7 text-xs gap-1">
              <User className="h-3 w-3" /> Change
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Field icon={User} placeholder="New username" value={editUsername} onChange={setEditUsername} autoFocus />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveUsername} disabled={savingUsername} className="gap-1.5 h-8">
                {savingUsername ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowUsernameEdit(false)} className="h-8">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </SensorCard>

      {/* ── Change Password ── */}
      <SensorCard title="Password" icon={<Lock className="h-4 w-4 text-primary" />}>
        {!showPasswordEdit ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">••••••••</span>
            <Button size="sm" variant="outline" onClick={() => setShowPasswordEdit(true)} className="h-7 text-xs gap-1">
              <Lock className="h-3 w-3" /> Change
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Field
              icon={Lock}
              placeholder="New password (min 6 chars)"
              value={newPassword}
              onChange={setNewPassword}
              type={showPass ? 'text' : 'password'}
              autoFocus
              right={
                <button onClick={() => setShowPass(p => !p)} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                  {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              }
            />
            <Field
              icon={Lock}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              type={showPass ? 'text' : 'password'}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSavePassword} disabled={savingPassword} className="gap-1.5 h-8">
                {savingPassword ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowPasswordEdit(false); setNewPassword(''); setConfirmPassword(''); }} className="h-8">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </SensorCard>

      {/* ── Plan Management ── */}
      <SensorCard title="Plan" icon={<Shield className="h-4 w-4 text-amber-500" />}>
        <div className="space-y-3">
          {/* Current plan */}
          <div className={cn(
            'p-3 rounded-xl border-2',
            isPro ? 'border-amber-500/40 bg-amber-500/5' : 'border-primary/30 bg-primary/5'
          )}>
            <div className="flex items-center gap-2 mb-1">
              {isPro ? <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> : <Zap className="h-4 w-4 text-primary" />}
              <span className={cn('text-sm font-bold', isPro ? 'text-amber-500' : 'text-primary')}>
                {isPro ? 'Pro Plan' : 'Normal Plan'}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">Free</span>
            </div>
            <PlanFeatures plan={user.plan} />
          </div>

          {/* Switch plan */}
          {isPro ? (
            <button
              onClick={() => handleChangePlan('normal')}
              disabled={savingPlan}
              className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors text-left"
            >
              {savingPlan ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />}
              <div>
                <div className="text-xs font-medium text-foreground">Downgrade to Normal</div>
                <div className="text-[10px] text-muted-foreground">Single device · 10 group shares</div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => handleChangePlan('pro')}
              disabled={savingPlan}
              className="w-full flex items-center gap-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-left"
            >
              {savingPlan ? <Loader2 className="h-4 w-4 animate-spin text-amber-500" /> : <ArrowUpRight className="h-4 w-4 text-amber-500" />}
              <div>
                <div className="text-xs font-bold text-amber-500">Upgrade to Pro — Free!</div>
                <div className="text-[10px] text-muted-foreground">Cloud sync · Live sharing · Unlimited shares</div>
              </div>
            </button>
          )}
        </div>
      </SensorCard>

      {/* ── Danger Zone ── */}
      <SensorCard title="Danger Zone" icon={<Trash2 className="h-4 w-4 text-red-500" />}>
        <p className="text-xs text-muted-foreground mb-3">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteAccount}
          className="border-red-500/40 text-red-500 hover:bg-red-500/10 gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete Account
        </Button>
      </SensorCard>
    </div>
  );
}

function getDeviceId(): string {
  let id = localStorage.getItem('_sensor_device_id');
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('_sensor_device_id', id);
  }
  return id;
}
