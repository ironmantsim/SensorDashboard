import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const LAST_VISIT_KEY = 'sensor_dash_last_visit';

/**
 * Fires Sonner toasts once per session (on sign-in) for:
 *  1. Pending incoming friend / data-sharing requests
 *  2. New group recordings shared by friends since last visit
 *
 * The last-visit timestamp is updated to now() after checks complete.
 */
export function useNotifications(userId: string | null | undefined) {
  const checked = useRef(false);

  useEffect(() => {
    if (!userId || checked.current) return;
    checked.current = true;

    const run = async () => {
      const lastVisit = localStorage.getItem(LAST_VISIT_KEY);

      // ── 1. Pending incoming requests ──────────────────────────────────
      const { data: reqData } = await supabase
        .from('friend_requests')
        .select('id')
        .eq('receiver_id', userId)
        .eq('status', 'pending');

      const pendingCount = reqData?.length ?? 0;

      // ── 2. New group recordings from friends since last visit ─────────
      let newRecCount = 0;
      if (lastVisit) {
        // Get accepted friend ids
        const { data: friends } = await supabase
          .from('friend_requests')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .eq('status', 'accepted');

        const friendIds = (friends || []).map((f: any) =>
          f.sender_id === userId ? f.receiver_id : f.sender_id,
        );

        if (friendIds.length > 0) {
          const { data: newRecs } = await supabase
            .from('shared_recordings')
            .select('id')
            .in('owner_id', friendIds)
            .gt('created_at', lastVisit);

          newRecCount = newRecs?.length ?? 0;
        }
      }

      // ── Show toasts ───────────────────────────────────────────────────
      if (pendingCount > 0) {
        toast.info(
          pendingCount === 1
            ? 'You have 1 pending data-sharing request'
            : `You have ${pendingCount} pending data-sharing requests`,
          {
            description: 'Open the Group page to accept or decline.',
            duration: 6000,
          },
        );
      }

      if (newRecCount > 0) {
        toast.info(
          newRecCount === 1
            ? '1 new recording shared in your group'
            : `${newRecCount} new recordings shared in your group`,
          {
            description: 'Open the Group page to view them.',
            duration: 6000,
          },
        );
      }

      // ── Update last visit ─────────────────────────────────────────────
      localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
    };

    // Short delay so the UI is fully loaded before toasts appear
    const t = setTimeout(run, 1500);
    return () => clearTimeout(t);
  }, [userId]);
}
