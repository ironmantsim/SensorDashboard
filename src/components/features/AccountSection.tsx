import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { SensorCard } from '@/components/features/SensorCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  UserCircle2, LogOut, Search, UserPlus, UserCheck, UserX,
  Clock, Download, Trash2, RefreshCw, Users, Cloud,
  Activity, Info, CheckCircle2, X, Loader2,
} from 'lucide-react';

interface Profile {
  id: string;
  username: string | null;
  email: string;
  last_seen: string | null;
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
  owner_id?: string;
  title: string;
  sensor_groups: string[] | null;
  sample_count: number;
  duration_ms: number;
  created_at: string;
  owner?: Profile | null;
}

const isOnline = (lastSeen: string | null) =>
  !!lastSeen && Date.now() - new Date(lastSeen).getTime() < 3 * 60 * 1000;

const formatDuration = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

const initials = (name: string | null | undefined, email: string) =>
  ((name || email).slice(0, 1).toUpperCase());

interface AccountSectionProps {
  onOpenAuth: () => void;
}

export function AccountSection({ onOpenAuth }: AccountSectionProps) {
  const { user, signOut, loading: authLoading } = useAuth();

  const [requests, setRequests] = useState<FriendReq[]>([]);
  const [myRecordings, setMyRecordings] = useState<CloudRecording[]>([]);
  const [friendRecordings, setFriendRecordings] = useState<CloudRecording[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = async () => {
    if (!user) return;
    setLoadingData(true);

    const { data: reqData } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    const reqs = reqData || [];
    const profileIds = [...new Set([
      ...reqs.map((r: { sender_id: string }) => r.sender_id),
      ...reqs.map((r: { receiver_id: string }) => r.receiver_id),
    ])].filter((id) => id !== user.id);

    let profileMap: Record<string, Profile> = {};
    if (profileIds.length > 0) {
      const { data: pData } = await supabase
        .from('user_profiles')
        .select('id, username, email, last_seen')
        .in('id', profileIds);
      profileMap = Object.fromEntries((pData || []).map((p: Profile) => [p.id, p]));
    }

    const enriched: FriendReq[] = reqs.map((r: { id: string; sender_id: string; receiver_id: string; status: string; created_at: string }) => ({
      ...r,
      sender: profileMap[r.sender_id] || null,
      receiver: profileMap[r.receiver_id] || null,
    }));
    setRequests(enriched);

    const { data: myRecs } = await supabase
      .from('shared_recordings')
      .select('id, title, sensor_groups, sample_count, duration_ms, created_at')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    setMyRecordings(myRecs || []);

    const friendIds = enriched
      .filter(r => r.status === 'accepted')
      .map(r => r.sender_id === user.id ? r.receiver_id : r.sender_id);

    if (friendIds.length > 0) {
      const { data: frRecs } = await supabase
        .from('shared_recordings')
        .select('id, owner_id, title, sensor_groups, sample_count, duration_ms, created_at')
        .in('owner_id', friendIds)
        .order('created_at', { ascending: false });
      setFriendRecordings((frRecs || []).map((r: CloudRecording) => ({
        ...r,
        owner: profileMap[r.owner_id || ''] || null,
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
      .select('id, username, email, last_seen')
      .ilike('username', `%${searchQuery.trim()}%`)
      .neq('id', user.id)
      .limit(8);
    setSearchResults(data || []);
  };

  const sendRequest = async (receiverId: string) => {
    const { error } = await supabase
      .from('friend_requests')
      .insert({ sender_id: user!.id, receiver_id: receiverId });
    if (error) { toast.error('Failed to send request'); return; }
    toast.success('Data sharing request sent!');
    loadAll();
  };

  const acceptRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) { toast.error('Failed to accept'); return; }
    toast.success('Connected! You can now share sensor data.');
    loadAll();
  };

  const removeRequest = async (requestId: string) => {
    await supabase.from('friend_requests').delete().eq('id', requestId);
    loadAll();
  };

  const deleteMyRecording = async (recordingId: string) => {
    const { error } = await supabase.from('shared_recordings').delete().eq('id', recordingId);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Recording removed from cloud');
    loadAll();
  };

  const downloadRecording = async (recordingId: string, title: string) => {
    const { data } = await supabase
      .from('shared_recordings').select('data').eq('id', recordingId).single();
    if (!data) { toast.error('Failed to download'); return; }
    const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${title.replace(/\s+/g, '_')}.json`;
    a.click(); URL.revokeObjectURL(url);
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

  const friends = requests
    .filter(r => r.status === 'accepted')
    .map(r => r.sender_id === user?.id ? r.receiver : r.sender)
    .filter(Boolean) as Profile[];

  const incoming = requests.filter(r => r.status === 'pending' && r.receiver_id === user?.id);
  const outgoing = requests.filter(r => r.status === 'pending' && r.sender_id === user?.id);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <UserCircle2 className="h-8 w-8 text-primary/40" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Sign in to access your account</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Create a profile to connect with other users and share sensor recordings across devices.
          </p>
        </div>
        <Button onClick={onOpenAuth} className="gap-2">
          <UserCircle2 className="h-4 w-4" /> Sign In / Sign Up
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <UserCircle2 className="h-5 w-5 text-primary" /> Account
        </h2>
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh data"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Profile card */}
      <div className="glass-card p-5 flex items-start gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-violet-500/30 border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-primary">{initials(user.username, user.email)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-foreground truncate">{user.username}</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-500 font-medium">Online</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{friends.length} connected</span>
            <span className="flex items-center gap-1"><Cloud className="h-3 w-3" />{myRecordings.length} shared</span>
            {incoming.length > 0 && (
              <span className="flex items-center gap-1 text-amber-500">
                <UserPlus className="h-3 w-3" />{incoming.length} request{incoming.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { signOut(); toast.success('Signed out'); }}
          className="border-red-500/30 text-red-500 hover:bg-red-500/10 gap-1.5 flex-shrink-0"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign Out
        </Button>
      </div>

      {/* Find Users */}
      <SensorCard title="Find Users" icon={<Search className="h-4 w-4 text-cyan-400" />}>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-border/50 bg-muted/20 focus-within:border-primary/50 transition-colors min-w-0">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1 min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button size="sm" onClick={handleSearch} className="gap-1.5 w-full sm:w-auto sm:flex-shrink-0">
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
                    <div className="text-sm font-medium text-foreground truncate">{profile.username || profile.email}</div>
                    <div className={cn('text-[11px]', online ? 'text-green-500' : 'text-muted-foreground')}>
                      {online ? '● Online now' : '○ Offline'}
                    </div>
                  </div>
                  {status === 'none' && (
                    <Button size="sm" variant="outline" onClick={() => sendRequest(profile.id)} className="gap-1 text-xs h-7 flex-shrink-0">
                      <UserPlus className="h-3 w-3" /> Request
                    </Button>
                  )}
                  {status === 'sent' && (
                    <span className="text-xs text-muted-foreground px-2 py-1 rounded-lg bg-muted/40 border border-border/40 flex-shrink-0">Pending</span>
                  )}
                  {status === 'received' && (
                    <span className="text-xs text-amber-500 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 flex-shrink-0">Awaiting you</span>
                  )}
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

      {/* Sharing Requests */}
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
                      <Button size="sm" variant="ghost" onClick={() => removeRequest(req.id)} className="h-7 text-muted-foreground hover:text-red-500">
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
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> Awaiting response
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeRequest(req.id)} className="h-7 text-muted-foreground hover:text-red-500 text-xs flex-shrink-0">
                      Cancel
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </SensorCard>
      )}

      {/* Connected Devices */}
      <SensorCard title="Connected Devices" icon={<Users className="h-4 w-4 text-emerald-400" />}>
        {loadingData ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Users className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No connections yet</p>
            <p className="text-xs text-muted-foreground/70">Search for users above to send a data sharing request</p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map(friend => {
              if (!friend) return null;
              const online = isOnline(friend.last_seen);
              const theirRecs = friendRecordings.filter(r => r.owner_id === friend.id);
              return (
                <div key={friend.id} className="p-3 rounded-xl border border-border/40 bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center border-2',
                        online ? 'bg-green-500/15 border-green-500/30' : 'bg-muted/40 border-border/40'
                      )}>
                        <span className={cn('text-sm font-bold', online ? 'text-green-500' : 'text-muted-foreground')}>
                          {initials(friend.username, friend.email)}
                        </span>
                      </div>
                      <div className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
                        online ? 'bg-green-500' : 'bg-muted-foreground/30'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{friend.username || friend.email}</div>
                      <div className={cn('text-[11px]', online ? 'text-green-500' : 'text-muted-foreground')}>
                        {online
                          ? '● Device Online'
                          : `○ Last seen ${friend.last_seen ? formatDate(friend.last_seen) : 'never'}`}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground flex-shrink-0">
                      <span className="text-foreground/70 font-medium">{theirRecs.length}</span> recording{theirRecs.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SensorCard>

      {/* Friends' Recordings */}
      {friendRecordings.length > 0 && (
        <SensorCard title="Friends' Recordings" icon={<Activity className="h-4 w-4 text-violet-400" />}>
          <div className="space-y-2">
            {friendRecordings.map(rec => (
              <div key={rec.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="h-4 w-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{rec.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    by <span className="text-foreground/70">{rec.owner?.username || 'Unknown'}</span>
                    {' · '}{rec.sample_count} samples · {formatDuration(rec.duration_ms)}
                  </div>
                  {rec.sensor_groups && rec.sensor_groups.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {rec.sensor_groups.slice(0, 3).map(g => (
                        <span key={g} className="text-[10px] bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5 text-violet-400">{g}</span>
                      ))}
                      {rec.sensor_groups.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{rec.sensor_groups.length - 3} more</span>
                      )}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground/60 mt-1">{formatDate(rec.created_at)}</div>
                </div>
                <button
                  onClick={() => downloadRecording(rec.id, rec.title)}
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors flex-shrink-0 mt-0.5"
                  title="Download JSON"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </SensorCard>
      )}

      {/* My Cloud Recordings */}
      <SensorCard title="My Cloud Recordings" icon={<Cloud className="h-4 w-4 text-blue-400" />}>
        {myRecordings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-5 text-center">
            <Cloud className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No cloud recordings yet</p>
            <p className="text-xs text-muted-foreground/70">
              Go to <span className="font-medium text-foreground">Recording</span> → record a session → click{' '}
              <span className="font-medium text-foreground">Share to Cloud</span>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {myRecordings.map(rec => (
              <div key={rec.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/40 bg-muted/10 hover:bg-muted/20 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{rec.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {rec.sample_count} samples · {formatDuration(rec.duration_ms)}
                  </div>
                  {rec.sensor_groups && rec.sensor_groups.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {rec.sensor_groups.slice(0, 4).map(g => (
                        <span key={g} className="text-[10px] bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5 text-blue-400">{g}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground/60 mt-1">{formatDate(rec.created_at)}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0 mt-0.5">
                  <button
                    onClick={() => downloadRecording(rec.id, rec.title)}
                    className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title="Download JSON"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteMyRecording(rec.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Info className="h-3 w-3 flex-shrink-0" />
            Shared recordings are visible to your connected devices. Delete anytime to remove access.
          </p>
        </div>
      </SensorCard>
    </div>
  );
}
