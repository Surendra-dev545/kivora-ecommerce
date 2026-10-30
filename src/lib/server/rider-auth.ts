import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function getVerifiedUser(request: Request): Promise<{ client: SupabaseClient; user: User } | { response: NextResponse }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!url || !key) return { response: NextResponse.json({ error: 'Server authentication is not configured.' }, { status: 503 }) };
  if (!token) return { response: NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) };
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return { response: NextResponse.json({ error: 'Your session is invalid. Please sign in again.' }, { status: 401 }) };
  return { client, user: data.user };
}

export async function requireAdmin(request: Request) {
  const auth = await getVerifiedUser(request);
  if ('response' in auth) return auth;
  const allowed = (process.env.ADMIN_EMAILS ?? '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!auth.user.email || !allowed.includes(auth.user.email.toLowerCase())) return { response: NextResponse.json({ error: 'Admin access only.' }, { status: 403 }) };
  return auth;
}
