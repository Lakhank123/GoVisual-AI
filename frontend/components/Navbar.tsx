'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isLanding = pathname === '/';

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled || !isLanding
          ? 'bg-[#060a06]/95 backdrop-blur-md border-b border-[#1a2a1a]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <h1 className="text-xl font-bold text-white">GoVisual</h1>
            <sup className="text-[#39ff14] font-bold text-sm">AI</sup>
          </div>

          {/* Desktop Navigation */}
          {isLanding && (
            <div className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-[#2a4a2a] hover:text-[#39ff14] transition-colors duration-150">
                How it works
              </a>
              <a href="#pricing" className="text-[#2a4a2a] hover:text-[#39ff14] transition-colors duration-150">
                Pricing
              </a>
            </div>
          )}

          {/* Desktop CTA */}
          <div className="hidden md:flex">
            <button
              onClick={() => router.push('/onboard')}
              className="bg-[#39ff14] text-black font-bold px-6 py-2 rounded-full hover:opacity-90 transition-opacity duration-150 cursor-pointer"
            >
              Start free
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-[#39ff14] p-2 cursor-pointer"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-[#060a06] border-b border-[#1a2a1a] p-4 space-y-4">
            {isLanding && (
              <>
                <a
                  href="#how-it-works"
                  className="block text-[#2a4a2a] hover:text-[#39ff14] transition-colors duration-150"
                  onClick={() => setIsMenuOpen(false)}
                >
                  How it works
                </a>
                <a
                  href="#pricing"
                  className="block text-[#2a4a2a] hover:text-[#39ff14] transition-colors duration-150"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pricing
                </a>
              </>
            )}
            <button
              onClick={() => {
                router.push('/onboard');
                setIsMenuOpen(false);
              }}
              className="w-full bg-[#39ff14] text-black font-bold px-6 py-2 rounded-full hover:opacity-90 transition-opacity duration-150 cursor-pointer"
            >
              Start free
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
