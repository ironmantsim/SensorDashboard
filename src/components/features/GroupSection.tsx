import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useLiveSharing, useFriendLiveSessions, LiveSensorData } from '@/hooks/useLiveSharing';
import { SensorCard } from '@/components/features/SensorCard';
import { RecordingViewer } from '@/components/features/RecordingViewer';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RecordingRow } from '@/hooks/useRecording';
import {
  Users, Activity, Clock, Database, Download, Trash2,
  RefreshCw, Loader2, UserCircle2, Info, Eye,
  CheckCircle2, UserCheck, UserX, UserPlus, X, Search,
  Star, Wifi, Radio, Filter, Zap, MapPin, Battery,
  BatteryCharging, Signal, AlertCircle, Play,
} from 'lucide-react';

interface Profile {
  id: string;
  username: string | null;
  email: string;
  last_seen: string | null;
  plan?: string;
}

interface FriendReq {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender: Profile | null;
  receiver: Profile | null;
}

interface CloudRecording {
  id: string;
  owner_id: string;
  title: string;
  sensor_groups: string[] | null;
  sample_count: number;
  duration_ms: number;
  created_at: string;
  data?: RecordingRow[];
  owner?: Profile | null;
}

const isOnline = (lastSeen: string | null) =>
  !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 3 * 60 * 1000;

const isLiveRecent = (updatedAt: string) =>
  Date.now() - new Date(updatedAt).getTime() < 15000; // 15 s stale threshold

const formatDuration = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const initials = (name: string | null | undefined, email: string) =>
  ((name || email).slice(0, 1).toUpperCase());

function num(v: number | null | undefined, dp = 2) {
  if (v === null || v === undefined) return '—';
  return Number(v).toFixed(dp);
}

