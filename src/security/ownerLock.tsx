import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export type SecurityState = 'FACE_SCAN' | 'PIN' | 'LOCKED' | 'AUTHENTICATING' | 'UNLOCKED' | 'AUTH_FAILED' | 'SESSION_EXPIRED';

export interface OwnerLockValue {
  state: SecurityState;
  owner: User | null;
  canAttemptUnlock: boolean;
  verifyFace: () => void;
  verifyPin: (pin: string) => void;
  lock: (reason?: 'manual' | 'timeout' | 'visibility' | 'logout') => void;
  refresh: () => Promise<void>;
}

const AUTO_LOCK_MS = 5 * 60 * 1000;
const OWNER_ID = import.meta.env.VITE_NEXA_OWNER_USER_ID;
const NEXA_PIN = '1987';

const OwnerLockContext = createContext<OwnerLockValue | null>(null);

function ownerMatches(user: User): boolean {
  return Boolean(OWNER_ID && user.id === OWNER_ID);
}

function safeAuthState(session: Session | null): { state: SecurityState; owner: User | null } {
  if (!session?.user) return { state: 'LOCKED', owner: null };
  return ownerMatches(session.user)
    ? { state: 'UNLOCKED', owner: session.user }
    : { state: 'AUTH_FAILED', owner: null };
}

export const OwnerLockProvider: React.FC<{ children: React.ReactNode; client?: SupabaseClient | null }> = ({ children, client = supabase }) => {
  const [state, setState] = useState<SecurityState>('FACE_SCAN');
  const [owner, setOwner] = useState<User | null>(null);

  const applySession = (session: Session | null) => {
    const next = safeAuthState(session);
    setState(next.state);
    setOwner(next.owner);
  };

  const refresh = async () => {
    if (!client) {
      setState('SESSION_EXPIRED');
      setOwner(null);
      return;
    }
    setState('AUTHENTICATING');
    const { data, error } = await client.auth.getSession();
    if (error) {
      setState('AUTH_FAILED');
      setOwner(null);
      return;
    }
    applySession(data.session);
  };

  const verifyFace = () => setState('PIN');

  const verifyPin = (pin: string) => {
    if (pin === NEXA_PIN) {
      setState('UNLOCKED');
      return;
    }
    setState('AUTH_FAILED');
  };

  const lock = (reason: 'manual' | 'timeout' | 'visibility' | 'logout' = 'manual') => {
    setState(reason === 'logout' ? 'SESSION_EXPIRED' : 'FACE_SCAN');
    setOwner(null);
  };

  useEffect(() => {
    if (!client) return undefined;
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (state === 'AUTHENTICATING') applySession(session);
    });
    return () => data.subscription.unsubscribe();
  }, [client, state]);

  useEffect(() => {
    if (state !== 'UNLOCKED') return undefined;
    const timeout = window.setTimeout(() => lock('timeout'), AUTO_LOCK_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') lock('visibility');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [state]);

  const value = useMemo<OwnerLockValue>(() => ({
    state,
    owner,
    canAttemptUnlock: Boolean(client && OWNER_ID),
    verifyFace,
    verifyPin,
    lock,
    refresh
  }), [client, owner, state]);

  return <OwnerLockContext.Provider value={value}>{children}</OwnerLockContext.Provider>;
};

export function useOwnerLock(): OwnerLockValue {
  const value = useContext(OwnerLockContext);
  if (!value) throw new Error('useOwnerLock() must be used inside <OwnerLockProvider>.');
  return value;
}