'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent, CSSProperties } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Box, Check, PackagePlus, Plus, RefreshCw, Save, Search } from 'lucide-react';

type Product = {
  id: string; name: string; slug: string; description: string; category: string;
  sku: string | null; price: number; compare_at_price: number | null; image_url: string;
  stock_quantity: number; low_stock_threshold: number; is_active: boolean;
};
type FormState = {
  name: string; slug: string; category: string; description: string; sku: string;
  price: string; compare_at_price: string; image_url: string; stock_quantity: string;
  low_stock_threshold: string; is_active: boolean;
};
const emptyForm: FormState = {
  name: '', slug: '', category: '', description: '', sku: '', price: '',
  compare_at_price: '', image_url: '', stock_quantity: '0', low_stock_threshold: '5', is_active: false,
};
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadProducts = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setError('Please sign in with your store administrator account.'); return; }
      const response = await fetch('/api/admin/products', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load products.');
      setProducts(result.products ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load products.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadProducts(); }, [loadProducts]);

  const resetForm = () => { setEditing(null); setForm(emptyForm); setNotice(''); };
  const editProduct = (p: Product) => {
    setEditing(p.id);
    setForm({
      name: p.name, slug: p.slug, category: p.category, description: p.description ?? '',
      sku: p.sku ?? '', price: String(p.price), compare_at_price: p.compare_at_price == null ? '' : String(p.compare_at_price),
      image_url: p.image_url ?? '', stock_quantity: String(p.stock_quantity),
      low_stock_threshold: String(p.low_stock_threshold), is_active: p.is_active,
    });
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Please sign in again.');
      const response = await fetch('/api/admin/products', {
        method: editing ? 'PATCH' : 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, productId: editing, stock_reason: 'correction', stock_note: 'Updated from product manager' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save product.');
      setNotice(editing ? 'Product updated.' : 'Product created.');
      resetForm();
      await loadProducts();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save product.'); }
    finally { setSaving(false); }
  }

  const visible = products.filter((p) => (p.name + ' ' + p.category + ' ' + (p.sku ?? '')).toLowerCase().includes(search.toLowerCase()));
  const lowStock = products.filter((p) => p.stock_quantity <= p.low_stock_threshold).length;
  const active = products.filter((p) => p.is_active).length;

  const fieldStyle: CSSProperties = { width: '100%', padding: '11px 12px', border: '1px solid #dfe3dc', borderRadius: 8, background: '#fff', color: '#243329', fontSize: 13 };
  const labelStyle: CSSProperties = { display: 'grid', gap: 6, color: '#59665b', fontSize: 12, fontWeight: 600 };

  return <main style={{ minHeight: '100vh', background: '#f5f7f4', color: '#243329', padding: '28px 18px 60px' }}>
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div><Link href="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#667568', textDecoration: 'none', fontSize: 12, marginBottom: 13 }}><ArrowLeft size={15}/> Admin dashboard</Link><h1 style={{ margin: 0, fontSize: 30, letterSpacing: '-.04em' }}>Products & inventory</h1><p style={{ margin: '7px 0 0', color: '#738075', fontSize: 13 }}>Manage your catalogue, pricing and available stock.</p></div>
        <Link href="/" style={{ color: '#31533d', fontSize: 13 }}>View storefront ↗</Link>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 22 }}>
        {[['Total products', products.length, Box], ['Active listings', active, Check], ['Low stock alerts', lowStock, PackagePlus]].map(([label, value, Icon]: any) => <div key={label} style={{ background: '#fff', border: '1px solid #e4e9e2', borderRadius: 12, padding: 17 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#738075', fontSize: 12 }}><Icon size={16}/>{label}</div><strong style={{ display: 'block', fontSize: 26, marginTop: 10 }}>{value}</strong></div>)}
      </section>

      <section style={{ background: '#fff', border: '1px solid #e4e9e2', borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 }}><h2 style={{ fontSize: 18, margin: 0 }}>{editing ? 'Edit product' : 'Add a product'}</h2>{editing && <button onClick={resetForm} type="button" style={{ border: 0, background: 'transparent', color: '#526c59', cursor: 'pointer' }}>Cancel edit</button>}</div>
        <form onSubmit={saveProduct} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14 }}>
          <label style={labelStyle}>Product name<input required maxLength={160} style={fieldStyle} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="e.g. Everyday backpack"/></label>
          <label style={labelStyle}>Category<input required maxLength={80} style={fieldStyle} value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="e.g. Bags"/></label>
          <label style={labelStyle}>Selling price (₹)<input required type="number" min="0" step="0.01" style={fieldStyle} value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></label>
          <label style={labelStyle}>MRP / compare-at price (₹)<input type="number" min="0" step="0.01" style={fieldStyle} value={form.compare_at_price} onChange={e=>setForm({...form,compare_at_price:e.target.value})} placeholder="Optional"/></label>
          <label style={labelStyle}>Available stock<input required type="number" min="0" step="1" style={fieldStyle} value={form.stock_quantity} onChange={e=>setForm({...form,stock_quantity:e.target.value})}/></label>
          <label style={labelStyle}>Low-stock alert at<input required type="number" min="0" step="1" style={fieldStyle} value={form.low_stock_threshold} onChange={e=>setForm({...form,low_stock_threshold:e.target.value})}/></label>
          <label style={labelStyle}>SKU / product code<input maxLength={80} style={fieldStyle} value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} placeholder="Optional unique code"/></label>
          <label style={labelStyle}>URL slug<input maxLength={120} style={fieldStyle} value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} placeholder="Generated from product name"/></label>
          <label style={{...labelStyle,gridColumn:'1/-1'}}>Product image URL<input type="url" style={fieldStyle} value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} placeholder="https://…"/></label>
          <label style={{...labelStyle,gridColumn:'1/-1'}}>Description<textarea rows={3} maxLength={5000} style={{...fieldStyle,resize:'vertical'}} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
          <label style={{ display:'flex',alignItems:'center',gap:9,fontSize:13,color:'#425348',gridColumn:'1/-1' }}><input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/> Publish this product on the storefront</label>
          <div style={{gridColumn:'1/-1',display:'flex',justifyContent:'flex-end'}}><button disabled={saving} type="submit" style={{display:'inline-flex',alignItems:'center',gap:9,padding:'12px 19px',border:0,borderRadius:8,background:'#294936',color:'#fff',fontWeight:600,cursor:'pointer',opacity: saving ? 0.65 : 1}}>{saving ? <RefreshCw size={16}/> : <Save size={16}/>} {saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}</button></div>
        </form>
        {notice && <p role="status" style={{color:'#287044',fontSize:13,marginBottom:0}}>{notice}</p>}
        {error && <p role="alert" style={{color:'#b42318',fontSize:13,marginBottom:0}}>{error}</p>}
      </section>

      <section style={{ background:'#fff',border:'1px solid #e4e9e2',borderRadius:14,overflow:'hidden' }}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:18,flexWrap:'wrap'}}><h2 style={{fontSize:18,margin:0}}>Your catalogue <span style={{fontSize:12,color:'#89938a'}}>({visible.length})</span></h2><div style={{display:'flex',gap:8,alignItems:'center'}}><label style={{display:'flex',alignItems:'center',gap:7,border:'1px solid #e0e5de',borderRadius:8,padding:'8px 10px'}}><Search size={15}/><input aria-label="Search products" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products" style={{border:0,outline:0,width:150,fontSize:12}}/></label><button onClick={()=>void loadProducts()} aria-label="Refresh products" style={{border:'1px solid #e0e5de',borderRadius:8,padding:9,background:'#fff',cursor:'pointer'}}><RefreshCw size={15}/></button></div></div>
        {loading ? <p style={{padding:22,color:'#778278',fontSize:13}}>Loading products…</p> : visible.length === 0 ? <div style={{padding:30,textAlign:'center',color:'#78847a'}}><Box size={25}/><p>No products found. Add your first product above.</p></div> : <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:680}}><thead><tr style={{background:'#f7f9f6',textAlign:'left',color:'#758176'}}>{['Product','Category','Price','Stock','Storefront',''].map(x=><th key={x} style={{padding:'12px 15px',fontWeight:600}}>{x}</th>)}</tr></thead><tbody>{visible.map(p=><tr key={p.id} style={{borderTop:'1px solid #edf0eb'}}><td style={{padding:'13px 15px'}}><div style={{display:'flex',alignItems:'center',gap:11}}>{p.image_url ? <img src={p.image_url} alt="" style={{width:42,height:48,objectFit:'cover',borderRadius:6,background:'#eef1ec'}}/> : <div style={{width:42,height:48,display:'grid',placeItems:'center',background:'#eef1ec',borderRadius:6}}><Box size={17}/></div>}<span><b style={{display:'block',fontSize:12}}>{p.name}</b><small style={{color:'#8a948b'}}>{p.sku || p.slug}</small></span></div></td><td style={{padding:'13px 15px'}}>{p.category}</td><td style={{padding:'13px 15px',fontWeight:600}}>{money(Number(p.price))}</td><td style={{padding:'13px 15px'}}><span style={{color:p.stock_quantity<=p.low_stock_threshold?'#b54708':'#3b6847',fontWeight:600}}>{p.stock_quantity}</span><small style={{display:'block',color:'#929b92'}}>Alert at {p.low_stock_threshold}</small></td><td style={{padding:'13px 15px'}}><span style={{padding:'5px 8px',borderRadius:20,background:p.is_active?'#e8f3e9':'#f0f1ef',color:p.is_active?'#2f6c3e':'#737b74'}}>{p.is_active?'Published':'Hidden'}</span></td><td style={{padding:'13px 15px'}}><button onClick={()=>editProduct(p)} style={{border:'1px solid #dce4db',background:'#fff',borderRadius:7,padding:'7px 11px',cursor:'pointer',color:'#36553f'}}>Edit</button></td></tr>)}</tbody></table></div>}
      </section>
      <p style={{fontSize:11,color:'#89938a',lineHeight:1.6,marginTop:16}}>Inventory quantities are owner-managed. Existing orders and payment records are not changed by this catalogue manager.</p>
    </div>
  </main>;
}
