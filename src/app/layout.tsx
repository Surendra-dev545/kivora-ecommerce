import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Kivora — Everyday finds, elevated', description: 'Discover thoughtful essentials for your everyday life.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
