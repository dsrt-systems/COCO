import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { MissionChannel, RealtimeEvent, RealtimeEventKind } from '@coco/realtime';
import { toast } from 'sonner';

export function useMissionChannel(
  missionId: string,
  organizationId: string
) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // We keep the channel instance in a ref so we can unsubscribe on unmount
  const channelRef = useRef<MissionChannel | null>(null);
  
  // A ref to hold registered handlers so they can be accessed dynamically
  const handlersRef = useRef<Map<RealtimeEventKind, Set<(e: RealtimeEvent) => void>>>(new Map());
  const anyHandlersRef = useRef<Set<(e: RealtimeEvent) => void>>(new Set());

  useEffect(() => {
    if (!missionId || !organizationId) return;

    let mounted = true;

    // Create a Supabase client that uses the session cookie from the browser
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = new MissionChannel(supabase, missionId, organizationId);
    channelRef.current = channel;

    // Re-bind all currently registered handlers to the new channel instance
    for (const [kind, fns] of handlersRef.current.entries()) {
      for (const fn of fns) {
        channel.on(kind, fn);
      }
    }
    for (const fn of anyHandlersRef.current) {
      channel.onAny(fn);
    }

    channel.subscribe()
      .then(() => {
        if (mounted) setIsConnected(true);
      })
      .catch((err) => {
        console.error('[useMissionChannel] Subscription failed:', err);
        if (mounted) setError(err as Error);
        toast.error('Failed to connect to real-time mission updates');
      });

    return () => {
      mounted = false;
      channel.unsubscribe().catch(console.error);
      setIsConnected(false);
    };
  }, [missionId, organizationId]);

  // Methods to register handlers dynamically
  const on = (kind: RealtimeEventKind, handler: (e: RealtimeEvent) => void) => {
    if (!handlersRef.current.has(kind)) {
      handlersRef.current.set(kind, new Set());
    }
    handlersRef.current.get(kind)!.add(handler);
    
    if (channelRef.current && isConnected) {
      channelRef.current.on(kind, handler);
    }
  };

  const onAny = (handler: (e: RealtimeEvent) => void) => {
    anyHandlersRef.current.add(handler);
    
    if (channelRef.current && isConnected) {
      channelRef.current.onAny(handler);
    }
  };

  return {
    isConnected,
    error,
    on,
    onAny,
  };
}
