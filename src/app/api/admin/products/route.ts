import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/server/rider-auth';

export const dynamic = 'force-dynamic';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
}

const cleanText = (value: unknown, max = 5000) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;
  const client = adminClient();
  if (!client) return NextResponse.json({ error: 'Product management is not configured on the server.' }, { status: 503 });
  const { data, error } = await client.from('products').select('*').order('updated_at', { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: 'Could not load products. Apply the latest catalogue migration first.' }, { status: 500 });
  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;
  const client = adminClient();
  if (!client) return NextResponse.json({ error: 'Product management is not configured on the server.' }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const name = cleanText(body.name, 160);
  const category = cleanText(body.category, 80);
  const price = Number(body.price);
  const stock = Number(body.stock_quantity ?? 0);
  if (!name || !category || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
    return NextResponse.json({ error: 'Enter a product name, category, valid price and whole-number stock quantity.' }, { status: 400 });
  }
  const slug = slugify(cleanText(body.slug, 120) || name);
  if (!slug) return NextResponse.json({ error: 'Enter a valid product name or slug.' }, { status: 400 });
  const compareAt = body.compare_at_price === '' || body.compare_at_price == null ? null : Number(body.compare_at_price);
  if (compareAt != null && (!Number.isFinite(compareAt) || compareAt < price)) return NextResponse.json({ error: 'Compare-at price must be greater than or equal to the selling price.' }, { status: 400 });
  const payload = {
    name, slug, category, price, compare_at_price: compareAt,
    description: cleanText(body.description, 5000),
    image_url: cleanText(body.image_url, 2000),
    sku: cleanText(body.sku, 80) || null,
    stock_quantity: stock,
    low_stock_threshold: Number.isInteger(Number(body.low_stock_threshold)) && Number(body.low_stock_threshold) >= 0 ? Number(body.low_stock_threshold) : 5,
    is_active: body.is_active === true,
  };
  const { data, error } = await client.from('products').insert(payload).select('*').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That product slug or SKU is already in use.' : 'Could not create product.' }, { status: 400 });
  if (stock > 0) {
    await client.from('inventory_movements').insert({ product_id: data.id, quantity_change: stock, reason: 'opening_stock', note: 'Initial stock', created_by: auth.user.id });
  }
  return NextResponse.json({ product: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if ('response' in auth) return auth.response;
  const client = adminClient();
  if (!client) return NextResponse.json({ error: 'Product management is not configured on the server.' }, { status: 503 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }
  const productId = cleanText(body.productId, 80);
  if (!productId) return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
  const { data: current, error: readError } = await client.from('products').select('*').eq('id', productId).maybeSingle();
  if (readError || !current) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const field of ['name','description','category','image_url','sku'] as const) {
    if (field in body) patch[field] = cleanText(body[field], field === 'description' ? 5000 : 2000) || (field === 'sku' ? null : '');
  }
  if ('slug' in body || 'name' in body) patch.slug = slugify(cleanText(body.slug, 120) || cleanText(body.name, 160) || current.name);
  if ('price' in body) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: 'Enter a valid non-negative price.' }, { status: 400 });
    patch.price = price;
  }
  if ('compare_at_price' in body) {
    const value = body.compare_at_price === '' || body.compare_at_price == null ? null : Number(body.compare_at_price);
    if (value != null && (!Number.isFinite(value) || value < Number(patch.price ?? current.price))) return NextResponse.json({ error: 'Compare-at price must be at least the selling price.' }, { status: 400 });
    patch.compare_at_price = value;
  }
  if ('is_active' in body) patch.is_active = body.is_active === true;
  if ('low_stock_threshold' in body) {
    const threshold = Number(body.low_stock_threshold);
    if (!Number.isInteger(threshold) || threshold < 0) return NextResponse.json({ error: 'Low-stock threshold must be a whole number.' }, { status: 400 });
    patch.low_stock_threshold = threshold;
  }
  let stockChange = 0;
  if ('stock_quantity' in body) {
    const stock = Number(body.stock_quantity);
    if (!Number.isInteger(stock) || stock < 0) return NextResponse.json({ error: 'Stock must be a whole number of zero or more.' }, { status: 400 });
    stockChange = stock - Number(current.stock_quantity);
    patch.stock_quantity = stock;
  }
  const { data, error } = await client.from('products').update(patch).eq('id', productId).select('*').single();
  if (error) return NextResponse.json({ error: error.code === '23505' ? 'That product slug or SKU is already in use.' : 'Could not update product.' }, { status: 400 });
  if (stockChange !== 0) {
    const reason = body.stock_reason === 'restock' || body.stock_reason === 'return' || body.stock_reason === 'sale' ? body.stock_reason : 'correction';
    const { error: movementError } = await client.from('inventory_movements').insert({
      product_id: productId, quantity_change: stockChange, reason,
      note: cleanText(body.stock_note, 500), created_by: auth.user.id,
    });
    if (movementError) return NextResponse.json({ error: 'Product was updated, but the stock history entry failed. Please review inventory movements.' }, { status: 500 });
  }
  return NextResponse.json({ product: data });
}
