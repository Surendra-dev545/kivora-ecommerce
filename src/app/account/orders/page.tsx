'use client';

import './orders-tracking.css';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BadgeCheck, CalendarClock, Check, Clock3,
  MapPin, Package, PackageCheck, RefreshCw, Radio, ShieldCheck,
  Truck, XCircle,
} from 'lucide-react';
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
  updated_at?: string;
};
const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount));
const steps = [
  { key: 'confirmed', label: 'Order confirmed', note: 'Your order is confirmed and in our system.', icon: BadgeCheck },
  { key: 'processing', label: 'Being prepared', note: 'We are getting your items ready.', icon: Package },
  { key: 'shipped', label: 'Shipped', note: 'Your package has left our facility.', icon: PackageCheck },
  { key: 'out_for_delivery', label: 'Out for delivery', note: 'Your package is with the delivery partner for its final journey.', icon: Truck },
  { key: 'delivered', label: 'Delivered', note: 'Your order has reached you. Enjoy!', icon: Check },
];
const statusLabel = (status: Order['status']) => status === 'out_for_delivery' ? 'Out for delivery' : status === 'awaiting_payment' ? 'Awaiting payment' : status.replaceAll('_', ' ').replace(/^\w/, (char) => char.toUpperCase());
const dateLabel = (value: string) => new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyOrder, setBusyOrder] = useState<string | null>(null);
  const [live, setLive] = useState<'connecting' | 'live' | 'fallback'>('connecting');
  const [lastSync, setLastSync] = useState('');

  const loadOrders = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
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
    else {
      setOrders((data ?? []) as Order[]);
      setLastSync(new Date().toISOString());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadOrders();
    const placed = new URLSearchParams(window.location.search).get('placed');
    if (placed) setNotice('Thank you! Order ' + placed + ' has been placed successfully.');
  }, [loadOrders]);

  // Supabase Realtime gives instant updates; a quiet polling fallback keeps the page fresh if a socket drops.
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      channel = supabase
        .channel('customer-order-tracking-' + data.user.id)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'orders',
          filter: 'user_id=eq.' + data.user.id,
        }, (payload) => {
          const updated = payload.new as Partial<Order>;
          setOrders((current) => current.map((order) => order.id === updated.id ? { ...order, ...updated } as Order : order));
          setLastSync(new Date().toISOString());
        })
        .subscribe((status) => {
          if (!cancelled) setLive(status === 'SUBSCRIBED' ? 'live' : 'fallback');
        });
      poll = setInterval(() => { void loadOrders(false); }, 20000);
    });

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [loadOrders]);

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
      await loadOrders(false);
    }
    setBusyOrder(null);
  }

  return (
    <main className="commercePage trackingPage">
      <header className="commerceHeader trackingHeader">
        <Link className="backLink" href="/"><ArrowLeft size={15} /> Back to shopping</Link>
        <Link className="detailLogo" href="/">kivora<span>.</span></Link>
        <Link className="checkoutSecure" href="/account">MY ACCOUNT <ArrowRight size={14} /></Link>
      </header>

      <section className="trackingHero">
        <div>
          <span className="eyebrow"><span className="eyebrowLine" /> YOUR KIVORA ACCOUNT</span>
          <h1>Your orders<span>.</span></h1>
          <p>Every order, every update, all in one place.</p>
          {email && <p className="ordersSignedIn">Signed in as <strong>{email}</strong></p>}
        </div>
        <div className="trackingHeroMark"><PackageCheck size={31} strokeWidth={1.3} /><span>THOUGHTFULLY<br/>ON ITS WAY</span></div>
      </section>

      {notice && <div className="commerceSuccess" role="status"><Check size={18} />{notice}<button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}><XCircle size={16} /></button></div>}
      {error && <p className="commerceError" role="alert">{error}</p>}

      {loading ? <div className="commerceLoading"><RefreshCw size={19} /> Loading your orders…</div> : !email ? (
        <section className="commerceEmpty"><Package size={30} /><h2>Sign in to view your orders</h2><p>Your purchases are kept private to your Kivora account.</p><Link className="commercePrimary" href="/account">Sign in <ArrowRight size={16} /></Link></section>
      ) : orders.length === 0 ? (
        <section className="commerceEmpty"><Package size={30} /><h2>No orders just yet</h2><p>When you place an order, its confirmation and delivery progress will appear here.</p><Link className="commercePrimary" href="/#shop">Explore the collection <ArrowRight size={16} /></Link></section>
      ) : (
        <section className="trackingOrders">
          <div className="trackingSectionHead"><div><span className="trackingOverline">ORDER ACTIVITY</span><h2>Your shopping journey</h2></div><span className="trackingLive"><i className={live === 'live' ? 'trackingLiveDot' : 'trackingLiveDot trackingLiveDotMuted'} />{live === 'live' ? 'LIVE UPDATES' : 'AUTO REFRESH ON'}</span></div>
          {orders.map((order) => {
            const cancelled = order.status === 'cancelled';
            const waiting = order.status === 'awaiting_payment';
            const activeIndex = steps.findIndex((step) => step.key === order.status);
            const progress = cancelled || waiting ? 0 : Math.max(0, activeIndex) / (steps.length - 1) * 100;
            return <article className="trackingOrderCard" key={order.id}>
              <div className="trackingOrderTop">
                <div><span className="trackingOverline">ORDER ID</span><h3>{order.order_number}</h3><p>Placed {dateLabel(order.created_at)}</p></div>
                <span className={cancelled ? 'trackingStatus trackingStatusCancelled' : 'trackingStatus'}>{statusLabel(order.status)}</span>
              </div>

              <div className={cancelled ? 'trackingJourney trackingJourneyCancelled' : 'trackingJourney'}>
                <div className="trackingJourneyBanner">
                  <div className="trackingJourneyIcon">{cancelled ? <XCircle size={23}/> : waiting ? <Clock3 size={23}/> : order.status === 'delivered' ? <PackageCheck size={23}/> : <Truck size={23}/>}</div>
                  <div><span className="trackingOverline">{cancelled ? 'ORDER UPDATE' : waiting ? 'ACTION REQUIRED' : 'DELIVERY STATUS'}</span><h4>{cancelled ? 'This order was cancelled' : waiting ? 'Payment is pending' : order.status === 'delivered' ? 'Your order has been delivered' : order.status === 'out_for_delivery' ? 'Your order is out for delivery' : 'Your order is moving along'}</h4><p>{cancelled ? 'If you have already paid, contact support for refund assistance.' : waiting ? 'Complete payment to move your order into confirmation.' : steps[Math.max(0, activeIndex)]?.note}</p></div>
                </div>

                {!cancelled && !waiting && <div className="trackingProgress">
                  <div className="trackingProgressRail"><span style={{ width: progress + '%' }} /></div>
                  <div className="trackingSteps">{steps.map((step, index) => {
                    const Icon = step.icon;
                    const done = activeIndex >= index;
                    const current = activeIndex === index;
                    return <div className={'trackingStep' + (done ? ' trackingStepDone' : '') + (current ? ' trackingStepCurrent' : '')} key={step.key}>
                      <span className="trackingStepIcon">{done ? <Check size={14}/> : <Icon size={14}/>}</span>
                      <span>{step.label}</span>
                    </div>;
                  })}</div>
                </div>}
                {['shipped', 'out_for_delivery'].includes(order.status) && <DeliveryMap orderId={order.id} />}
                {waiting && <div className="trackingDeliveryNote"><Clock3 size={17}/><div><strong>Waiting for payment</strong><span>Your order timeline will begin once the payment is confirmed.</span></div></div>}
              </div>

              <div className="trackingItems">
                <div className="trackingBlockTitle"><span>IN THIS ORDER</span><span>{order.items?.length ?? 0} item{order.items?.length === 1 ? '' : 's'}</span></div>
                {(order.items ?? []).map((item, index) => <div className="trackingItem" key={index}><img src={item.image} alt={item.name}/><div><strong>{item.name}</strong><small>{item.category} · Qty {item.quantity}</small></div><b>{money(item.line_total)}</b></div>)}
              </div>

              <div className="trackingBottom">
                <div className="trackingInfoCell"><MapPin size={16}/><div><span>DELIVERING TO</span><p>{order.shipping_address || 'Address saved at checkout'}</p></div></div>
                <div className="trackingInfoCell"><CalendarClock size={16}/><div><span>LAST ORDER UPDATE</span><p>{dateLabel(order.updated_at || order.created_at)}</p></div></div>
              </div>
              <div className="trackingOrderFooter">
                <div><span>ORDER TOTAL</span><strong>{money(order.total)}</strong><small>{order.payment_method === 'cash_on_delivery' ? 'Cash on delivery · ' + order.payment_status : order.payment_method === 'razorpay' ? 'Online payment · ' + order.payment_status : order.payment_method === 'demo' ? 'Demo payment · unpaid' : order.payment_status}</small></div>
                <div className="trackingOrderActions">{!cancelled && ['awaiting_payment','confirmed','processing'].includes(order.status) && <button className="commerceSecondary" onClick={() => void cancelOrder(order)} disabled={busyOrder === order.id}>{busyOrder === order.id ? 'Cancelling…' : 'Cancel order'}</button>}<Link className="trackingShopLink" href="/#shop">Shop again <ArrowRight size={14}/></Link></div>
              </div>
            </article>;
          })}
          <div className="trackingSync"><Radio size={15}/><span>Order status syncs automatically{lastSync ? ' · Last checked ' + new Date(lastSync).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : ''}.</span><button type="button" onClick={() => void loadOrders(false)} aria-label="Refresh orders"><RefreshCw size={14}/></button></div>
        </section>
      )}

      <div className="trackingTrust"><ShieldCheck size={18}/><p><strong>Your order details stay private.</strong><br/>Only you can view the orders linked to your signed-in account.</p></div>
      <footer className="commerceFooter"><Link className="detailLogo" href="/">kivora<span>.</span></Link><span>Thoughtfully found. Everyday loved.</span><Link href="/#shop">Shop all</Link></footer>
    </main>
  );
}


