"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Book, Image as ImageIcon, Library, LogOut, Camera, ShoppingBag, CreditCard, Sparkles } from "lucide-react";
import { useDemoSession } from "@/components/providers/demo-session-provider";

export function GlobalNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, session } = useDemoSession();

  // Do not show the global navigation on landing or auth pages
  if (pathname === "/" || pathname === "/auth") {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const businessName = session.workspace?.businessName;

  return (
    <nav style={{
      display: 'flex', 
      padding: '12px 32px',
      background: '#14100D', 
      borderBottom: '1px solid #3B2B1E',
      flexWrap: 'wrap', 
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/" style={{ color: '#E8B66F', fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
            GoVisual AI
          </Link>
          {businessName && (
            <>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>|</span>
              <span style={{ color: '#B9AA99', fontSize: 13, fontWeight: 500 }}>{businessName}</span>
            </>
          )}
        </div>

        <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>

        <Link href="/dashboard" style={{ color: pathname === "/dashboard" ? '#E8B66F' : '#B9AA99', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LayoutDashboard size={16} /> Dashboard
        </Link>
        
        <Link href="/brandbook" style={{ color: pathname === "/brandbook" ? '#E8B66F' : '#B9AA99', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Book size={16} /> Brand Profile
        </Link>
        
        <Link href="/photoshoot" style={{ color: pathname === "/photoshoot" ? '#E8B66F' : '#B9AA99', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Camera size={16} /> Photoshoot
        </Link>

        <Link href="/studio" style={{ color: pathname === "/studio" ? '#E8B66F' : '#B9AA99', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ImageIcon size={16} /> Content Studio
        </Link>
        
        <Link href="/products/setup" style={{ color: pathname.startsWith("/products") ? '#E8B66F' : '#B9AA99', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShoppingBag size={16} /> Products
        </Link>

        <Link href="/library" style={{ color: pathname === "/library" ? '#E8B66F' : '#B9AA99', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Library size={16} /> Library
        </Link>

        <Link href="/dashboard/billing" style={{ color: pathname.startsWith("/dashboard/billing") ? '#E8B66F' : '#B9AA99', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CreditCard size={16} /> Billing
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Link
          href="/pricing"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(124, 58, 237, 0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          <Sparkles size={14} /> Upgrade
        </Link>

        {session.user ? (
          <button
            onClick={handleLogout}
            title="Log out and return to main page"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
              e.currentTarget.style.color = '#ff6b6b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
              e.currentTarget.style.color = '#ef4444';
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        ) : (
          <Link
            href={`/auth?redirect=${encodeURIComponent(pathname)}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'rgba(232, 182, 111, 0.12)',
              border: '1px solid rgba(232, 182, 111, 0.3)',
              color: '#E8B66F',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
