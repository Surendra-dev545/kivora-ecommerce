import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
const allowedStatuses = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'] as const;
type OrderStatus = typeof allowedStatuses[number];

async function getAdminClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const allowedEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!url || !serviceKey || allowedEmails.length === 0) {
    return { error: NextResponse.json({ error: 'Admin access is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY and ADMIN_EMAILS in Vercel.' }, { status: 503 }) };
  }
  const authorization = request.headers.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return { error: NextResponse.json({ error: 'Please sign in to continue.' }, { status: 401 }) };
  const client = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user?.email || !allowedEmails.includes(data.user.email.toLowerCase())) {
    return { error: NextResponse.json({ error: 'Admin access only.' }, { status: 403 }) };
  }
  return { client };
}

export async function GET(request: Request) {
  const auth = await getAdminClient(request);
  if ('error' in auth) return auth.error;
  const { data, error } = await auth.client.from('orders').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: 'Could not load orders.' }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await getAdminClient(request);
  if ('error' in auth) return auth.error;
  let body: { orderId?: string; status?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (!body.orderId || !body.status || !allowedStatuses.includes(body.status as OrderStatus)) {
    return NextResponse.json({ error: 'Choose a valid order and status.' }, { status: 400 });
  }
  const { data, error } = await auth.client.from('orders').update({ status: body.status, updated_at: new Date().toISOString() }).eq('id', body.orderId).select('id, order_number, status').maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not update this order.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  return NextResponse.json({ order: data });
}
