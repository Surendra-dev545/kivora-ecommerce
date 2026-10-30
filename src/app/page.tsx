'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, Menu, Search, ShoppingBag, Sparkles, UserRound, X } from 'lucide-react';

type Product = { id: number | string; name: string; category: string; price: number; image: string; tag?: string; description: string };

const products: Product[] = [
  { id: 1, name: 'Everyday Carry Tote', category: 'Accessories', price: 3999, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=85', tag: 'Bestseller', description: 'A roomy, considered companion for every day.' },
  { id: 2, name: 'Cloud Knit Sweater', category: 'Fashion', price: 6499, image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=85', tag: 'New in', description: 'Soft layers for slower mornings.' },
  { id: 3, name: 'Studio Headphones', category: 'Technology', price: 7999, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=85', description: 'Immersive sound, beautifully simple.' },
  { id: 4, name: 'Sculpted Water Bottle', category: 'Wellness', price: 1499, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=85', description: 'A little reminder to slow down and hydrate.' },
  { id: 5, name: 'Weekend Sneakers', category: 'Fashion', price: 7499, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85', tag: 'Customer favorite', description: 'Comfort made for all-day wandering.' },
  { id: 6, name: 'Warm Glow Table Lamp', category: 'Home', price: 5299, image: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85', description: 'A softer kind of light for your space.' },
  { id: 7, name: 'Minimal Timepiece', category: 'Accessories', price: 9499, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85', description: 'Timeless design, down to the details.' },
  { id: 8, name: 'Daily Ritual Skincare', category: 'Wellness', price: 2499, image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85', tag: 'Feel-good find', description: 'A simple, feel-good moment for your routine.' },
  { id: 9, name: 'Pocket Speaker', category: 'Technology', price: 4499, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=85', description: 'Bring your favorite sound wherever you go.' },
  { id: 10, name: 'Sunday Sunglasses', category: 'Accessories', price: 2999, image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85', description: 'An easy finishing touch for sunny days.' },
  { id: 11, name: 'Ceramic Pour-Over', category: 'Home', price: 2199, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85', description: 'Make your everyday coffee feel like a ritual.' },
  { id: 12, name: 'Carry-All Wallet', category: 'Accessories', price: 1799, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=85', description: 'Small, useful, and thoughtfully made.' },
  { id: 13, name: 'Kivora Nova 5G Smartphone', category: 'Mobiles', price: 14999, image: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=85', tag: 'Sample listing', description: 'Illustrative smartphone listing; confirm model and stock before selling.' },
  { id: 14, name: 'Kivora Edge Smartphone', category: 'Mobiles', price: 18999, image: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&q=85', tag: 'Sample listing', description: 'Illustrative smartphone listing; confirm model and stock before selling.' },
  { id: 15, name: 'Kivora Lite Smartphone', category: 'Mobiles', price: 9999, image: 'https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?auto=format&fit=crop&w=900&q=85', tag: 'Sample listing', description: 'Illustrative smartphone listing; confirm model and stock before selling.' },
  { id: 16, name: 'Fresh Tomatoes (1 kg)', category: 'Vegetables', price: 40, image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=85', tag: 'Sample listing', description: 'Illustrative price per 1 kg. Update daily based on local market rates.' },
  { id: 17, name: 'Fresh Potatoes (1 kg)', category: 'Vegetables', price: 35, image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=85', tag: 'Sample listing', description: 'Illustrative price per 1 kg. Update daily based on local market rates.' },
  { id: 18, name: 'Fresh Onions (1 kg)', category: 'Vegetables', price: 45, image: 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=900&q=85', tag: 'Sample listing', description: 'Illustrative price per 1 kg. Update daily based on local market rates.' },
  { id: 19, name: 'Butter Cookies (Pack)', category: 'Biscuits', price: 50, image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=900&q=85', tag: 'Sample listing', description: 'Illustrative biscuit pack; update brand, weight and final price.' },
  { id: 20, name: 'Chocolate Cream Biscuits', category: 'Biscuits', price: 30, image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=900&q=85', tag: 'Sample listing', description: 'Illustrative biscuit pack; update brand, weight and final price.' },
  { id: 21, name: 'Digestive Biscuits (Pack)', category: 'Biscuits', price: 45, image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=900&q=85', tag: 'Sample listing', description: 'Illustrative biscuit pack; update brand, weight and final price.' },
  { id: 22, name: 'Vanilla Ice Cream (500 ml)', category: 'Ice Creams', price: 120, image: 'https://images.unsplash.com/photo-1501446529957-6226bd447c46?auto=format&fit=crop&w=900&q=85', tag: 'Sample listing', description: 'Illustrative 500 ml tub; confirm brand, availability and cold-chain delivery.' },
  { id: 23, name: 'Chocolate Ice Cream (500 ml)', category: 'Ice Creams', price: 150, image: 'https://images.unsplash.com/photo-1560008581-09826d1de69e?auto=format&fit=crop&w=900&q=85', tag: 'Sample listing', description: 'Illustrative 500 ml tub; confirm brand, availability and cold-chain delivery.' },
  { id: 24, name: 'Strawberry Ice Cream (500 ml)', category: 'Ice Creams', price: 140, image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=900&q=85', tag: 'Sample listing', description: 'Illustrative 500 ml tub; confirm brand, availability and cold-chain delivery.' },
];

const categories = ['All', 'Fashion', 'Home', 'Technology', 'Accessories', 'Wellness', 'Mobiles', 'Vegetables', 'Biscuits', 'Ice Creams'];
const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export default function Home() {
  const [catalog, setCatalog] = useState<Product[]>(products);
  const [catalogSource, setCatalogSource] = useState<'samples' | 'database'>('samples');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Product[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [favorites, setFavorites] = useState<Array<number | string>>([]);
  const [added, setAdded] = useState<number | string | null>(null);

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem('kivora-cart');
      if (savedCart) setCart(JSON.parse(savedCart) as Product[]);
    } catch {
      window.localStorage.removeItem('kivora-cart');
    } finally {
      setCartLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (cartLoaded) window.localStorage.setItem('kivora-cart', JSON.stringify(cart));
  }, [cart, cartLoaded]);

  useEffect(() => {
    let active = true;
    fetch('/api/products', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { products?: Array<{ id: string; name: string; category: string; price: number; image_url: string; description: string; stock_quantity: number }> };
      if (!active || !Array.isArray(result.products)) return;
      setCatalog(result.products.map((p) => ({
        id: p.id, name: p.name, category: p.category, price: Number(p.price),
        image: p.image_url, description: p.description,
        tag: p.stock_quantity <= 5 ? 'Limited stock' : undefined,
      })));
      setCatalogSource('database');
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const visibleCategories = useMemo(() => Array.from(new Set([...categories, ...catalog.map((p) => p.category)])).filter((value) => value === 'All' || catalog.some((p) => p.category === value)), [catalog]);
  const filtered = useMemo(() => catalog.filter((p) => (category === 'All' || p.category === category) && (p.name + ' ' + p.description + ' ' + p.category).toLowerCase().includes(search.toLowerCase())), [catalog, category, search]);
  const total = cart.reduce((sum, p) => sum + p.price, 0);
  const addToCart = (product: Product) => { setCart((current) => [...current, product]); setAdded(product.id); window.setTimeout(() => setAdded((current) => current === product.id ? null : current), 1400); };
  const scrollToShop = () => { document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenu(false); };

  return (
    <>
      <div className="announcement"><Sparkles size={13} /> A LITTLE SOMETHING GOOD <span className="announcementDot">•</span> Complimentary shipping on orders over ₹4,999</div>
      <div className="siteWrap">
        <header className="nav">
          <button className="mobileMenu iconButton" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle navigation">{mobileMenu ? <X size={21} /> : <Menu size={21} />}</button>
          <a className="logo" href="#" aria-label="Kivora home">kivora<span>.</span></a>
          <nav className={mobileMenu ? 'navLinks navLinksOpen' : 'navLinks'} aria-label="Main navigation">
            <a href="#shop" onClick={() => setMobileMenu(false)}>Shop all</a><a href="#shop" onClick={() => { setCategory('Fashion'); setMobileMenu(false); }}>Fashion</a><a href="#shop" onClick={() => { setCategory('Home'); setMobileMenu(false); }}>Home & living</a><a href="#shop" onClick={() => { setCategory('Mobiles'); setMobileMenu(false); }}>Mobiles</a><a href="#shop" onClick={() => { setCategory('Vegetables'); setMobileMenu(false); }}>Vegetables</a><a href="#shop" onClick={() => { setCategory('Biscuits'); setMobileMenu(false); }}>Biscuits</a><a href="#shop" onClick={() => { setCategory('Ice Creams'); setMobileMenu(false); }}>Ice creams</a><a href="#story" onClick={() => setMobileMenu(false)}>Our story</a>
          </nav>
          <div className="navActions">
            <label className="searchBox"><Search size={17} /><input aria-label="Search products" value={search} onChange={(e) => { setSearch(e.target.value); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }} placeholder="Search" /></label>
            <a className="accountLink" href="/account" aria-label="Your account"><UserRound size={18} /><span>Account</span></a><button className="bagButton" onClick={() => setCartOpen(true)} aria-label={`Open shopping bag, ${cart.length} items`}><ShoppingBag size={19} /><span>Bag</span><span className="bagCount">{cart.length}</span></button>
          </div>
        </header>

        <main>
          <section className="hero">
            <div className="heroCopy"><span className="eyebrow"><span className="eyebrowLine" /> THE ART OF EVERYDAY</span><h1>Good things.<br /><em>Better living.</em></h1><p>Thoughtfully picked pieces for the way you live, work, unwind and go.</p><button className="primaryButton" onClick={scrollToShop}>Explore the collection <ArrowUpRight size={17} /></button><div className="heroNote"><span className="avatarStack"><i>✦</i><i>♡</i><i>✳</i></span><span>Loved by people who love the little things.</span></div></div>
            <div className="heroVisual"><img className="heroPhoto" src="https://images.unsplash.com/photo-1490312278390-ab64016e0aa9?auto=format&fit=crop&w=1400&q=90" alt="Warm, curated modern living space" /><div className="heroPhotoShade" /><div className="heroStamp"><span>THE KIVORA EDIT</span><strong>Made for<br />your everyday.</strong><ArrowUpRight size={19} /></div><div className="floatingNote"><span className="floatingIcon"><Sparkles size={18} /></span><span><b>Little things, big joy</b><small>Find your new favorite</small></span></div><span className="heroIndex">01 / 04 — THE EVERYDAY EDIT</span></div>
          </section>

          <section className="valueStrip" aria-label="Store benefits"><div><span className="valueIcon">✳</span><span><b>Thoughtfully chosen</b><small>Quality over clutter</small></span></div><div><span className="valueIcon">↗</span><span><b>Made for real life</b><small>Useful, beautiful essentials</small></span></div><div><span className="valueIcon">♡</span><span><b>A little more joy</b><small>Good things, good feelings</small></span></div><div><span className="valueIcon">◎</span><span><b>Easy everyday shopping</b><small>Free shipping over ₹4,999</small></span></div></section>

          <section className="shopSection" id="shop"><div className="sectionHeading"><div><span className="eyebrow"><span className="eyebrowLine" /> THE GOOD STUFF</span><h2>Find your <em>favorite.</em></h2><p>Little upgrades, everyday groceries and treats in one place.</p><p className="resultCount">{catalogSource === 'database' ? 'Live catalogue · prices and available stock are managed by Kivora.' : 'Preview catalogue · apply the product catalogue migration to manage live listings and stock.'}</p></div><button className="textLink" onClick={() => { setCategory('All'); setSearch(''); }}>View all products <ArrowRight size={16} /></button></div>
            <div className="shopToolbar"><div className="categoryFilters" aria-label="Filter products">{visibleCategories.map((c) => <button key={c} className={category === c ? 'filterPill filterActive' : 'filterPill'} onClick={() => setCategory(c)}>{c}</button>)}</div><span className="resultCount">{filtered.length} pieces</span></div>
            {filtered.length ? <div className="productGrid">{filtered.map((p, index) => <article className="productCard" key={p.id}><div className="productPhotoWrap"><img className="productPhoto" src={p.image} alt={p.name} loading={index > 3 ? 'lazy' : 'eager'} /><span className="productCategory">{p.category}</span>{p.tag && <span className="productTag">{p.tag}</span>}<button className={favorites.includes(p.id) ? 'favoriteButton favorited' : 'favoriteButton'} onClick={() => setFavorites((current) => current.includes(p.id) ? current.filter((id) => id !== p.id) : [...current, p.id])} aria-label={favorites.includes(p.id) ? `Remove ${p.name} from favorites` : `Add ${p.name} to favorites`}><Heart size={17} fill={favorites.includes(p.id) ? 'currentColor' : 'none'} /></button><button className="quickAdd" onClick={() => addToCart(p)}>{added === p.id ? <><Check size={15} /> Added to bag</> : <>Quick add <span>+</span></>}</button></div><div className="productDetails"><div><h3><a className="productNameLink" href={`/products/${p.id}`}>{p.name}</a></h3><p>{p.description}</p></div><strong>{money(p.price)}</strong></div></article>)}</div> : <div className="noResults"><Search size={24} /><h3>No little treasures found</h3><p>Try another search or explore all of our finds.</p><button className="primaryButton" onClick={() => { setSearch(''); setCategory('All'); }}>Show all products</button></div>}
          </section>

          <section className="editorial" id="story"><div className="editorialPhoto"><img src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85" alt="Thoughtfully styled home with warm natural textures" loading="lazy" /><span className="photoCaption">SLOW DOWN. LOOK CLOSER.</span></div><div className="editorialCopy"><span className="eyebrow"><span className="eyebrowLine" /> A LITTLE MORE INTENTIONAL</span><h2>Make room for<br /><em>the good stuff.</em></h2><p>We believe the things you bring into your life should earn their place. So we look for thoughtful details, everyday usefulness and the kind of design that makes you feel something.</p><p>Less noise. More meaning. A little more Kivora.</p><button className="textLink" onClick={scrollToShop}>Get to know the collection <ArrowRight size={16} /></button></div></section>

          <section className="newsletter"><span className="eyebrow">GOOD THINGS, OCCASIONALLY</span><h2>A little joy in your inbox.</h2><p>New finds, thoughtful ideas and first looks at what's next.</p><form onSubmit={(e) => { e.preventDefault(); alert('Thanks for your interest! Newsletter sign-up will be connected in a future update.'); }} className="newsletterForm"><input type="email" aria-label="Email address" placeholder="Your email address" required /><button type="submit" aria-label="Sign up for newsletter"><ArrowRight size={18} /></button></form><small>No noise, just the good stuff.</small></section>
        </main>
      </div>
      <footer className="footer"><div className="siteWrap"><div className="footerTop"><div><a className="logo footerLogo" href="#">kivora<span>.</span></a><p>Everyday finds, elevated.</p></div><div className="footerLinks"><a href="#shop">Shop all</a><a href="#story">Our story</a><a href="mailto:hello@kivora.example">Contact</a></div><div className="footerSignoff">Made for the life you love. <span>✳</span></div></div><div className="footerBottom"><span>© 2026 Kivora. Demo storefront.</span><span>Thoughtfully found. Everyday loved.</span></div></div></footer>

      {cartOpen && <div className="drawerBackdrop" onClick={() => setCartOpen(false)}><aside className="cartDrawer" role="dialog" aria-modal="true" aria-label="Shopping bag" onClick={(e) => e.stopPropagation()}><div className="drawerHeader"><div><span className="eyebrow">YOUR LITTLE FINDS</span><h2>Your bag <span>({cart.length})</span></h2></div><button className="iconButton" onClick={() => setCartOpen(false)} aria-label="Close shopping bag"><X size={21} /></button></div>{cart.length === 0 ? <div className="emptyBag"><span className="emptyBagIcon"><ShoppingBag size={27} /></span><h3>Your bag is taking a little break.</h3><p>It's ready when you find something you love.</p><button className="primaryButton" onClick={() => { setCartOpen(false); scrollToShop(); }}>Explore the collection <ArrowRight size={16} /></button></div> : <><div className="cartItems">{cart.map((p, index) => <div className="cartItem" key={`${p.id}-${index}`}><img src={p.image} alt="" /><div><b>{p.name}</b><small>{p.category}</small><button className="removeItem" onClick={() => setCart((current) => current.filter((_, i) => i !== index))}>Remove</button></div><strong>{money(p.price)}</strong></div>)}</div><div className="cartSummary"><div className="shippingMessage">{total >= 4999 ? 'You unlocked complimentary shipping!' : `You're ${money(4999 - total)} away from complimentary shipping.`}</div><div className="shippingTrack"><span style={{ width: `${Math.min(100, (total / 4999) * 100)}%` }} /></div><div className="cartTotal"><span>Subtotal</span><strong>{money(total)}</strong></div><p>Shipping and taxes calculated at checkout.</p><button className="checkoutButton" onClick={() => { window.location.assign('/checkout'); }}>Continue to checkout <ArrowRight size={17} /></button><button className="continueShopping" onClick={() => setCartOpen(false)}>Keep browsing</button></div></>}</aside></div>}
    </>
  );
}
