import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type PaymentResponse = { id?: string; order_id?: string; amount?: number; currency?: string; status?: string };

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!supabaseUrl || !publishableKey || !serviceRoleKey || !keyId || !keySecret) {
      return NextResponse.json({ error: 'Online payments are not configured yet.' }, { status: 503 });
    }

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ error: 'Please sign in before verifying payment.' }, { status: 401 });
    const body = await request.json() as { orderId?: string; razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string };
    if (!body.orderId || !body.razorpay_payment_id || !body.razorpay_order_id || !body.razorpay_signature) {
      return NextResponse.json({ error: 'The payment response is incomplete.' }, { status: 400 });
    }

    const authClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return NextResponse.json({ error: 'Your sign-in session has expired. Please sign in again.' }, { status: 401 });

    const expectedSignature = createHmac('sha256', keySecret)
      .update(body.razorpay_order_id + '|' + body.razorpay_payment_id)
      .digest();
    let receivedSignature: Buffer;
    try { receivedSignature = Buffer.from(body.razorpay_signature, 'hex'); } catch {
      return NextResponse.json({ error: 'The payment signature is invalid.' }, { status: 400 });
    }
    if (receivedSignature.length !== expectedSignature.length || !timingSafeEqual(receivedSignature, expectedSignature)) {
      return NextResponse.json({ error: 'The payment signature could not be verified.' }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: order, error: orderError } = await admin.from('orders')
      .select('id, user_id, total, status, payment_method, razorpay_order_id, payment_status')
      .eq('id', body.orderId).eq('user_id', authData.user.id).maybeSingle();
    if (orderError || !order) return NextResponse.json({ error: 'We could not find this order.' }, { status: 404 });
    if (order.payment_status === 'paid') return NextResponse.json({ success: true });
    if (order.payment_method !== 'razorpay' || order.status !== 'awaiting_payment' || order.razorpay_order_id !== body.razorpay_order_id) {
      return NextResponse.json({ error: 'This payment does not match the current order.' }, { status: 409 });
    }

    const authHeader = 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64');
    const paymentResponse = await fetch('https://api.razorpay.com/v1/payments/' + encodeURIComponent(body.razorpay_payment_id), {
      headers: { Authorization: authHeader }, cache: 'no-store',
    });
    let payment = await paymentResponse.json() as PaymentResponse;
    const expectedAmount = Math.round(Number(order.total) * 100);
    if (!paymentResponse.ok || payment.order_id !== body.razorpay_order_id || payment.amount !== expectedAmount || payment.currency !== 'INR') {
      return NextResponse.json({ error: 'The payment details do not match this order.' }, { status: 400 });
    }

    if (payment.status === 'authorized') {
      const captureResponse = await fetch('https://api.razorpay.com/v1/payments/' + encodeURIComponent(body.razorpay_payment_id) + '/capture', {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: expectedAmount, currency: 'INR' }),
        cache: 'no-store',
      });
      payment = await captureResponse.json() as PaymentResponse;
      if (!captureResponse.ok && payment.status !== 'captured') {
        console.error('Razorpay capture failed:', payment.status ?? 'unknown status');
        return NextResponse.json({ error: 'The payment is authorized but not yet captured. Please contact support before trying again.' }, { status: 409 });
      }
    }
    if (payment.status !== 'captured') {
      return NextResponse.json({ error: 'The payment has not been captured yet. Please contact support if money was deducted.' }, { status: 409 });
    }

    const { error: updateError } = await admin.from('orders').update({
      payment_status: 'paid',
      status: 'confirmed',
      razorpay_payment_id: body.razorpay_payment_id,
      updated_at: new Date().toISOString(),
    }).eq('id', order.id).eq('user_id', authData.user.id);
    if (updateError) {
      console.error('Could not update paid order:', updateError.message);
      return NextResponse.json({ error: 'Payment was verified but the order status could not be updated. Please contact support.' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Verify payment failed:', error);
    return NextResponse.json({ error: 'Unable to verify online payment right now.' }, { status: 500 });
  }
}