function DeliveryMap({orderId}:{orderId:string}) {
  const [expanded,setExpanded]=useState(false);
  const [location,setLocation]=useState<{latitude:number;longitude:number;updated_at:string}|null>(null);
  const [message,setMessage]=useState('Waiting for the rider to share their GPS location…');
  useEffect(()=>{
    if(!expanded)return;
    let alive=true;
    const refresh=async()=>{
      const {data}=await supabase.auth.getSession();const token=data.session?.access_token;
      if(!token)return;
      try{
        const response=await fetch('/api/account/delivery-location?orderId='+encodeURIComponent(orderId),{headers:{Authorization:'Bearer '+token},cache:'no-store'});
        const result=await response.json();if(!response.ok)throw new Error(result.error);
        if(!alive)return;
        if(result.location){setLocation(result.location);setMessage('Rider location received.');}
        else{setLocation(null);setMessage('Waiting for the rider to start GPS sharing.');}
      }catch{if(alive)setMessage('Live location is temporarily unavailable.');}
    };
    void refresh();const timer=window.setInterval(()=>void refresh(),10000);
    const channel=supabase.channel('delivery-location-'+orderId).on('postgres_changes',{event:'*',schema:'public',table:'order_delivery_tracking',filter:'order_id=eq.'+orderId},()=>void refresh()).subscribe();
    return()=>{alive=false;window.clearInterval(timer);void supabase.removeChannel(channel)};
  },[orderId,expanded]);
  return <div className="trackingLivePanel">
    <button type="button" className="trackingMapToggle" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded}>
      <MapPin size={16}/><span>{expanded?'Hide live delivery':'Track live delivery'}</span><span className="trackingMapToggleArrow">{expanded?'−':'+'}</span>
    </button>
    {expanded && (!location
      ? <div className="trackingDeliveryNote"><MapPin size={17}/><div><strong>Waiting for rider location</strong><span>{message}</span></div></div>
      : <DeliveryMapFrame location={location} />)}
  </div>;
}

function DeliveryMapFrame({location}:{location:{latitude:number;longitude:number;updated_at:string}}) {
  const lat=location.latitude,lon=location.longitude;
  const bbox=[lon-0.008,lat-0.006,lon+0.008,lat+0.006].join('%2C');
  const mapUrl='https://www.openstreetmap.org/export/embed.html?bbox='+bbox+'&layer=mapnik&marker='+lat+'%2C'+lon;
  return <div style={{margin:'16px 0',border:'1px solid #e4e0da',borderRadius:12,overflow:'hidden'}}>
    <div style={{padding:'12px 14px',display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong>Live rider location</strong><span style={{fontSize:12,color:'#666'}}>Updated {new Date(location.updated_at).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'})}</span></div>
    <iframe title="Live delivery rider map" src={mapUrl} loading="lazy" style={{width:'100%',height:260,border:0}} />
    <div style={{padding:'10px 14px',fontSize:12,color:'#666'}}>Location is shared by your assigned Kivora rider while delivery tracking is active.</div>
  </div>;
}
