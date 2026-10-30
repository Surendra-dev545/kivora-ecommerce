'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock3, Package, PackageCheck, RefreshCw, Truck, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type OrderItem = { product_id: number; name: string; category: string; image: string; unit_price: number; quantity: number; line_total: number };
type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  shipping_address: string;
  items: OrderItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: 'awaiting_payment' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_method: string;
  payment_status: string;
  created_at: string;
};
const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount));
const steps = [
  { key: 'confirmed', label: 'Order confirmed', note: 'We have received your order.', icon: Check },
  { key: 'processing', label: 'Preparing your order', note: 'Your items are being prepared.', icon: Package },
  { key: 'shipped', label: 'Shipped', note: 'Your package has been handed to the delivery partner.', icon: Truck },
  { key: 'out_for_delivery', label: 'Out for delivery', note: 'Your order is with the delivery partner for final delivery.', icon: Truck },
  { key: 'delivered', label: 'Delivered', note: 'Your order has been marked as delivered.', icon: PackageCheck },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyOrder, setBusyOrder] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      setEmail('');
      setOrders([]);
      setLoading(false);
      return;
    }
    setEmail(auth.user.email ?? '');
    const { data, error: queryError } = await supabase.from('orders').select('*').eq('user_id', auth.user.id).order('created_at', { ascending: false });
    if (queryError) setError(queryError.message);
    else setOrders((data ?? []) as Order[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadOrders();
    const placed = new URLSearchParams(window.location.search).get('placed');
    if (placed) setNotice('Thank you! Order ' + placed + ' has been placed successfully.');
  }, [loadOrders]);

  // Subscribe to this customer's order changes so tracking updates without a refresh.
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      channel = supabase
        .channel('customer-order-tracking-' + data.user.id)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: 'user_id=eq.' + data.user.id,
          },
          (payload) => {
            const updated = payload.new as Partial<Order>;
            setOrders((current) =>
              current.map((order) =>
                order.id === updated.id ? { ...order, ...updated } as Order : order
              )
            );
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  async function cancelOrder(order: Order) {
    const approved = window.confirm('Cancel order ' + order.order_number + '? This can only be done before it ships.');
    if (!approved) return;
    setBusyOrder(order.id);
    setError('');
    const { data, error: cancelError } = await supabase.rpc('cancel_my_order', { p_order_id: order.id });
    if (cancelError) setError(cancelError.message);
    else if (!data) setError('This order can no longer be cancelled because its status has changed.');
    else {
      setNotice('Order ' + order.order_number + ' has been cancelled.');
      await loadOrders();
    }
    setBusyOrder(null);
  }

  return (
    <main className="commercePage">
      <header className="commerceHeader">
        <Link className="backLink" href="/"><ArrowLeft size={15} /> Back to shopping</Link>
        <Link className="detailLogo" href="/">kivora<span>.</span></Link>
        <Link className="checkoutSecure" href="/account">MY ACCOUNT <ArrowRight size={14} /></Link>
      </header>
      <div className="commerceIntro">
        <span className="eyebrow"><span className="eyebrowLine" /> YOUR KIVORA ACCOUNT</span>
        <h1>Your orders.</h1>
        <p>Order history and delivery progress, all in one place.</p>
        {email && <p className="ordersSignedIn">Signed in as <strong>{email}</strong></p>}
      </div>
      {notice && <div className="commerceSuccess" role="status"><Check size={18} />{notice}<button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}><XCircle size={16} /></button></div>}
      {error && <p className="commerceError" role="alert">{error}</p>}
      {loading ? <div className="commerceLoading"><RefreshCw size={19} /> Loading your orders…</div> : !email ? (
        <section className="commerceEmpty"><Package size={30} /><h2>Sign in to view your orders</h2><p>Your purchases are kept private to your Kivora account.</p><Link className="commercePrimary" href="/account">Sign in <ArrowRight size={16} /></Link></section>
      ) : orders.length === 0 ? (
        <section className="commerceEmpty"><Package size={30} /><h2>No orders just yet</h2><p>When you place an order, its confirmation and delivery progress will appear here.</p><Link className="commercePrimary" href="/#shop">Explore the collection <ArrowRight size={16} /></Link></section>
      ) : (
        <section className="ordersList">
          {orders.map((order) => {
            const cancelled = order.status === 'cancelled';
            const activeIndex = steps.findIndex((step) => step.key === order.status);
            return <article className="orderCard" key={order.id}>
              <div className="orderCardHeader"><div><span className="orderEyebrow">ORDER NUMBER</span><h2>{order.order_number}</h2><p>Placed {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div><span className={cancelled ? 'orderStatus orderStatusCancelled' : 'orderStatus'}>{cancelled ? 'Cancelled' : order.status === 'awaiting_payment' ? 'Awaiting payment' : order.status === 'out_for_delivery' ? 'Out for delivery' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></div>
              <div className="orderCardItems">{(order.items ?? []).map((item, index) => <div className="orderCardItem" key={index}><img src={item.image} alt="" /><div><strong>{item.name}</strong><small>{item.category} · Qty {item.quantity}</small></div><b>{money(item.line_total)}</b></div>)}</div>
              {cancelled ? <div className="cancelledNotice"><XCircle size={17} /> This order was cancelled. If you paid for it, contact support for help with a refund.</div> : order.status === 'awaiting_payment' ? <div className="cancelledNotice"><Clock3 size={17} /> Payment has not been completed. Finish checkout to confirm this order, or cancel it below.</div> : <div className="orderTimeline">{steps.map((step, index) => { const Icon = step.icon; const done = activeIndex >= index; return <div className={done ? 'timelineStep timelineStepDone' : 'timelineStep'} key={step.key}><span className="timelineIcon"><Icon size={15} /></span><div><strong>{step.label}</strong><small>{step.note}</small></div></div>; })}</div>}
              <div className="orderCardBottom"><div><span>Total</span><strong>{money(order.total)}</strong><small>{order.payment_method === 'cash_on_delivery' ? 'Cash on delivery · Payment ' + order.payment_status : order.payment_method === 'razorpay' ? 'Online payment · ' + order.payment_status : order.payment_method === 'demo' ? 'Demo payment · no money charged · unpaid' : order.payment_status}</small></div><div className="orderCardActions">{!cancelled && ['awaiting_payment','confirmed','processing'].includes(order.status) && <button className="commerceSecondary" onClick={() => void cancelOrder(order)} disabled={busyOrder === order.id}>{busyOrder === order.id ? 'Cancelling…' : 'Cancel order'}</button>}<Link className="orderHelpLink" href="/#shop">Shop again <ArrowRight size={14} /></Link></div></div>
            </article>;
          })}
        </section>
      )}
      <div className="ordersHelp"><Clock3 size={17} /><p><strong>Tracking updates</strong><br />Order stages are shown here when the store updates their status. Live courier tracking is not connected yet.</p></div>
      <footer className="commerceFooter"><Link className="detailLogo" href="/">kivora<span>.</span></Link><span>Thoughtfully found. Everyday loved.</span><Link href="/#shop">Shop all</Link></footer>
    </main>
  );
}
