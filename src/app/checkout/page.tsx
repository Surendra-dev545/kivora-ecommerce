'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, LockKeyhole, PackageCheck, ShieldCheck, ShoppingBag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCountries, getCountryCallingCode, isValidPhoneNumber } from 'libphonenumber-js';

type CartProduct = { id: number | string; name: string; category: string; price: number; image: string; description?: string };
type PaymentMethod = 'cash_on_delivery' | 'razorpay' | 'demo';
type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  modal: { ondismiss: () => void };
};
type RazorpayInstance = { open: () => void; on: (event: string, callback: (response: unknown) => void) => void };
declare global { interface Window { Razorpay?: new (options: RazorpayOptions) => RazorpayInstance } }

const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryIso, setCountryIso] = useState('IN');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');

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

  const countryOptions = useMemo(() => {
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    return getCountries().map((code) => ({
      code,
      name: names.of(code) ?? code,
      dial: getCountryCallingCode(code),
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);
  const selectedCountry = countryOptions.find((country) => country.code === countryIso) ?? {
    code: countryIso,
    name: countryIso,
    dial: getCountryCallingCode(countryIso as never),
  };

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
    if (phone.trim() && !isValidPhoneNumber('+' + selectedCountry.dial + phone.replace(/\D/g, ''))) {
      setError('Enter a valid phone number for the selected country code.');
      return;
    }
    setReviewing(true);
  }

  async function placeOrder() {
    setBusy(true);
    setError('');
    let orderId: string | null = null;
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
        customer_phone: phone.trim() ? '+' + selectedCountry.dial + ' ' + phone.replace(/\D/g, '') : null,
        shipping_address: address.trim(),
        items,
        subtotal,
        shipping_fee: shipping,
        total,
        status: paymentMethod === 'razorpay' ? 'awaiting_payment' : 'confirmed',
        payment_method: paymentMethod,
        payment_status: 'pending',
      }).select('id, order_number').single();
      if (insertError) throw insertError;
      orderId = data.id;

      if (paymentMethod === 'cash_on_delivery' || paymentMethod === 'demo') {
        window.localStorage.removeItem('kivora-cart');
        setCart([]);
        router.push('/account/orders?placed=' + encodeURIComponent(data.order_number));
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (sessionError || !accessToken) throw new Error('Your sign-in session expired. Please sign in and try again.');

      const gatewayResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
        body: JSON.stringify({ orderId }),
      });
      const gateway = await gatewayResponse.json() as { keyId?: string; razorpayOrderId?: string; amount?: number; currency?: string; error?: string };
      if (!gatewayResponse.ok || !gateway.keyId || !gateway.razorpayOrderId || !gateway.amount) {
        throw new Error(gateway.error || 'Online payment could not be started. Please try again or choose cash on delivery.');
      }

      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) throw new Error('The secure payment window could not load. Please check your connection and try again.');

      const checkout = new window.Razorpay({
        key: gateway.keyId,
        amount: gateway.amount,
        currency: gateway.currency || 'INR',
        name: 'Kivora',
        description: 'Order ' + data.order_number,
        order_id: gateway.razorpayOrderId,
        prefill: { name: name.trim(), email: authData.user.email ?? email, contact: phone.trim() ? '+' + selectedCountry.dial + phone.replace(/\D/g, '') : '' },
        theme: { color: '#243d32' },
        handler: async (response) => {
          try {
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + accessToken },
              body: JSON.stringify({ orderId, ...response }),
            });
            const verified = await verifyResponse.json() as { error?: string; success?: boolean };
            if (!verifyResponse.ok || !verified.success) throw new Error(verified.error || 'Payment verification failed.');
            window.localStorage.removeItem('kivora-cart');
            setCart([]);
            router.push('/account/orders?placed=' + encodeURIComponent(data.order_number));
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Payment was received but could not be verified. Please contact support before retrying.');
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setError('Payment was not completed. Your order is saved as awaiting payment; you can try again or choose cash on delivery.');
            setBusy(false);
          },
        },
      });
      checkout.on('payment.failed', () => {
        setError('Payment failed or was cancelled. Please try again or choose cash on delivery.');
        setBusy(false);
      });
      checkout.open();
    } catch (caught) {
      if (orderId && paymentMethod === 'razorpay') {
        await supabase.rpc('cancel_my_order', { p_order_id: orderId });
      }
      setError(caught instanceof Error ? caught.message : 'We could not place your order. Please try again.');
      setReviewing(false);
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
                <label>Phone number <span className="optionalLabel">Optional</span>
                  <div className="phoneInputGroup">
                    <select value={countryIso} onChange={(event) => setCountryIso(event.target.value)} aria-label="Country calling code">
                      {countryOptions.map((country) => <option key={country.code} value={country.code}>{country.name} (+{country.dial})</option>)}
                    </select>
                    <input value={phone} onChange={(event) => setPhone(event.target.value.replace(/[^\d\s()-]/g, '').slice(0, 20))} type="tel" autoComplete="tel-national" placeholder="Mobile number" />
                  </div>
                </label>
                <label>Full delivery address<textarea value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" required rows={4} placeholder="House / flat, street, area, city, state and PIN code" /></label>
                <div className="commerceSectionHeading"><span>02</span><div><h2>Payment method</h2><p>Choose how you would like to pay.</p></div></div>
                <label className="paymentChoice">
                  <input type="radio" name="paymentMethod" value="razorpay" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} />
                  <span className="paymentChoiceIcon"><CreditCard size={18} /></span>
                  <span><b>Pay online</b><small>Credit/debit cards, UPI, net banking and supported wallets via Razorpay.</small></span>
                  <CheckCircle2 size={18} />
                </label>
                <label className="paymentChoice">
                  <input type="radio" name="paymentMethod" value="demo" checked={paymentMethod === 'demo'} onChange={() => setPaymentMethod('demo')} />
                  <span className="paymentChoiceIcon"><CreditCard size={18} /></span>
                  <span><b>Demo payment (test only)</b><small>Place a test order without charging money. This does not verify a real payment.</small></span>
                  <CheckCircle2 size={18} />
                </label>
                <label className="paymentChoice">
                  <input type="radio" name="paymentMethod" value="cash_on_delivery" checked={paymentMethod === 'cash_on_delivery'} onChange={() => setPaymentMethod('cash_on_delivery')} />
                  <span className="paymentChoiceIcon"><PackageCheck size={18} /></span>
                  <span><b>Cash on delivery</b><small>Pay when your order arrives.</small></span>
                  <CheckCircle2 size={18} />
                </label>
                {error && <p className="commerceError" role="alert">{error}</p>}
                <button className="commercePrimary commerceWide" type="submit" disabled={!cart.length}>Review order <ArrowRight size={16} /></button>
              </form>
            ) : (
              <div className="commerceForm">
                <div className="commerceSectionHeading"><span>03</span><div><h2>Confirm your order</h2><p>Check these details before you place it.</p></div></div>
                <div className="reviewDetail"><small>DELIVER TO</small><strong>{name}</strong><span>{phone ? '+' + selectedCountry.dial + ' ' + phone : 'No phone number added'}</span><span>{email}</span><p>{address}</p><button type="button" className="commerceTextButton" onClick={() => setReviewing(false)}>Edit delivery details</button></div>
                <div className="reviewDetail"><small>PAYMENT</small><strong>{paymentMethod === 'razorpay' ? 'Online payment via Razorpay' : paymentMethod === 'demo' ? 'Demo payment — no money charged' : 'Cash on delivery'}</strong><span>{paymentMethod === 'razorpay' ? 'Choose credit/debit card, UPI, net banking or supported wallets in the secure payment window.' : paymentMethod === 'demo' ? 'Testing only. No payment is processed and this order will remain unpaid.' : 'Pay when the package arrives.'}</span></div>
                <p className="commerceConfirmCopy">By choosing “{paymentMethod === 'razorpay' ? 'Continue to secure payment' : 'Place order'}”, you confirm that the delivery details and items above are correct.</p>
                {error && <p className="commerceError" role="alert">{error}</p>}
                <button className="commercePrimary commerceWide" onClick={placeOrder} disabled={busy}>{busy ? (paymentMethod === 'razorpay' ? 'Opening secure payment…' : 'Placing your order…') : (paymentMethod === 'razorpay' ? 'Continue to secure payment' : paymentMethod === 'demo' ? 'Place demo order (no charge)' : 'Confirm and place order')} <ArrowRight size={16} /></button>
                <button className="commerceSecondary commerceWide" onClick={() => { setReviewing(false); setError(''); }} disabled={busy}>Cancel and go back</button>
              </div>
            )}
          </section>
          <aside className="checkoutPanel orderSummaryPanel">
            <div className="commerceSectionHeading"><span><ShoppingBag size={17} /></span><div><h2>Order summary</h2><p>{cart.length} {cart.length === 1 ? 'item' : 'items'} in your bag</p></div></div>
            <div className="checkoutItems">{cart.map((item, index) => <div className="checkoutItem" key={index}><img src={item.image} alt="" /><div><strong>{item.name}</strong><small>{item.category}</small></div><b>{money(item.price)}</b></div>)}</div>
            <div className="checkoutMoneyRow"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            <div className="checkoutMoneyRow"><span>Delivery</span><strong>{shipping === 0 ? 'Free' : money(shipping)}</strong></div>
            <div className="checkoutTotal"><span>Total</span><strong>{money(total)}</strong></div>
            <p className="checkoutFinePrint"><ShieldCheck size={14} /> Online payments are verified securely before an order is marked paid.</p>
          </aside>
        </div>
      )}
      <footer className="commerceFooter"><Link className="detailLogo" href="/">kivora<span>.</span></Link><span>Thoughtfully found. Everyday loved.</span><Link href="/account/orders">Track an order</Link></footer>
    </main>
  );
}
