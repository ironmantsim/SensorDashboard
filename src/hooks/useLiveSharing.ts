import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useMotionSensors } from '@/hooks/useMotionSensors';
import { useLocation } from '@/hooks/useLocation';
import { useBattery } from '@/hooks/useBattery';
import { useNetwork } from '@/hooks/useNetwork';

export interface LiveSensorData {
  accel_x: number | null;
  accel_y: number | null;
  accel_z: number | null;
  gps_lat: number | null;
  gps_lng: number | null;
  battery_level: number | null;
  battery_charging: boolean | null;
  network_effective: string | null;
  network_downlink: number | null;
  timestamp: number;
}

export interface FriendLiveSession {
  owner_id: string;
  sensor_data: LiveSensorData;
  is_sharing: boolean;
  updated_at: string;
  owner?: { username: string | null; email: string; plan: string } | null;
}

const PUSH_INTERVAL_MS = 5000;
const POLL_INTERVAL_MS = 5000;

// ── Hook: own live sharing (Pro) ──────────────────────────────────────────
export function useLiveSharing() {
  const { user } = useAuth();
  const [isSharing, setIsSharing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const { motionData } = useMotionSensors();
  const { locationData, requestLocation, isWatching } = useLocation();
  const battery = useBattery();
  const { networkData } = useNetwork();

  // Auto-request location when sharing starts
  const locationStarted = useRef(false);
  useEffect(() => {
    if (isSharing && !isWatching && !locationStarted.current) {
      locationStarted.current = true;
      requestLocation();
    }
    if (!isSharing) locationStarted.current = false;
  }, [isSharing]);

  // Push to live_sessions every 5 s when sharing
  useEffect(() => {
    if (!isSharing || !user || user.plan !== 'pro') return;

    const push = async () => {
      const payload: LiveSensorData = {
        accel_x: motionData.accelerometer.x,
        accel_y: motionData.accelerometer.y,
        accel_z: motionData.accelerometer.z,
        gps_lat: locationData.latitude,
        gps_lng: locationData.longitude,
        battery_level: battery.level,
        battery_charging: battery.charging,
        network_effective: networkData.effectiveType,
        network_downlink: networkData.downlink,
        timestamp: Date.now(),
      };
      const { error } = await supabase.from('live_sessions').upsert(
        {
          owner_id: user.id,
          sensor_data: payload,
          is_sharing: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id' },
      );
      if (error) setPushError(error.message);
      else setPushError(null);
    };

    push(); // immediate first push
    const interval = setInterval(push, PUSH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      // Mark as not sharing when effect cleans up
      supabase.from('live_sessions').upsert(
        {
          owner_id: user.id,
          sensor_data: {},
          is_sharing: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id' },
      );
    };
  }, [isSharing, user, motionData, locationData, battery, networkData]);

  // When user explicitly disables sharing, mark off in DB immediately
  const stopSharing = useCallback(async () => {
    setIsSharing(false);
    if (!user) return;
    await supabase.from('live_sessions').upsert(
      {
        owner_id: user.id,
        sensor_data: {},
        is_sharing: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id' },
    );
  }, [user]);

  return { isSharing, setIsSharing, stopSharing, pushError };
}

// ── Hook: poll friends' live sessions ────────────────────────────────────
export function useFriendLiveSessions(friendIds: string[]) {
  const [sessions, setSessions] = useState<FriendLiveSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (friendIds.length === 0) { setSessions([]); return; }
    const { data } = await supabase
      .from('live_sessions')
      .select('owner_id, sensor_data, is_sharing, updated_at')
      .in('owner_id', friendIds)
      .eq('is_sharing', true);
    setSessions(data as FriendLiveSession[] || []);
  }, [friendIds.join(',')]);

  useEffect(() => {
    if (friendIds.length === 0) { setSessions([]); return; }
    setLoading(true);
    fetchSessions().finally(() => setLoading(false));
    const interval = setInterval(fetchSessions, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  return { sessions, loading, refresh: fetchSessions };
}
