'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Heart, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';

const products = [
  { id: 1, name: 'Everyday Carry Tote', category: 'Accessories', price: 3999, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=90', tag: 'Bestseller', description: 'A roomy, considered companion for every day.', details: ['An easy everyday shape with room for your essentials', 'Versatile styling for workdays and weekends', 'A thoughtful pick for life on the go'] },
  { id: 2, name: 'Cloud Knit Sweater', category: 'Fashion', price: 6499, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1200&q=90', tag: 'New in', description: 'Soft layers for slower mornings.', details: ['A relaxed, easy-to-style silhouette', 'A cozy layer for changing seasons', 'Designed to fit into your everyday wardrobe'] },
  { id: 3, name: 'Studio Headphones', category: 'Technology', price: 7999, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=90', description: 'Immersive sound, beautifully simple.', details: ['A clean, minimal look for your daily setup', 'Made for listening at home or on the move', 'A thoughtful addition to your tech essentials'] },
  { id: 4, name: 'Sculpted Water Bottle', category: 'Wellness', price: 1499, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=1200&q=90', description: 'A little reminder to slow down and hydrate.', details: ['A reusable everyday hydration companion', 'A clean shape that looks good on your desk', 'Easy to bring along through busy days'] },
  { id: 5, name: 'Weekend Sneakers', category: 'Fashion', price: 7499, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=90', tag: 'Customer favorite', description: 'Comfort made for all-day wandering.', details: ['A casual staple for everyday outfits', 'A versatile look for errands and weekends', 'Pairs easily with your favorite basics'] },
  { id: 6, name: 'Warm Glow Table Lamp', category: 'Home', price: 5299, image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=90', description: 'A softer kind of light for your space.', details: ['Adds a warm accent to your favorite corner', 'A simple silhouette for modern interiors', 'Made to complement a calm, considered space'] },
  { id: 7, name: 'Minimal Timepiece', category: 'Accessories', price: 9499, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=90', description: 'Timeless design, down to the details.', details: ['A pared-back look that works every day', 'An understated finishing touch', 'Easy to pair with casual or polished looks'] },
  { id: 8, name: 'Daily Ritual Skincare', category: 'Wellness', price: 2499, image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=1200&q=90', tag: 'Feel-good find', description: 'A simple, feel-good moment for your routine.', details: ['A considered addition to your self-care shelf', 'A simple ritual for a slower start or finish', 'A lovely everyday essential'] },
  { id: 9, name: 'Pocket Speaker', category: 'Technology', price: 4499, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=1200&q=90', description: 'Bring your favorite sound wherever you go.', details: ['A compact companion for your favorite playlists', 'A modern look for your home or desk', 'Easy to take along on everyday adventures'] },
  { id: 10, name: 'Sunday Sunglasses', category: 'Accessories', price: 2999, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=90', description: 'An easy finishing touch for sunny days.', details: ['A versatile shape for sunny-day styling', 'An easy accessory for weekends away', 'A simple finishing touch for everyday looks'] },
  { id: 11, name: 'Ceramic Pour-Over', category: 'Home', price: 2199, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=90', description: 'Make your everyday coffee feel like a ritual.', details: ['Bring a little ritual to your morning coffee', 'A considered piece for your kitchen shelf', 'Pairs beautifully with slow starts and quiet moments'] },
  { id: 12, name: 'Carry-All Wallet', category: 'Accessories', price: 1799, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1200&q=90', description: 'Small, useful, and thoughtfully made.', details: ['Keeps daily essentials close at hand', 'A compact companion for bags and pockets', 'A practical pick with a clean, timeless look'] },
];
const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [databaseProduct, setDatabaseProduct] = useState<null | { id: string; name: string; category: string; price: number; image: string; description: string; details: string[] }>(null);
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState(false);
  const product = databaseProduct ?? products.find((item) => item.id === Number(params.id));

  useEffect(() => {
    if (/^\d+$/.test(params.id)) return;
    let active = true;
    fetch('/api/products?id=' + encodeURIComponent(params.id), { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { product?: { id: string; name: string; category: string; price: number; image_url: string; description: string } };
      if (!active || !result.product) return;
      const item = result.product;
      setDatabaseProduct({ id: item.id, name: item.name, category: item.category, price: Number(item.price), image: item.image_url, description: item.description, details: item.description ? [item.description, 'Available stock is updated by Kivora.', 'Secure checkout and order tracking are available.'] : ['A product selected by Kivora.', 'Available stock is updated by Kivora.', 'Secure checkout and order tracking are available.'] });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [params.id]);

  function addToBag() {
    if (!product) return;
    try {
      const saved = window.localStorage.getItem('kivora-cart');
      const current = saved ? JSON.parse(saved) as Array<{ id: number | string; name: string; category: string; price: number; image: string; description: string }> : [];
      current.push({ id: product.id, name: product.name, category: product.category, price: product.price, image: product.image, description: product.description });
      window.localStorage.setItem('kivora-cart', JSON.stringify(current));
      setAdded(true);
    } catch {
      window.localStorage.setItem('kivora-cart', JSON.stringify([{ id: product.id, name: product.name, category: product.category, price: product.price, image: product.image, description: product.description }]));
      setAdded(true);
    }
  }

  if (!product) {
    return <main className="detailNotFound"><span className="eyebrow">A LITTLE DETOUR</span><h1>We couldn't find that find.</h1><p>This product may have moved. Explore the full Kivora collection instead.</p><Link className="primaryButton" href="/">Back to the collection <ArrowRight size={16} /></Link></main>;
  }

  return (
    <main className="productPage">
      <div className="detailTop"><Link href="/" className="backLink"><ArrowLeft size={15} /> Back to the collection</Link><Link className="detailLogo" href="/">kivora<span>.</span></Link><span className="detailTopNote"><Sparkles size={13} /> THE EVERYDAY EDIT</span></div>
      <div className="detailBreadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/#shop">Shop</Link><span>/</span><span>{product.category}</span><span>/</span><span>{product.name}</span></div>
      <section className="detailLayout">
        <div className="detailImageWrap"><img src={product.image} alt={product.name} className="detailImage" />{product.tag && <span className="detailTag">{product.tag}</span>}<span className="detailImageCaption">THOUGHTFULLY FOUND. EVERYDAY LOVED.</span></div>
        <div className="detailInfo"><span className="eyebrow"><span className="eyebrowLine" /> {product.category.toUpperCase()} · THE KIVORA EDIT</span><h1>{product.name}</h1><p className="detailDescription">{product.description}</p><div className="detailPrice">{money(product.price)}</div><div className="detailRule" /><p className="detailIntro">Good design should feel right at home in your everyday. This is one of those little things chosen to make daily life feel a bit more considered.</p>
          <ul className="detailBullets">{product.details.map((detail) => <li key={detail}><Check size={15} />{detail}</li>)}</ul>
          <div className="detailActions"><button className="detailAddButton" onClick={addToBag} disabled={added}>{added ? <><Check size={17} /> Added to your bag</> : <>Add to bag <ArrowRight size={17} /></>}</button><button className={saved ? 'detailSaveButton detailSaved' : 'detailSaveButton'} onClick={() => setSaved(!saved)} aria-label={saved ? 'Remove from saved items' : 'Save item'}><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button></div>
          {added && <p className="detailNotice" role="status">Added to your bag. <Link href="/checkout">Continue to checkout</Link> or <Link href="/#shop">keep exploring</Link>.</p>}
          <div className="detailPerks"><div><Truck size={18} /><span><b>Complimentary shipping</b><small>On orders over ₹4,999</small></span></div><div><ShieldCheck size={18} /><span><b>Thoughtfully selected</b><small>Everyday pieces, elevated</small></span></div></div>
          <div className="detailNote"><span>THE KIVORA PROMISE</span><p>Less noise. More meaning. A little more joy in the everyday.</p></div>
        </div>
      </section>
      <section className="detailMore"><div><span className="eyebrow"><span className="eyebrowLine" /> KEEP EXPLORING</span><h2>More good <em>things.</em></h2><p>Find another little upgrade for your everyday.</p></div><Link className="textLink" href="/#shop">Explore all products <ArrowRight size={16} /></Link></section>
      <footer className="detailFooter"><Link className="detailLogo" href="/">kivora<span>.</span></Link><span>© 2026 Kivora. Demo storefront.</span><Link href="/#shop">Shop all</Link></footer>
    </main>
  );
}
