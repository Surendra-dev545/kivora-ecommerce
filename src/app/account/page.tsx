'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AccountPage() {
  const [mode, setMode] = useState<'signin' | 'create'>('create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUserEmail(data.session?.user.email ?? null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
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
          setMessage('Your account has been created and you are signed in.');
        } else {
          setMessage('Account created. Check your email for a confirmation link before signing in.');
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        setUserEmail(data.user.email ?? email);
        setMessage('You are signed in. Welcome back!');
      }
      setPassword('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
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
          <p>Your Kivora account will make it easier to keep track of favorite finds and, when checkout is ready, your orders too.</p>
          <div className="accountBenefits">
            <div><span><HeartIcon /></span><p><b>Keep your favorites close</b><small>Save the pieces you love for later.</small></p></div>
            <div><span><ShieldCheck size={18} /></span><p><b>Your own little corner</b><small>A personal space for your shopping.</small></p></div>
            <div><span><Check size={18} /></span><p><b>More to come</b><small>Order history and faster checkout are on the roadmap.</small></p></div>
          </div>
          <div className="accountStoryImage" role="img" aria-label="Warm, calm home interior" />
        </div>
        <div className="accountFormPanel">
          <div className="accountFormHeading"><span className="accountFormIcon"><UserRound size={20} /></span><span className="eyebrow">WELCOME TO KIVORA</span><h2>{userEmail ? 'You’re signed in.' : mode === 'create' ? 'Create your account.' : 'Welcome back.'}</h2><p>{userEmail ? 'Your Kivora account is connected.' : mode === 'create' ? 'A few details to get you started.' : 'Your little finds are waiting.'}</p></div>
          {userEmail ? (
            <div className="accountFeedback" role="status">
              <span className="accountFeedbackIcon"><Check size={22} /></span>
              <h3>Welcome to Kivora.</h3>
              <p>You’re signed in as <strong>{userEmail}</strong>.</p>
              {message && <p>{message}</p>}
              <button type="button" className="primaryButton" onClick={handleSignOut}><LogOut size={16} /> Sign out</button>
            </div>
          ) : <>
            <div className="accountTabs" role="tablist" aria-label="Account access">
              <button type="button" role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'accountTab accountTabActive' : 'accountTab'} onClick={() => { setMode('create'); setMessage(''); setError(''); }}>Create account</button>
              <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'accountTab accountTabActive' : 'accountTab'} onClick={() => { setMode('signin'); setMessage(''); setError(''); }}>Sign in</button>
            </div>
            <form className="accountForm" onSubmit={handleSubmit}>
              {mode === 'create' && <label>Full name<div className="accountInputWrap"><UserRound size={16} /><input name="name" type="text" placeholder="Your name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></div></label>}
              <label>Email address<div className="accountInputWrap"><Mail size={16} /><input name="email" type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></label>
              <label>Password<div className="accountInputWrap"><LockKeyhole size={16} /><input name="password" type="password" placeholder="At least 8 characters" minLength={8} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required /></div></label>
              {error && <p className="accountAuthError" role="alert">{error}</p>}
              {message && <p className="accountAuthMessage" role="status">{message}</p>}
              {mode === 'create' && <p className="accountFinePrint">By continuing, you agree to our terms and privacy policy. These links will be added when account services are connected.</p>}
              <button className="accountSubmit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'create' ? 'Create account' : 'Sign in'} {!busy && <ArrowRight size={17} />}</button>
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