// ── Live Sensor Mini-Card ──────────────────────────────────────────────────
function LiveSensorCard({ data, updatedAt, ownerName }: {
  data: LiveSensorData;
  updatedAt: string;
  ownerName: string;
}) {
  const stale = !isLiveRecent(updatedAt);
  return (
    <div className={cn(
      'p-3 rounded-xl border transition-colors',
      stale ? 'border-border/30 bg-muted/10 opacity-60' : 'border-emerald-500/30 bg-emerald-500/5',
    )}>
      <div className="flex items-center gap-2 mb-2.5">
        <div className="relative flex-shrink-0">
          <div className={cn('w-2 h-2 rounded-full', stale ? 'bg-muted-foreground/40' : 'bg-emerald-500 animate-pulse')} />
        </div>
        <span className="text-xs font-semibold text-foreground">{ownerName}</span>
        {stale && <span className="ml-auto text-[10px] text-muted-foreground">Stale</span>}
        {!stale && <span className="ml-auto text-[10px] text-emerald-500">Live · updated {Math.round((Date.now() - new Date(updatedAt).getTime()) / 1000)}s ago</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {/* Accelerometer */}
        <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <div className="flex items-center gap-1 mb-1">
            <Zap className="h-2.5 w-2.5 text-violet-400" />
            <span className="text-[10px] text-violet-400 font-medium">Accel (m/s²)</span>
          </div>
          <div className="text-[11px] font-mono text-foreground space-y-0.5">
            <div>X: {num(data.accel_x)}</div>
            <div>Y: {num(data.accel_y)}</div>
            <div>Z: {num(data.accel_z)}</div>
          </div>
        </div>
        {/* GPS */}
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-1 mb-1">
            <MapPin className="h-2.5 w-2.5 text-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-medium">GPS</span>
          </div>
          <div className="text-[11px] font-mono text-foreground space-y-0.5">
            <div>Lat: {num(data.gps_lat, 4)}</div>
            <div>Lng: {num(data.gps_lng, 4)}</div>
          </div>
        </div>
        {/* Battery */}
        <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <div className="flex items-center gap-1 mb-1">
            <Battery className="h-2.5 w-2.5 text-yellow-400" />
            <span className="text-[10px] text-yellow-400 font-medium">Battery</span>
          </div>
          <div className="text-[11px] font-mono text-foreground">
            {data.battery_level !== null ? `${data.battery_level}%` : '—'}
            {data.battery_charging && <span className="ml-1 text-lime-400">⚡</span>}
          </div>
        </div>
        {/* Network */}
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <div className="flex items-center gap-1 mb-1">
            <Signal className="h-2.5 w-2.5 text-cyan-400" />
            <span className="text-[10px] text-cyan-400 font-medium">Network</span>
          </div>
          <div className="text-[11px] font-mono text-foreground space-y-0.5">
            <div>{data.network_effective ?? '—'}</div>
            <div>{data.network_downlink !== null ? `${data.network_downlink} Mbps` : '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Recording card ───────────────────────────────────────────────────────
interface RecCardProps {
  rec: CloudRecording;
  onView: () => void;
  onDownload: () => void;
  ownerName?: string;
  canDelete?: boolean;
  onDelete?: () => void;
  /** Pass handler to show Resume button (Pro users only) */
  onResume?: () => void;
  isPro?: boolean;
}

function RecCard({ rec, onView, onDownload, ownerName, canDelete, onDelete, onResume, isPro }: RecCardProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Activity className="h-4 w-4 text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{rec.title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
          {ownerName && <span className="text-foreground/70">{ownerName}</span>}
          <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{formatDuration(rec.duration_ms)}</span>
          <span className="flex items-center gap-1"><Database className="h-2.5 w-2.5" />{rec.sample_count} samples</span>
        </div>
        {rec.sensor_groups && rec.sensor_groups.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {rec.sensor_groups.slice(0, 3).map(g => (
              <span key={g} className="text-[10px] bg-violet-500/10 border border-violet-500/20 rounded-full px-1.5 py-0.5 text-violet-400">{g}</span>
            ))}
            {rec.sensor_groups.length > 3 && <span className="text-[10px] text-muted-foreground">+{rec.sensor_groups.length - 3}</span>}
          </div>
        )}
        <div className="text-[10px] text-muted-foreground/60 mt-1">{formatDate(rec.created_at)}</div>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0 mt-0.5">
        <button onClick={onView} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="View">
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDownload} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors" title="Download JSON">
          <Download className="h-3.5 w-3.5" />
        </button>
        {canDelete && onDelete && (
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {onResume && isPro && (
          <button onClick={onResume} className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-colors" title="Resume recording (Pro)">
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        {onResume && !isPro && (
          <button onClick={onResume} className="p-1.5 rounded-lg text-amber-500/50 cursor-default" title="Resume — Pro plan required">
            <Star className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────
export function GroupSection({
  onOpenAuth,
  onResumeRecording,
}: {
  onOpenAuth: () => void;
  onResumeRecording?: (rows: RecordingRow[], durationMs: number, title: string) => void;
}) {
  const { user } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();

  // Live sharing (Pro)
  const { isSharing, setIsSharing, stopSharing, pushError } = useLiveSharing();

  const [requests, setRequests] = useState<FriendReq[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});
  const [myRecordings, setMyRecordings] = useState<CloudRecording[]>([]);
  const [friendRecordings, setFriendRecordings] = useState<CloudRecording[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | 'all'>('all');

  const [viewRec, setViewRec] = useState<CloudRecording | null>(null);
  const [viewRecData, setViewRecData] = useState<RecordingRow[]>([]);
  const [loadingRecData, setLoadingRecData] = useState(false);

  const friends = requests
    .filter(r => r.status === 'accepted')
    .map(r => r.sender_id === user?.id ? r.receiver : r.sender)
    .filter(Boolean) as Profile[];

  const friendIds = friends.map(f => f.id);

  // Live sessions for friends
  const { sessions: liveSessions } = useFriendLiveSessions(friendIds);

  const loadAll = async () => {
    if (!user) return;
    setLoadingData(true);

    const { data: reqData } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    const reqs = reqData || [];
    const pIds = [...new Set([
      ...reqs.map((r: any) => r.sender_id),
      ...reqs.map((r: any) => r.receiver_id),
    ])].filter(id => id !== user.id);

    let pMap: Record<string, Profile> = {};
    if (pIds.length > 0) {
      const { data: pData } = await supabase
        .from('user_profiles')
        .select('id, username, email, last_seen, plan')
        .in('id', pIds);
      pMap = Object.fromEntries((pData || []).map((p: Profile) => [p.id, p]));
    }
    setProfileMap(pMap);

    const enriched: FriendReq[] = reqs.map((r: any) => ({
      ...r,
      sender: pMap[r.sender_id] || null,
      receiver: pMap[r.receiver_id] || null,
    }));
    setRequests(enriched);

    const { data: myRecs } = await supabase
      .from('shared_recordings')
      .select('id, owner_id, title, sensor_groups, sample_count, duration_ms, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    setMyRecordings(myRecs || []);

    const accepted = enriched.filter(r => r.status === 'accepted');
    const fIds = accepted.map(r => r.sender_id === user.id ? r.receiver_id : r.sender_id);
    if (fIds.length > 0) {
      const { data: frRecs } = await supabase
        .from('shared_recordings')
        .select('id, owner_id, title, sensor_groups, sample_count, duration_ms, created_at')
        .in('owner_id', fIds)
        .order('created_at', { ascending: false });
      setFriendRecordings((frRecs || []).map((r: CloudRecording) => ({
        ...r,
        owner: pMap[r.owner_id] || null,
      })));
    } else {
      setFriendRecordings([]);
    }
    setLoadingData(false);
  };

  useEffect(() => {
    if (!user) return;
    loadAll();
    const interval = setInterval(loadAll, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
    toast.success('Refreshed');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('id, username, email, last_seen, plan')
      .ilike('username', `%${searchQuery.trim()}%`)
      .neq('id', user.id)
      .limit(8);
    setSearchResults(data || []);
  };

  const sendRequest = async (receiverId: string) => {
    const { error } = await supabase.from('friend_requests').insert({ sender_id: user!.id, receiver_id: receiverId });
    if (error) { toast.error('Failed to send request'); return; }
    toast.success('Data sharing request sent!');
    loadAll();
  };

  const acceptRequest = async (requestId: string) => {
    const ok = await confirm({ title: 'Accept Request?', description: "You'll be able to see each other's shared recordings.", confirmLabel: 'Accept' });
    if (!ok) return;
    await supabase.from('friend_requests').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', requestId);
    toast.success('Connected!');
    loadAll();
  };

  const rejectRequest = async (requestId: string) => {
    const ok = await confirm({ title: 'Reject Request?', description: 'This request will be declined and removed.', confirmLabel: 'Reject', variant: 'warning' });
    if (!ok) return;
    await supabase.from('friend_requests').delete().eq('id', requestId);
    loadAll();
    toast.success('Request rejected');
  };

  const removeRequest = async (requestId: string) => {
    await supabase.from('friend_requests').delete().eq('id', requestId);
    loadAll();
  };

  const deleteMyRecording = async (recordingId: string, title: string) => {
    const ok = await confirm({ title: 'Remove from Group?', description: `"${title}" will be removed from the group.`, confirmLabel: 'Remove', variant: 'danger' });
    if (!ok) return;
    await supabase.from('shared_recordings').delete().eq('id', recordingId);
    toast.success('Recording removed from group');
    loadAll();
  };

  const openRecording = async (rec: CloudRecording) => {
    setViewRec(rec);
    if (rec.data) { setViewRecData(rec.data); return; }
    setLoadingRecData(true);
    const { data } = await supabase.from('shared_recordings').select('data').eq('id', rec.id).single();
    const rows = data?.data || [];
    setViewRecData(rows);
    setViewRec({ ...rec, data: rows });
    setLoadingRecData(false);
  };

  const downloadRecording = async (rec: CloudRecording) => {
    let rows = rec.data;
    if (!rows) {
      const { data } = await supabase.from('shared_recordings').select('data').eq('id', rec.id).single();
      rows = data?.data || [];
    }
    const blob = new Blob([JSON.stringify({ title: rec.title, recorded_at: rec.created_at, samples: rows }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${rec.title.replace(/\s+/g, '_')}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const getReqStatus = (targetId: string) => {
    const req = requests.find(r =>
      (r.sender_id === user!.id && r.receiver_id === targetId) ||
      (r.sender_id === targetId && r.receiver_id === user!.id)
    );
    if (!req) return 'none' as const;
    if (req.status === 'accepted') return 'accepted' as const;
    if (req.sender_id === user!.id) return 'sent' as const;
    return 'received' as const;
  };

  const handleResumeFriendRecording = async (recording: CloudRecording) => {
    if (user?.plan !== 'pro') {
      toast.info('Resume is a Pro plan feature', { description: 'Upgrade to Pro to resume friend recordings.' });
      return;
    }
    const ok = await confirm({
      title: 'Resume Friend Recording?',
      description: `A new recording will start from where "${recording.title}" left off. New sensor data will be appended.`,
      confirmLabel: 'Resume',
    });
    if (!ok) return;
    let rows = recording.data;
    if (!rows) {
      const { data } = await supabase.from('shared_recordings').select('data').eq('id', recording.id).single();
      rows = data?.data || [];
    }
    onResumeRecording?.(rows as RecordingRow[], recording.duration_ms, `${recording.title} (resumed)`);
    toast.success('Navigating to Recording — new samples will be appended');
  };

  const incoming = requests.filter(r => r.status === 'pending' && r.receiver_id === user?.id);
  const outgoing = requests.filter(r => r.status === 'pending' && r.sender_id === user?.id);
  const filteredFriendRecs = selectedFriend === 'all'
    ? friendRecordings
    : friendRecordings.filter(r => r.owner_id === selectedFriend);

  const handleSharingToggle = async () => {
    if (isSharing) {
      const ok = await confirm({
        title: 'Stop Live Sharing?',
        description: 'Your friends will no longer see your live sensor data.',
        confirmLabel: 'Stop Sharing',
        variant: 'warning',
      });
      if (!ok) return;
      await stopSharing();
      toast.success('Live sharing stopped');
    } else {
      setIsSharing(true);
      toast.success('Live sharing started — friends can now see your sensor data');
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center">
          <Users className="h-8 w-8 text-violet-500/40" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Sign in to use Group features</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">Connect with friends and share sensor recordings across devices.</p>
        </div>
        <Button onClick={onOpenAuth} className="gap-2">
          <UserCircle2 className="h-4 w-4" /> Sign In / Sign Up
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {confirmDialog}

      {viewRec && (
        loadingRecData ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <RecordingViewer
            recording={{
              id: viewRec.id,
              title: viewRec.title,
              rows: viewRecData,
              sampleCount: viewRec.sample_count,
              durationMs: viewRec.duration_ms,
              createdAt: viewRec.created_at,
              activeGroups: viewRec.sensor_groups || [],
            }}
            ownerName={viewRec.owner?.username || undefined}
            onClose={() => { setViewRec(null); setViewRecData([]); }}
            onDownload={() => downloadRecording(viewRec)}
          />
        )
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-500" /> Group
        </h2>
        <button onClick={handleRefresh} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* ── Live Sharing (Pro only) ── */}
      <SensorCard
        title="Live Sensor Sharing"
        icon={<Radio className="h-4 w-4 text-emerald-400" />}
      >
        {user.plan !== 'pro' ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <Star className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Pro feature</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upgrade to Pro to share live accelerometer, GPS, battery, and network data with your connected friends in real time.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-muted/10">
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors', isSharing ? 'border-emerald-500/50 bg-emerald-500/15' : 'border-border/40 bg-muted/40')}>
                <Radio className={cn('h-5 w-5', isSharing ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground/40')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {isSharing ? 'Broadcasting live data' : 'Live sharing is off'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {isSharing
                    ? 'Accel · GPS · Battery · Network — pushed every 5 s'
                    : 'Friends will see your sensor readings in real time'}
                </div>
              </div>
              <button
                onClick={handleSharingToggle}
                className={cn(
                  'flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 border',
                  isSharing ? 'bg-emerald-500 border-emerald-600' : 'bg-muted-foreground/25 border-border/40',
                )}
              >
                <div className={cn('w-4 h-4 rounded-full bg-white shadow mx-1 mt-0.5 transition-transform duration-200', isSharing ? 'translate-x-4' : 'translate-x-0')} />
              </button>
            </div>
            {isSharing && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                Sharing Accelerometer, GPS, Battery, and Network. Connected friends can see this in their Group page under "Live Now".
              </div>
            )}
            {pushError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                Push error: {pushError}
              </div>
            )}
          </div>
        )}
      </SensorCard>

      {/* ── Live Now (friends broadcasting) ── */}
      {liveSessions.length > 0 && (
        <SensorCard
          title={`Live Now (${liveSessions.length})`}
          icon={<Radio className="h-4 w-4 text-emerald-400 animate-pulse" />}
          live
        >
          <div className="space-y-3">
            {liveSessions.map(session => {
              const owner = profileMap[session.owner_id];
              const ownerName = owner?.username || owner?.email || 'Unknown';
              return (
                <LiveSensorCard
                  key={session.owner_id}
                  data={session.sensor_data as LiveSensorData}
                  updatedAt={session.updated_at}
                  ownerName={ownerName}
                />
              );
            })}
          </div>
        </SensorCard>
      )}

      {/* ── Find Users ── */}
      <SensorCard title="Find Users" icon={<Search className="h-4 w-4 text-cyan-400" />}>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 bg-muted/20 focus-within:border-primary/50 transition-colors min-w-0">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by username…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-muted-foreground hover:text-foreground flex-shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button size="sm" onClick={handleSearch} className="gap-1.5 w-full sm:w-auto flex-shrink-0">
            <Search className="h-3.5 w-3.5" /> Search
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {searchResults.map(profile => {
              const status = getReqStatus(profile.id);
              const online = isOnline(profile.last_seen);
              return (
                <div key={profile.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 border border-border/40">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{initials(profile.username, profile.email)}</span>
                    </div>
                    {online && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="text-sm font-medium text-foreground truncate">{profile.username || profile.email}</div>
                      {profile.plan === 'pro' && <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />}
                    </div>
                    <div className={cn('text-[11px]', online ? 'text-green-500' : 'text-muted-foreground')}>
                      {online ? '● Online' : '○ Offline'}
                    </div>
                  </div>
                  {status === 'none' && (
                    <Button size="sm" variant="outline" onClick={() => sendRequest(profile.id)} className="gap-1 text-xs h-7 flex-shrink-0">
                      <UserPlus className="h-3 w-3" /> Request
                    </Button>
                  )}
                  {status === 'sent' && <span className="text-xs text-muted-foreground px-2 py-1 rounded-lg bg-muted/40 border border-border/40 flex-shrink-0">Pending</span>}
                  {status === 'received' && <span className="text-xs text-amber-500 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 flex-shrink-0">Awaiting you</span>}
                  {status === 'accepted' && (
                    <span className="flex items-center gap-1 text-xs text-green-500 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20 flex-shrink-0">
                      <CheckCircle2 className="h-3 w-3" /> Connected
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {searchQuery && searchResults.length === 0 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">No users found for "{searchQuery}"</p>
        )}
      </SensorCard>

      {/* ── Sharing Requests ── */}
      {(incoming.length > 0 || outgoing.length > 0) && (
        <SensorCard
          title={`Sharing Requests${incoming.length > 0 ? ` · ${incoming.length} new` : ''}`}
          icon={<UserPlus className="h-4 w-4 text-amber-400" />}
        >
          {incoming.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Incoming</p>
              {incoming.map(req => {
                const sender = req.sender;
                return (
                  <div key={req.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-amber-500">{initials(sender?.username, sender?.email || '?')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{sender?.username || sender?.email}</div>
                      <div className="text-[11px] text-muted-foreground">Wants to share sensor data</div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button size="sm" onClick={() => acceptRequest(req.id)} className="h-7 gap-1 text-xs bg-green-500 hover:bg-green-600 text-white">
                        <UserCheck className="h-3 w-3" /> Accept
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => rejectRequest(req.id)} className="h-7 text-muted-foreground hover:text-red-500">
                        <UserX className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {outgoing.length > 0 && (
            <div className={cn('space-y-2', incoming.length > 0 && 'mt-4')}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Outgoing</p>
              {outgoing.map(req => {
                const receiver = req.receiver;
                return (
                  <div key={req.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/20 border border-border/40">
                    <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">{initials(receiver?.username, receiver?.email || '?')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{receiver?.username || receiver?.email}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Awaiting response</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeRequest(req.id)} className="h-7 text-muted-foreground hover:text-red-500 text-xs flex-shrink-0">Cancel</Button>
                  </div>
                );
              })}
            </div>
          )}
        </SensorCard>
      )}

      {/* ── Connected Members ── */}
      {friends.length > 0 && (
        <SensorCard title="Connected Members" icon={<Radio className="h-4 w-4 text-emerald-400" />}>
          <div className="space-y-2">
            {friends.map(friend => {
              if (!friend) return null;
              const online = isOnline(friend.last_seen);
              const theirRecs = friendRecordings.filter(r => r.owner_id === friend.id);
              const isLive = liveSessions.some(s => s.owner_id === friend.id);
              return (
                <div key={friend.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-muted/10">
                  <div className="relative flex-shrink-0">
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center border-2', online ? 'bg-green-500/15 border-green-500/30' : 'bg-muted/40 border-border/40')}>
                      <span className={cn('text-xs font-bold', online ? 'text-green-500' : 'text-muted-foreground')}>{initials(friend.username, friend.email)}</span>
                    </div>
                    <div className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background', online ? 'bg-green-500' : 'bg-muted-foreground/30')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="text-sm font-semibold text-foreground truncate">{friend.username || friend.email}</div>
                      {friend.plan === 'pro' && <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />}
                      {isLive && (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-1.5 py-0.5 flex-shrink-0">
                          <Radio className="h-2 w-2" />LIVE
                        </span>
                      )}
                    </div>
                    <div className={cn('text-[11px]', online ? 'text-green-500' : 'text-muted-foreground')}>
                      {online ? '● Device Online' : `○ Last seen ${friend.last_seen ? formatDate(friend.last_seen) : 'never'}`}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFriend(prev => prev === friend.id ? 'all' : friend.id)}
                    className={cn(
                      'text-[10px] px-2 py-1 rounded-lg border transition-colors flex-shrink-0',
                      selectedFriend === friend.id
                        ? 'bg-primary/15 border-primary/30 text-primary'
                        : 'bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Filter className="h-2.5 w-2.5 inline mr-0.5" />{theirRecs.length}
                  </button>
                </div>
              );
            })}
          </div>
          {friends.length > 1 && (
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setSelectedFriend('all')}
                className={cn(
                  'text-xs px-3 py-1 rounded-full border transition-colors',
                  selectedFriend === 'all'
                    ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                    : 'bg-muted/20 border-border/40 text-muted-foreground hover:text-foreground'
                )}
              >
                All Members ({friendRecordings.length})
              </button>
            </div>
          )}
        </SensorCard>
      )}

      {/* ── Group Recordings ── */}
      <SensorCard
        title={`Group Recordings${filteredFriendRecs.length > 0 ? ` (${filteredFriendRecs.length})` : ''}`}
        icon={<Activity className="h-4 w-4 text-violet-400" />}
      >
        {loadingData ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredFriendRecs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">
              {friends.length === 0
                ? 'Connect with users to see their recordings here.'
                : 'No recordings shared yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFriendRecs.map(rec => (
              <RecCard
                key={rec.id}
                rec={rec}
                ownerName={rec.owner?.username || rec.owner?.email || 'Unknown'}
                onView={() => openRecording(rec)}
                onDownload={() => downloadRecording(rec)}
                onResume={onResumeRecording ? () => handleResumeFriendRecording(rec) : undefined}
                isPro={user?.plan === 'pro'}
              />
            ))}
          </div>
        )}
      </SensorCard>

      {/* ── My Shared Recordings ── */}
      <SensorCard
        title={`My Shared Recordings (${myRecordings.length})`}
        icon={<Wifi className="h-4 w-4 text-blue-400" />}
      >
        {myRecordings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-5 text-center">
            <Wifi className="h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No shared recordings yet</p>
            <p className="text-xs text-muted-foreground/70">
              Go to <span className="font-medium text-foreground">Recording</span> → save a session →{' '}
              <span className="font-medium text-foreground">Share to Group</span>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {myRecordings.map(rec => (
              <RecCard
                key={rec.id}
                rec={rec}
                onView={() => openRecording(rec)}
                onDownload={() => downloadRecording(rec)}
                canDelete
                onDelete={() => deleteMyRecording(rec.id, rec.title)}
              />
            ))}
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3 w-3 flex-shrink-0" />
            {user.plan === 'normal'
              ? `Normal plan: ${myRecordings.length}/10 recordings shared. Upgrade to Pro for unlimited.`
              : 'Pro plan: Unlimited recordings shared.'}
          </p>
        </div>
      </SensorCard>
    </div>
  );
}
