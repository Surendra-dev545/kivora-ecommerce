'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ClipboardList, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Order = {
  id: string; order_number: string; customer_name: string; customer_email: string; customer_phone?: string | null;
  shipping_address: string; items: { name: string; quantity: number; line_total: number }[]; total: number;
  status: string; payment_method: string; payment_status: string; created_at: string;
};
const statuses = ['awaiting_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value));

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadOrders = useCallback(async () => {
    setLoading(true); setError('');
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    setSignedIn(Boolean(token));
    if (!token) { setError('Sign in with your store-owner account first.'); setLoading(false); return; }
    try {
      const response = await fetch('/api/admin/orders', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
      const result = await response.json() as { orders?: Order[]; error?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to load orders.');
      setOrders(result.orders ?? []);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load orders.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);
  const visibleOrders = useMemo(() => filter === 'all' ? orders : filter === 'pending' ? orders.filter((order) => ['awaiting_payment', 'confirmed'].includes(order.status)) : orders.filter((order) => order.status === filter), [orders, filter]);
  const counts = useMemo(() => ({ all: orders.length, pending: orders.filter((order) => ['awaiting_payment', 'confirmed'].includes(order.status)).length, processing: orders.filter((order) => order.status === 'processing').length, shipped: orders.filter((order) => order.status === 'shipped').length }), [orders]);

  async function updateStatus(order: Order, status: string) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setError('Your session expired. Please sign in again.'); return; }
    setBusy(order.id); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ orderId: order.id, status }) });
      const result = await response.json() as { order?: { status: string }; error?: string };
      if (!response.ok) throw new Error(result.error || 'Could not update order.');
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: result.order?.status ?? status } : item));
      setNotice(order.order_number + ' updated to ' + status.replaceAll('_', ' ') + '.');
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update order.'); }
    finally { setBusy(null); }
  }

  return <main className="commercePage adminOrdersPage">
    <header className="commerceHeader"><Link className="backLink" href="/"><ArrowLeft size={15} /> Storefront</Link><Link className="detailLogo" href="/">kivora<span>.</span></Link><span className="checkoutSecure"><ShieldCheck size={14} /> STORE ADMIN</span></header>
    <div className="commerceIntro"><span className="eyebrow"><span className="eyebrowLine" /> STORE MANAGEMENT</span><h1>Orders desk.</h1><p>Review customer orders, confirm them, and keep delivery statuses up to date.</p></div>
    <div className="adminTopActions"><span><ClipboardList size={17} /> {orders.length} total orders</span><button className="commerceSecondary" onClick={() => void loadOrders()} disabled={loading}><RefreshCw size={14} /> Refresh</button></div>
    <div className="adminStats"><button className={filter === 'all' ? 'adminStat adminStatActive' : 'adminStat'} onClick={() => setFilter('all')}><small>All orders</small><strong>{counts.all}</strong></button><button className={filter === 'pending' ? 'adminStat adminStatActive' : 'adminStat'} onClick={() => setFilter('pending')}><small>Awaiting action</small><strong>{counts.pending}</strong></button><button className={filter === 'processing' ? 'adminStat adminStatActive' : 'adminStat'} onClick={() => setFilter('processing')}><small>Processing</small><strong>{counts.processing}</strong></button><button className={filter === 'shipped' ? 'adminStat adminStatActive' : 'adminStat'} onClick={() => setFilter('shipped')}><small>Shipped</small><strong>{counts.shipped}</strong></button></div>
    {notice && <div className="commerceSuccess" role="status"><Check size={17} />{notice}</div>}
    {error && <p className="commerceError" role="alert">{error}{!signedIn && <> <Link href="/account">Sign in</Link></>}</p>}
    {loading ? <div className="commerceLoading"><RefreshCw size={19} /> Loading orders…</div> : visibleOrders.length === 0 ? <section className="commerceEmpty"><ClipboardList size={28} /><h2>No orders in this view</h2><p>New customer orders will appear here.</p></section> : <section className="adminOrderList">{visibleOrders.map((order) => <article className="adminOrderCard" key={order.id}>
      <div className="adminOrderHeading"><div><span className="orderEyebrow">ORDER NUMBER</span><h2>{order.order_number}</h2><p>{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p></div><span className={order.status === 'cancelled' ? 'orderStatus orderStatusCancelled' : 'orderStatus'}>{order.status.replaceAll('_', ' ')}</span></div>
      <div className="adminOrderDetails"><div><span>Customer</span><strong>{order.customer_name}</strong><small>{order.customer_email}</small>{order.customer_phone && <small>{order.customer_phone}</small>}</div><div><span>Delivery address</span><p>{order.shipping_address}</p></div><div><span>Payment</span><strong>{money(order.total)}</strong><small>{order.payment_method.replaceAll('_', ' ')} · {order.payment_status}</small></div></div>
      <div className="adminOrderItems">{(order.items ?? []).map((item, index) => <div key={index}><span>{item.name} × {item.quantity}</span><strong>{money(item.line_total)}</strong></div>)}</div>
      <div className="adminOrderFooter"><label>Update status<select value={order.status} disabled={busy === order.id} onChange={(event) => void updateStatus(order, event.target.value)}>{statuses.map((status) => <option value={status} key={status}>{status.replaceAll('_', ' ').replace(/^\w/, (char) => char.toUpperCase())}</option>)}</select></label><span>{busy === order.id ? 'Saving…' : 'Changes save immediately'}</span></div>
    </article>)}</section>}
    <footer className="commerceFooter"><Link className="detailLogo" href="/">kivora<span>.</span></Link><span>Customer details are visible to authorized store admins only.</span><Link href="/account">My account</Link></footer>
  </main>;
}
