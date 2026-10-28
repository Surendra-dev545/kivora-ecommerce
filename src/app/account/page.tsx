'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound, LogOut, MapPin, Package, MessageSquare, Save, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AccountPage() {
  const router = useRouter();
  const [accessType, setAccessType] = useState<'customer' | 'admin'>('customer');
  const [mode, setMode] = useState<'signin' | 'create'>('create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'signin') setMode('signin');
    if (params.get('access') === 'admin') { setAccessType('admin'); setMode('signin'); }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setUserEmail(data.session?.user.email ?? null);
        setUserName((data.session?.user.user_metadata?.full_name as string | undefined) ?? null);
        setAddress((data.session?.user.user_metadata?.delivery_address as string | undefined) ?? '');
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      setUserName((session?.user.user_metadata?.full_name as string | undefined) ?? null);
      setAddress((session?.user.user_metadata?.delivery_address as string | undefined) ?? '');
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'create') {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin + '/account' },
        });
        if (authError) throw authError;
        if (data.session) {
          setUserEmail(data.session.user.email ?? email);
          setUserName((data.session.user.user_metadata?.full_name as string | undefined) ?? name);
          setAddress((data.session.user.user_metadata?.delivery_address as string | undefined) ?? '');
          setMessage('Your account has been created and you are signed in.');
        } else {
          setMessage('Account created. Check your email for a confirmation link before signing in.');
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        setUserEmail(data.user.email ?? email);
        setUserName((data.user.user_metadata?.full_name as string | undefined) ?? null);
        setAddress((data.user.user_metadata?.delivery_address as string | undefined) ?? '');
        if (accessType === 'admin') { router.push('/admin/orders'); return; }
        setMessage('You are signed in. Welcome back!');
      }
      setPassword('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSavingAddress(true); setError(''); setMessage('');
    const { data, error: updateError } = await supabase.auth.updateUser({ data: { full_name: userName ?? '', delivery_address: address.trim() } });
    if (updateError) setError(updateError.message);
    else { setUserName((data.user.user_metadata?.full_name as string | undefined) ?? userName); setMessage('Your delivery address has been saved.'); }
    setSavingAddress(false);
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSendingFeedback(true); setError(''); setMessage('');
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setError('Please sign in again to send feedback.'); setSendingFeedback(false); return; }
    const { error: feedbackError } = await supabase.from('customer_feedback').insert({ user_id: auth.user.id, rating, message: feedback.trim() });
    if (feedbackError) setError(feedbackError.message.includes('customer_feedback') ? 'Feedback setup is not finished yet. Please try again after the store update is complete.' : feedbackError.message);
    else { setFeedback(''); setRating(5); setMessage('Thank you! Your feedback has been sent to Kivora.'); }
    setSendingFeedback(false);
  }

  async function handleSignOut() {
    setError('');
    setMessage('');
    const { error: authError } = await supabase.auth.signOut();
    if (authError) setError(authError.message);
    else setMessage('You have signed out.');
  }

  return (
    <main className="accountPage">
      <header className="accountHeader">
        <Link className="backLink" href="/"><ArrowLeft size={15} /> Back to shopping</Link>
        <Link className="detailLogo" href="/">kivora<span>.</span></Link>
        <span className="accountHeaderNote"><Sparkles size={13} /> YOUR KIVORA</span>
      </header>
      <section className="accountLayout">
        <div className="accountStory">
          <span className="eyebrow"><span className="eyebrowLine" /> A LITTLE SPACE OF YOUR OWN</span>
          <h1>Good things,<br /><em>all in one place.</em></h1>
          <p>Your Kivora account keeps your details, order history and delivery updates together in one place.</p>
          <div className="accountBenefits">
            <div><span><HeartIcon /></span><p><b>Keep your favorites close</b><small>Save the pieces you love for later.</small></p></div>
            <div><span><ShieldCheck size={18} /></span><p><b>Your own little corner</b><small>A personal space for your shopping.</small></p></div>
            <div><span><Check size={18} /></span><p><b>Your orders, all in one place</b><small>Review purchases and follow delivery progress.</small></p></div>
          </div>
          <div className="accountStoryImage" role="img" aria-label="Warm, calm home interior" />
        </div>
        <div className="accountFormPanel">
          <div className="accountFormHeading"><span className="accountFormIcon"><UserRound size={20} /></span><span className="eyebrow">WELCOME TO KIVORA</span><h2>{userEmail ? 'You’re signed in.' : mode === 'create' ? 'Create your account.' : 'Welcome back.'}</h2><p>{userEmail ? 'Your Kivora account is connected.' : mode === 'create' ? 'A few details to get you started.' : 'Your little finds are waiting.'}</p></div>
          {userEmail ? (
            <div className="accountDashboard">
              <div className="accountWelcome"><span className="accountFeedbackIcon"><UserRound size={21} /></span><div><h3>Hello{userName ? `, ${userName}` : ''}!</h3><p>{userEmail}</p></div><button type="button" className="accountSignOut" onClick={handleSignOut}><LogOut size={14} /> Sign out</button></div>
              <div className="accountQuickLinks">
                <Link href="/account/orders"><Package size={19} /><span><b>My orders</b><small>Track, cancel and review orders</small></span><ArrowRight size={16} /></Link>
                <a href="#saved-address"><MapPin size={19} /><span><b>Saved address</b><small>Manage your delivery details</small></span><ArrowRight size={16} /></a>
                <a href="#customer-feedback"><MessageSquare size={19} /><span><b>Help & feedback</b><small>Tell us how we can improve</small></span><ArrowRight size={16} /></a>
              </div>
              <form id="saved-address" className="accountProfileForm" onSubmit={saveAddress}>
                <h3><MapPin size={17} /> Delivery address</h3>
                <label>Full name<input value={userName ?? ''} onChange={(event) => setUserName(event.target.value)} placeholder="Name for delivery" required /></label>
                <label>Address<textarea value={address} onChange={(event) => setAddress(event.target.value)} rows={3} placeholder="Flat / house, street, area, city, state and PIN code" required /></label>
                <button className="accountSubmit" type="submit" disabled={savingAddress}>{savingAddress ? 'Saving…' : 'Save address'} <Save size={15} /></button>
              </form>
              <form id="customer-feedback" className="accountProfileForm" onSubmit={submitFeedback}>
                <h3><MessageSquare size={17} /> Share your feedback</h3>
                <p className="accountFeedbackHint">Your thoughts help us make Kivora better.</p>
                <div className="ratingPicker" role="group" aria-label="Rating out of five">{[1,2,3,4,5].map((value) => <button key={value} type="button" aria-label={value + ' star' + (value > 1 ? 's' : '')} aria-pressed={rating === value} className={value <= rating ? 'ratingStar ratingStarActive' : 'ratingStar'} onClick={() => setRating(value)}><Star size={19} fill={value <= rating ? 'currentColor' : 'none'} /></button>)}</div>
                <label>Your feedback<textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} minLength={3} maxLength={2000} rows={3} placeholder="What went well, or what could be better?" required /></label>
                <button className="accountSubmit" type="submit" disabled={sendingFeedback}>{sendingFeedback ? 'Sending…' : 'Send feedback'} <ArrowRight size={16} /></button>
              </form>
              {error && <p className="accountAuthError" role="alert">{error}</p>}
              {message && <p className="accountAuthMessage" role="status">{message}</p>}
              <Link className="accountAdminLink" href="/admin/orders">Store admin <ArrowRight size={14} /></Link>
            </div>
          ) : <>
            <label className="accountAccessChoice">Account type<select value={accessType} onChange={(event) => { const next = event.target.value as 'customer' | 'admin'; setAccessType(next); if (next === 'admin') setMode('signin'); setError(''); setMessage(''); }}><option value="customer">Customer</option><option value="admin">Admin</option></select></label>
          {accessType === 'customer' ? <div className="accountTabs" role="tablist" aria-label="Account access">
              <button type="button" role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'accountTab accountTabActive' : 'accountTab'} onClick={() => { setMode('create'); setMessage(''); setError(''); }}>Create account</button>
              <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'accountTab accountTabActive' : 'accountTab'} onClick={() => { setMode('signin'); setMessage(''); setError(''); }}>Sign in</button>
            </div> : <p className="accountAuthMessage">Admin sign-in · Authorized account only</p>}
            <form className="accountForm" onSubmit={handleSubmit}>
              {accessType === 'customer' && mode === 'create' && <label>Full name<div className="accountInputWrap"><UserRound size={16} /><input name="name" type="text" placeholder="Your name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></div></label>}
              <label>Email address<div className="accountInputWrap"><Mail size={16} /><input name="email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></label>
              <label>Password<div className="accountInputWrap"><LockKeyhole size={16} /><input name="password" type="password" placeholder="At least 8 characters" minLength={8} autoComplete={accessType === 'customer' && mode === 'create' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required /></div></label>
              {error && <p className="accountAuthError" role="alert">{error}</p>}
              {message && <p className="accountAuthMessage" role="status">{message}</p>}
              {accessType === 'customer' && mode === 'create' && <p className="accountFinePrint">By continuing, you agree to our terms and privacy policy. These links will be added when account services are connected.</p>}
              <button className="accountSubmit" type="submit" disabled={busy}>{busy ? 'Please wait…' : accessType === 'admin' ? 'Admin sign in' : mode === 'create' ? 'Create account' : 'Sign in'} {!busy && <ArrowRight size={17} />}</button>
              <p className="accountDemoNotice"><ShieldCheck size={15} /> Secure sign-in powered by Supabase.</p>
            </form>
          </>}
          <div className="accountFormBottom"><span>Just browsing?</span> <Link href="/#shop">Explore the collection <ArrowRight size={14} /></Link></div>
        </div>
      </section>
      <footer className="accountFooter"><Link className="detailLogo" href="/">kivora<span>.</span></Link><span>© 2026 Kivora. Demo storefront.</span><span>Thoughtfully found. Everyday loved.</span></footer>
    </main>
  );
}

function HeartIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg>;
}
