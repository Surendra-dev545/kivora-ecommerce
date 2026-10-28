import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!supabaseUrl || !publishableKey || !serviceRoleKey || !keyId || !keySecret) {
      return NextResponse.json({ error: 'Online payments are not configured yet. Please use cash on delivery or try again later.' }, { status: 503 });
    }

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Please sign in before paying.' }, { status: 401 });
    const body = await request.json() as { orderId?: string };
    if (!body.orderId) return NextResponse.json({ error: 'Missing order ID.' }, { status: 400 });

    const authClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: 'Your sign-in session has expired. Please sign in again.' }, { status: 401 });

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: order, error: orderError } = await admin.from('orders')
      .select('id, order_number, user_id, total, status, payment_method, razorpay_order_id')
      .eq('id', body.orderId).eq('user_id', authData.user.id).maybeSingle();
    if (orderError || !order) return NextResponse.json({ error: 'We could not find this order.' }, { status: 404 });
    if (order.payment_method !== 'razorpay' || order.status !== 'awaiting_payment') {
      return NextResponse.json({ error: 'This order is not waiting for an online payment.' }, { status: 409 });
    }

    if (order.razorpay_order_id) {
      return NextResponse.json({ keyId, razorpayOrderId: order.razorpay_order_id, amount: Math.round(Number(order.total) * 100), currency: 'INR' });
    }

    const amount = Math.round(Number(order.total) * 100);
    if (!Number.isSafeInteger(amount) || amount < 100) return NextResponse.json({ error: 'The order amount is invalid.' }, { status: 400 });
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, currency: 'INR', receipt: order.order_number, notes: { kivora_order_id: order.id, customer_id: authData.user.id } }),
      cache: 'no-store',
    });
    const razorpayData = await razorpayResponse.json() as { id?: string; error?: { description?: string } };
    if (!razorpayResponse.ok || !razorpayData.id) {
      console.error('Razorpay order creation failed:', razorpayData.error?.description ?? 'Unknown provider error');
      return NextResponse.json({ error: 'The payment provider could not start checkout. Please try again.' }, { status: 502 });
    }

    const { error: saveError } = await admin.from('orders').update({ razorpay_order_id: razorpayData.id, updated_at: new Date().toISOString() }).eq('id', order.id);
    if (saveError) {
      console.error('Could not save Razorpay order ID:', saveError.message);
      return NextResponse.json({ error: 'We could not prepare the payment securely. Please contact support before retrying.' }, { status: 500 });
    }
    return NextResponse.json({ keyId, razorpayOrderId: razorpayData.id, amount, currency: 'INR' });
  } catch (error) {
    console.error('Create payment order failed:', error);
    return NextResponse.json({ error: 'Unable to start online payment right now.' }, { status: 500 });
  }
}
