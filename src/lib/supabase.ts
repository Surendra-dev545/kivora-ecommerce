import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Supabase environment variables are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in Vercel.');
}

// The sign-in page sets this preference before authentication. Remembered sessions
// use localStorage; unchecked sessions stay in sessionStorage for this browser tab.
const authStorage = {
  getItem(key: string) {
    if (typeof window === 'undefined') return null;
    const remember = window.localStorage.getItem('kivora-remember-me') !== 'false';
    return (remember ? window.localStorage : window.sessionStorage).getItem(key);
  },
  setItem(key: string, value: string) {
    if (typeof window === 'undefined') return;
    const remember = window.localStorage.getItem('kivora-remember-me') !== 'false';
    const target = remember ? window.localStorage : window.sessionStorage;
    const other = remember ? window.sessionStorage : window.localStorage;
    other.removeItem(key);
    target.setItem(key, value);
  },
  removeItem(key: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { storage: authStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
