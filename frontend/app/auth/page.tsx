"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase, getSafeSession, getProfile } from "@/lib/supabase";

function getSafeRedirect(redirectUrl: string | null): string {
  if (!redirectUrl) return "/auth/complete";
  if (redirectUrl.startsWith("/") && !redirectUrl.startsWith("//") && !redirectUrl.includes("://")) {
    return redirectUrl;
  }
  return "/auth/complete";
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = getSafeRedirect(searchParams?.get("redirect"));
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkExistingSession() {
      try {
        const session = await getSafeSession();
        if (!mounted) return;
        if (session?.user) {
          router.replace(redirectTarget);
          return;
        }
      } catch (e) {
        console.error("Session check error:", e);
      } finally {
        if (mounted) setCheckingSession(false);
      }
    }

    checkExistingSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && mounted) {
        router.replace(redirectTarget);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router, redirectTarget]);

  if (checkingSession) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#E8B66F", fontSize: "14px" }}>
        Checking session...
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "400px", width: "100%", background: "#21170F", padding: "40px 32px", borderRadius: "20px", border: "1px solid #3B2B1E" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "24px", fontWeight: 800, color: "#fff" }}>Go</span>
          <span style={{ fontSize: "24px", fontWeight: 800, color: "#E8B66F" }}>Visual</span>
          <sup style={{ fontSize: "12px", color: "#E8B66F", marginLeft: "2px" }}>AI</sup>
        </div>

        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#fff", marginBottom: "8px", textAlign: "center" }}>
          Let's Get Started
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", textAlign: "center", marginBottom: "32px" }}>
          We'll build your AI Marketing Team in just a few minutes.
        </p>

        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#E8B66F",
                  brandAccent: "#F3CB8D",
                  inputText: "#fff",
                  inputBackground: "#14100D",
                  inputBorder: "#3B2B1E",
                },
              },
            },
          }}
          theme="dark"
          providers={[]}
        />
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#E8B66F", fontSize: "14px" }}>
        Loading...
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
