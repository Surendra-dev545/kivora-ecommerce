'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, PackageCheck, ShieldCheck, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type CartProduct = { id: number; name: string; category: string; price: number; image: string; description?: string };
const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('kivora-cart');
      if (saved) setCart(JSON.parse(saved) as CartProduct[]);
    } catch {
      window.localStorage.removeItem('kivora-cart');
    }
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (user) {
        setSignedIn(true);
        setEmail(user.email ?? '');
        setName((user.user_metadata?.full_name as string | undefined) ?? '');
      }
      setLoading(false);
    });
  }, []);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price, 0), [cart]);
  const shipping = subtotal === 0 || subtotal >= 4999 ? 0 : 199;
  const total = subtotal + shipping;

  function reviewOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!signedIn) {
      router.push('/account');
      return;
    }
    if (!cart.length) {
      setError('Your bag is empty. Add a product before checking out.');
      return;
    }
    setReviewing(true);
  }

  async function placeOrder() {
    setBusy(true);
    setError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        router.push('/account');
        return;
      }
      const orderNumber = 'KVR-' + crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
      const items = cart.map((item) => ({
        product_id: item.id,
        name: item.name,
        category: item.category,
        image: item.image,
        unit_price: item.price,
        quantity: 1,
        line_total: item.price,
      }));
      const { data, error: insertError } = await supabase.from('orders').insert({
        user_id: authData.user.id,
        order_number: orderNumber,
        customer_name: name.trim(),
        customer_email: authData.user.email ?? email,
        customer_phone: phone.trim() || null,
        shipping_address: address.trim(),
        items,
        subtotal,
        shipping_fee: shipping,
        total,
        status: 'confirmed',
        payment_method: 'cash_on_delivery',
        payment_status: 'pending',
      }).select('id, order_number').single();
      if (insertError) throw insertError;
      window.localStorage.removeItem('kivora-cart');
      setCart([]);
      router.push('/account/orders?placed=' + encodeURIComponent(data.order_number));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not place your order. Please try again.');
      setReviewing(false);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="commercePage"><p className="commerceLoading">Preparing your checkout…</p></main>;

  return (
    <main className="commercePage">
      <header className="commerceHeader">
        <Link className="backLink" href="/"><ArrowLeft size={15} /> Continue shopping</Link>
        <Link className="detailLogo" href="/">kivora<span>.</span></Link>
        <span className="checkoutSecure"><LockKeyhole size={14} /> SECURE CHECKOUT</span>
      </header>
      <div className="commerceIntro">
        <span className="eyebrow"><span className="eyebrowLine" /> ALMOST YOURS</span>
        <h1>{reviewing ? 'One last look.' : 'Make it yours.'}</h1>
        <p>{reviewing ? 'Please review your delivery details and order total before confirming.' : 'A few delivery details, then you can review your order before placing it.'}</p>
      </div>

      {!signedIn ? <section className="commerceNotice"><ShieldCheck size={22} /><div><h2>Sign in to place your order</h2><p>Your orders are saved to your Kivora account so you can check their status later.</p><Link className="commercePrimary" href="/account">Sign in or create an account <ArrowRight size={16} /></Link></div></section> : null}

      {!cart.length && !loading ? <section className="commerceEmpty"><ShoppingBag size={30} /><h2>Your bag is empty</h2><p>Find something lovely and it will be waiting here.</p><Link className="commercePrimary" href="/#shop">Explore the collection <ArrowRight size={16} /></Link></section> : (
        <div className="checkoutGrid">
          <section className="checkoutPanel">
            {!reviewing ? (
              <form className="commerceForm" onSubmit={reviewOrder}>
                <div className="commerceSectionHeading"><span>01</span><div><h2>Delivery details</h2><p>Where should we send your order?</p></div></div>
                <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required placeholder="Name for delivery" /></label>
                <label>Email address<input value={email} readOnly type="email" autoComplete="email" /></label>
                <label>Phone number <span className="optionalLabel">Optional</span><input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" placeholder="Contact number for delivery" /></label>
                <label>Full delivery address<textarea value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" required rows={4} placeholder="House / flat, street, area, city, state and PIN code" /></label>
                <div className="paymentChoice"><span className="paymentChoiceIcon"><PackageCheck size={18} /></span><div><b>Cash on delivery</b><small>Payment is collected when your order arrives. Online payment is not connected yet.</small></div><CheckCircle2 size={18} /></div>
                {error && <p className="commerceError" role="alert">{error}</p>}
                <button className="commercePrimary commerceWide" type="submit" disabled={!cart.length}>Review order <ArrowRight size={16} /></button>
              </form>
            ) : (
              <div className="commerceForm">
                <div className="commerceSectionHeading"><span>02</span><div><h2>Confirm your order</h2><p>Check these details before you place it.</p></div></div>
                <div className="reviewDetail"><small>DELIVER TO</small><strong>{name}</strong><span>{phone || 'No phone number added'}</span><span>{email}</span><p>{address}</p><button type="button" className="commerceTextButton" onClick={() => setReviewing(false)}>Edit delivery details</button></div>
                <div className="reviewDetail"><small>PAYMENT</small><strong>Cash on delivery</strong><span>Pay when the package arrives.</span></div>
                <p className="commerceConfirmCopy">By choosing “Place order”, you confirm that the delivery details and items above are correct.</p>
                {error && <p className="commerceError" role="alert">{error}</p>}
                <button className="commercePrimary commerceWide" onClick={placeOrder} disabled={busy}>{busy ? 'Placing your order…' : 'Confirm and place order'} <ArrowRight size={16} /></button>
                <button className="commerceSecondary commerceWide" onClick={() => setReviewing(false)} disabled={busy}>Cancel and go back</button>
              </div>
            )}
          </section>
          <aside className="checkoutPanel orderSummaryPanel">
            <div className="commerceSectionHeading"><span><ShoppingBag size={17} /></span><div><h2>Order summary</h2><p>{cart.length} {cart.length === 1 ? 'item' : 'items'} in your bag</p></div></div>
            <div className="checkoutItems">{cart.map((item, index) => <div className="checkoutItem" key={index}><img src={item.image} alt="" /><div><strong>{item.name}</strong><small>{item.category}</small></div><b>{money(item.price)}</b></div>)}</div>
            <div className="checkoutMoneyRow"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            <div className="checkoutMoneyRow"><span>Delivery</span><strong>{shipping === 0 ? 'Free' : money(shipping)}</strong></div>
            <div className="checkoutTotal"><span>Total</span><strong>{money(total)}</strong></div>
            <p className="checkoutFinePrint"><ShieldCheck size={14} /> Your order is saved to your account. Payment gateway integration is a future step.</p>
          </aside>
        </div>
      )}
      <footer className="commerceFooter"><Link className="detailLogo" href="/">kivora<span>.</span></Link><span>Thoughtfully found. Everyday loved.</span><Link href="/account/orders">Track an order</Link></footer>
    </main>
  );
}
