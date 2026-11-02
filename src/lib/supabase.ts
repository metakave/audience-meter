import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project')
);

let supabaseInstance: SupabaseClient | null = null;
let supabaseDisabledUntil = 0;

export function isSupabaseHealthy(): boolean {
  if (!isSupabaseConfigured) return false;
  return Date.now() > supabaseDisabledUntil;
}

export function reportSupabaseFailure() {
  // Trip the circuit breaker for 30s to keep API responses ultra-fast (<10ms)
  supabaseDisabledUntil = Date.now() + 30000;
}

export function reportSupabaseSuccess() {
  supabaseDisabledUntil = 0;
}

export async function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms = 2200): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Supabase query timeout after ${ms}ms`)), ms);
  });
  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance && supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    });
  }
  return supabaseInstance;
}
