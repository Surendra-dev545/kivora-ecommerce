'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react';

export default function AccountPage() {
  const [mode, setMode] = useState<'signin' | 'create'>('create');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
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
          <div className="accountFormHeading"><span className="accountFormIcon"><UserRound size={20} /></span><span className="eyebrow">WELCOME TO KIVORA</span><h2>{mode === 'create' ? 'Create your account.' : 'Welcome back.'}</h2><p>{mode === 'create' ? 'A few details to get you started.' : 'Your little finds are waiting.'}</p></div>
          <div className="accountTabs" role="tablist" aria-label="Account access">
            <button type="button" role="tab" aria-selected={mode === 'create'} className={mode === 'create' ? 'accountTab accountTabActive' : 'accountTab'} onClick={() => { setMode('create'); setSubmitted(false); }}>Create account</button>
            <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'accountTab accountTabActive' : 'accountTab'} onClick={() => { setMode('signin'); setSubmitted(false); }}>Sign in</button>
          </div>
          {submitted ? <div className="accountFeedback" role="status"><span className="accountFeedbackIcon"><Check size={22} /></span><h3>You're all set to preview.</h3><p>This account form is a design preview only. Secure sign-in and account storage haven't been connected yet, so no details were sent or saved.</p><button type="button" className="primaryButton" onClick={() => setSubmitted(false)}>Back to form <ArrowRight size={16} /></button></div> : <form className="accountForm" onSubmit={handleSubmit}>
            {mode === 'create' && <label>Full name<div className="accountInputWrap"><UserRound size={16} /><input name="name" type="text" placeholder="Your name" autoComplete="name" required /></div></label>}
            <label>Email address<div className="accountInputWrap"><Mail size={16} /><input name="email" type="email" placeholder="you@example.com" autoComplete="email" required /></div></label>
            <label>Password<div className="accountInputWrap"><LockKeyhole size={16} /><input name="password" type="password" placeholder="At least 8 characters" minLength={8} autoComplete={mode === 'create' ? 'new-password' : 'current-password'} required /></div></label>
            {mode === 'create' && <p className="accountFinePrint">By continuing, you agree to our terms and privacy policy. These links will be added when account services are connected.</p>}
            <button className="accountSubmit" type="submit">{mode === 'create' ? 'Create account' : 'Sign in'} <ArrowRight size={17} /></button>
            <p className="accountDemoNotice"><ShieldCheck size={15} /> Preview only — secure account services aren't connected yet.</p>
          </form>}
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
