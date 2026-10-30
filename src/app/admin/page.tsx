import Link from 'next/link';
import { ArrowLeft, ArrowRight, ClipboardList, Package, Store } from 'lucide-react';

const tileStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 22, border: '1px solid #e1e8df', borderRadius: 14, background: '#fff', color: '#263b2d', textDecoration: 'none' };

export default function AdminHomePage() {
  return <main style={{ minHeight: '100vh', background: '#f5f7f4', color: '#243329', padding: '32px 18px' }}>
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: '#667568', textDecoration: 'none', fontSize: 12, marginBottom: 22 }}><ArrowLeft size={15}/> Storefront</Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}><Store size={23}/><span style={{ fontSize: 13, letterSpacing: '.12em', textTransform: 'uppercase', color: '#718071' }}>Kivora store owner</span></div>
      <h1 style={{ fontSize: 34, letterSpacing: '-.04em', margin: '0 0 9px' }}>Admin dashboard</h1>
      <p style={{ color: '#778278', fontSize: 14, margin: '0 0 28px' }}>Manage your single-owner store, catalogue, stock and customer orders.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
        <Link href="/admin/products" style={tileStyle}><span style={{ display: 'flex', alignItems: 'center', gap: 14 }}><Package size={25}/><span><b style={{ display: 'block', fontSize: 16 }}>Products & inventory</b><small style={{ display: 'block', color: '#788579', marginTop: 5 }}>Add listings, update prices and manage stock</small></span></span><ArrowRight size={18}/></Link>
        <Link href="/admin/orders" style={tileStyle}><span style={{ display: 'flex', alignItems: 'center', gap: 14 }}><ClipboardList size={25}/><span><b style={{ display: 'block', fontSize: 16 }}>Customer orders</b><small style={{ display: 'block', color: '#788579', marginTop: 5 }}>Review orders and update fulfilment status</small></span></span><ArrowRight size={18}/></Link>
      </div>
      <p style={{ color: '#8a948b', fontSize: 11, marginTop: 22, lineHeight: 1.7 }}>Admin actions require a signed-in account listed in the ADMIN_EMAILS server setting. Product catalogue database setup is a separate one-time step described in the project migration.</p>
    </div>
  </main>;
}
