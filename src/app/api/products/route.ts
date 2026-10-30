import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: 'Product catalogue is not configured.' }, { status: 503 });
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const id = new URL(request.url).searchParams.get('id');
  const slug = new URL(request.url).searchParams.get('slug');
  let query = client.from('products').select('id,name,slug,description,category,price,compare_at_price,image_url,stock_quantity,is_active').eq('is_active', true).gt('stock_quantity', 0);
  if (id) query = query.eq('id', id);
  else if (slug) query = query.eq('slug', slug);
  else query = query.order('created_at', { ascending: false }).limit(100);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'Could not load the product catalogue.' }, { status: 500 });
  if ((id || slug) && !data?.length) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  return NextResponse.json(id || slug ? { product: data?.[0] } : { products: data ?? [] }, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
