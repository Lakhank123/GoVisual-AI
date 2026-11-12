"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  supabase,
  getProfile,
  upsertProfile,
  getSafeSession,
  getBrandCoreIdentity,
  upsertBrandCoreIdentity,
} from "@/lib/supabase";
import { getProducts, getProductImageUrl, getGeneratedAssets } from "@/lib/productApi";

export type UserInfo = {
  name: string;
  email: string;
};

export type WorkspaceInfo = {
  businessName: string;
  category: string;
  city: string;
};

export type BrandProfile = {
  businessName?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontHeading?: string;
  fontBody?: string;
  typography?: string;
  targetAudience?: string;
  brandPersonality?: string;
  keywords?: string;
  mission?: string;
  vision?: string;
  brandSummary?: string;
  website?: string;
  instagram?: string;
  city?: string;
  category?: string;
  onboardingComplete?: boolean;
};

export type ProductService = {
  id: string;
  name: string;
  category: string;
  price: string;
  description: string;
  imageUrl?: string;
};

export type LibraryAsset = {
  id: string;
  type: "brand_book" | "creative" | "photoshoot" | "video" | "website_asset";
  url: string;
  metadata?: any;
  createdAt: string;
};

export type DemoSessionState = {
  user: UserInfo | null;
  workspace: WorkspaceInfo | null;
  brandProfile: BrandProfile | null;
  products: ProductService[];
  library: LibraryAsset[];
  onboarding: {
    workspaceCreated: boolean;
    brandProfileApproved: boolean;
    brandBookGenerated: boolean;
  };
  recentWork: { type: string; url: string; label: string }[];
};

export const isPlaceholderBrandName = (name?: string | null): boolean => {
  if (!name) return true;
  const trimmed = name.trim().toLowerCase();
  return (
    !trimmed ||
    trimmed === "my brand" ||
    trimmed === "your shop" ||
    trimmed === "sample business"
  );
};

type DemoSessionContextType = {
  session: DemoSessionState;
  authLoading: boolean;
  profileLoading: boolean;
  profileError: string | null;
  hasCompletedOnboarding: boolean;
  updateUser: (user: UserInfo) => void;
  updateWorkspace: (workspace: WorkspaceInfo) => Promise<void>;
  updateBrandProfile: (profile: Partial<BrandProfile>) => void;
  updateBrandProfileAndPersist: (profile: Partial<BrandProfile>) => Promise<void>;
  approveBrandProfile: () => void;
  addProduct: (product: ProductService) => void;
  addAssetToLibrary: (asset: LibraryAsset) => void;
  markBrandBookGenerated: () => void;
  addRecentWork: (work: { type: string; url: string; label: string }) => void;
  logout: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const defaultState: DemoSessionState = {
  user: null,
  workspace: null,
  brandProfile: null,
  products: [],
  library: [],
  onboarding: {
    workspaceCreated: false,
    brandProfileApproved: false,
    brandBookGenerated: false,
  },
  recentWork: [],
};

const DemoSessionContext = createContext<DemoSessionContextType | undefined>(undefined);

export function DemoSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<DemoSessionState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const loadUserProducts = async (token?: string) => {
    try {
      const authSession = await getSafeSession();
      const resolvedToken = token || authSession?.access_token;

      // If user is unauthenticated (guest / onboarding step), products catalog is empty
      if (!resolvedToken) {
        setSession((s) => ({ ...s, products: [] }));
        return;
      }

      const fetched = await getProducts(resolvedToken);
      const mapped: ProductService[] = [];
      for (const p of fetched) {
        let signedUrl = undefined;
        if (p.image_url) {
          signedUrl = (await getProductImageUrl(p.image_url)) || undefined;
        }
        mapped.push({
          id: p.id,
          name: p.name,
          category: p.category || "",
          price: p.price_positioning || "",
          description: p.description || "",
          imageUrl: signedUrl,
        });
      }
      setSession((s) => ({ ...s, products: mapped }));
    } catch (e: any) {
      if (e?.isAuthError || e?.status === 401 || e?.message?.includes("401")) {
        console.warn("[DemoSession] User unauthenticated or token expired, products empty:", e?.message);
        setSession((s) => ({ ...s, products: [] }));
      } else {
        console.warn("[DemoSession] Failed to load products from API:", e?.message || e);
      }
    }
  };

  const loadUserLibrary = async () => {
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const sessions = await getGeneratedAssets();
      const libraryAssets: LibraryAsset[] = [];

      for (const sess of sessions) {
        if (sess.generated_assets) {
          for (const asset of sess.generated_assets) {
            let finalUrl = asset.asset_url;
            if (finalUrl && finalUrl.startsWith("govisual/generated/")) {
              try {
                const { data } = await supabase.storage
                  .from("generated-images")
                  .createSignedUrl(finalUrl, 60 * 60);
                if (data?.signedUrl) finalUrl = data.signedUrl;
              } catch {
                // If storage is unavailable, preserve original url
              }
            } else if (finalUrl && !finalUrl.startsWith("http") && !finalUrl.startsWith("data:")) {
              finalUrl = `${apiBase}/static/generated/${finalUrl.split("/").pop()}`;
            }

            libraryAssets.push({
              id: asset.id,
              type: "creative",
              url: finalUrl,
              metadata: { title: "Generated Creative", format: asset.format },
              createdAt: asset.created_at || sess.created_at,
            });
          }
        }
      }

      // Also fetch authenticated persisted photoshoot assets from brand_asset_library
      try {
        const authSession = await getSafeSession();
        const token = authSession?.access_token;
        if (token) {
          const photoRes = await fetch(`${apiBase}/api/photoshoot/library-assets`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (photoRes.ok) {
            const photoJson = await photoRes.json();
            if (photoJson.success && Array.isArray(photoJson.assets)) {
              for (const pa of photoJson.assets) {
                let assetUrl = pa.url || "";
                if (assetUrl && !assetUrl.startsWith("http") && !assetUrl.startsWith("data:")) {
                  assetUrl = `${apiBase}${assetUrl.startsWith("/") ? "" : "/"}${assetUrl}`;
                }
                libraryAssets.push({
                  id: pa.id,
                  type: "photoshoot",
                  url: assetUrl,
                  metadata: pa.metadata,
                  createdAt: pa.createdAt,
                });
              }
            }
          }
        }
      } catch (pe) {
        console.warn("Failed loading photoshoot library assets:", pe);
      }

      setSession((s) => ({ ...s, library: libraryAssets }));
    } catch (e) {
      console.error("Failed to load library assets:", e);
    }
  };

  const loadUserProfile = async (userId: string) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const [profile, brand] = await Promise.all([
        getProfile(userId),
        getBrandCoreIdentity(userId),
      ]);

      const hasValidBrand = Boolean(
        brand?.onboarding_complete ||
        !isPlaceholderBrandName(brand?.brand_name) ||
        !isPlaceholderBrandName(profile?.business_name)
      );

      const resolvedBusinessName =
        (brand?.brand_name && !isPlaceholderBrandName(brand.brand_name) ? brand.brand_name : null) ||
        (profile?.business_name && !isPlaceholderBrandName(profile.business_name) ? profile.business_name : null) ||
        brand?.brand_name ||
        profile?.business_name ||
        "";

      if (brand || profile) {
        setSession((s) => ({
          ...s,
          workspace: {
            businessName: resolvedBusinessName || s.workspace?.businessName || "",
            category: brand?.category || s.workspace?.category || "",
            city: brand?.city || s.workspace?.city || "",
          },
          brandProfile: {
            businessName: resolvedBusinessName || s.brandProfile?.businessName,
            logoUrl: brand?.logo_url || s.brandProfile?.logoUrl || undefined,
            primaryColor: brand?.primary_color || s.brandProfile?.primaryColor || undefined,
            secondaryColor: brand?.secondary_color || s.brandProfile?.secondaryColor || undefined,
            typography: brand?.brand_tone || s.brandProfile?.typography || undefined,
            targetAudience: brand?.tagline || s.brandProfile?.targetAudience || undefined,
            brandPersonality: Array.isArray(brand?.brand_personality_tags)
              ? brand.brand_personality_tags.join(", ")
              : (brand?.brand_tone || s.brandProfile?.brandPersonality || undefined),
            brandSummary: brand?.brand_brief || s.brandProfile?.brandSummary || undefined,
            website: brand?.website_url || s.brandProfile?.website || undefined,
            instagram: brand?.instagram_handle || s.brandProfile?.instagram || undefined,
            city: brand?.city || s.brandProfile?.city || undefined,
            category: brand?.category || s.brandProfile?.category || undefined,
            onboardingComplete: hasValidBrand,
          },
          onboarding: {
            ...s.onboarding,
            workspaceCreated: hasValidBrand,
            brandProfileApproved: hasValidBrand,
          },
        }));
      }
    } catch (e: any) {
      console.error("Failed to load user profile:", e);
      setProfileError(e?.message || "Failed to load workspace profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    const authSession = await getSafeSession();
    if (authSession?.user?.id) {
      await loadUserProfile(authSession.user.id);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("govisual_demo_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.products = []; // Never load products from localStorage
        setSession(parsed);
      } catch (e) {
        console.error("Failed to parse session", e);
      }
    }

    // Set isLoaded immediately on client mount to prevent blank screen hangs
    setIsLoaded(true);

    // Safely check active session and purge expired/invalid refresh tokens
    getSafeSession()
      .then(async (authSession) => {
        if (authSession?.user) {
          setSession((s) => ({
            ...s,
            user: {
              name: authSession.user.user_metadata?.full_name || authSession.user.email || "",
              email: authSession.user.email || "",
            },
          }));
          await Promise.allSettled([
            loadUserProfile(authSession.user.id),
            loadUserProducts(authSession.access_token),
            loadUserLibrary(),
          ]);
        } else {
          setSession((s) => ({ ...s, user: null, products: [], library: [] }));
        }
      })
      .catch(() => {
        setSession((s) => ({ ...s, user: null, products: [], library: [] }));
      })
      .finally(() => {
        setAuthLoading(false);
        setIsLoaded(true);
      });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, supabaseSession) => {
      if (supabaseSession?.user) {
        setSession((s) => ({
          ...s,
          user: {
            name: supabaseSession.user.user_metadata?.full_name || supabaseSession.user.email || "",
            email: supabaseSession.user.email || "",
          },
        }));
        await Promise.allSettled([
          loadUserProfile(supabaseSession.user.id),
          loadUserProducts(supabaseSession.access_token),
          loadUserLibrary(),
        ]);
      } else {
        setSession((s) => ({ ...s, user: null, products: [], library: [] }));
      }
      setAuthLoading(false);
      setIsLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const { products, library, ...toSave } = session;
      localStorage.setItem("govisual_demo_session", JSON.stringify(toSave));
    }
  }, [session, isLoaded]);

  const updateUser = (user: UserInfo) => {
    setSession((s) => ({ ...s, user }));
  };

  const updateWorkspace = async (workspace: WorkspaceInfo) => {
    setSession((s) => ({
      ...s,
      workspace,
      onboarding: { ...s.onboarding, workspaceCreated: true },
    }));

    try {
      const authSession = await getSafeSession();
      if (authSession?.user?.id && workspace.businessName) {
        const userId = authSession.user.id;
        await Promise.all([
          upsertProfile({
            id: userId,
            business_name: workspace.businessName,
            business_email: authSession.user.email || null,
          }),
          upsertBrandCoreIdentity({
            business_id: userId,
            brand_name: workspace.businessName,
            category: workspace.category || null,
            city: workspace.city || null,
          }),
        ]);
      }
    } catch (e) {
      console.error("Failed to persist workspace profile:", e);
    }
  };

  const updateBrandProfile = (profile: Partial<BrandProfile>) => {
    setSession((s) => ({
      ...s,
      brandProfile: { ...s.brandProfile, ...profile },
    }));
  };

  const updateBrandProfileAndPersist = async (profile: Partial<BrandProfile>) => {
    const currentName =
      session.brandProfile?.businessName ||
      session.workspace?.businessName ||
      "";
    const businessName =
      (profile.businessName && !isPlaceholderBrandName(profile.businessName) ? profile.businessName : null) ||
      (currentName && !isPlaceholderBrandName(currentName) ? currentName : null) ||
      profile.businessName ||
      profile.category ||
      "My Brand";

    setSession((s) => ({
      ...s,
      workspace: {
        businessName,
        category: profile.category || s.workspace?.category || "",
        city: profile.city || s.workspace?.city || "",
      },
      brandProfile: { ...s.brandProfile, ...profile, businessName },
      onboarding: { ...s.onboarding, brandProfileApproved: true, workspaceCreated: true },
    }));

    try {
      const authSession = await getSafeSession();
      if (authSession?.user?.id) {
        const userId = authSession.user.id;
        const currentBrand = session.brandProfile;

        await upsertBrandCoreIdentity({
          business_id: userId,
          brand_name: businessName,
          category: profile.category || session.workspace?.category || null,
          city: profile.city || session.workspace?.city || null,
          logo_url: profile.logoUrl ?? currentBrand?.logoUrl ?? null,
          primary_color: profile.primaryColor ?? currentBrand?.primaryColor ?? null,
          secondary_color: profile.secondaryColor ?? currentBrand?.secondaryColor ?? null,
          brand_tone: profile.typography ?? currentBrand?.typography ?? null,
          tagline: profile.targetAudience ?? currentBrand?.targetAudience ?? null,
          brand_brief: profile.brandSummary ?? currentBrand?.brandSummary ?? null,
          website_url: profile.website ?? currentBrand?.website ?? null,
          instagram_handle: profile.instagram ?? currentBrand?.instagram ?? null,
          brand_personality_tags: profile.brandPersonality
            ? profile.brandPersonality.split(",").map((t) => t.trim())
            : undefined,
          onboarding_complete: true,
        });

        if (businessName) {
          await upsertProfile({
            id: userId,
            business_name: businessName,
          });
        }
      }
    } catch (e) {
      console.error("Failed to persist brand profile:", e);
      throw e;
    }
  };

  const approveBrandProfile = () => {
    setSession((s) => ({
      ...s,
      onboarding: { ...s.onboarding, brandProfileApproved: true },
    }));
  };

  const addProduct = (product: ProductService) => {
    setSession((s) => ({
      ...s,
      products: [...s.products, product],
    }));
  };

  const addAssetToLibrary = (asset: LibraryAsset) => {
    setSession((s) => ({
      ...s,
      library: [asset, ...s.library.filter((item) => item.id !== asset.id)],
    }));
  };

  const markBrandBookGenerated = () => {
    setSession((s) => ({
      ...s,
      onboarding: { ...s.onboarding, brandBookGenerated: true },
    }));
  };

  const addRecentWork = (work: { type: string; url: string; label: string }) => {
    setSession((s) => ({
      ...s,
      recentWork: [work, ...s.recentWork.filter((w) => w.url !== work.url)].slice(0, 5),
    }));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(defaultState);
    setProfileLoading(false);
    setProfileError(null);
    localStorage.removeItem("govisual_demo_session");
  };

  if (!isLoaded) {
    return null;
  }

  const hasCompletedOnboarding = Boolean(
    (session.onboarding.brandProfileApproved || session.onboarding.workspaceCreated) &&
    (
      !isPlaceholderBrandName(session.brandProfile?.businessName) ||
      !isPlaceholderBrandName(session.workspace?.businessName)
    )
  );

  return (
    <DemoSessionContext.Provider
      value={{
        session,
        authLoading,
        profileLoading,
        profileError,
        hasCompletedOnboarding,
        updateUser,
        updateWorkspace,
        updateBrandProfile,
        updateBrandProfileAndPersist,
        approveBrandProfile,
        addProduct,
        addAssetToLibrary,
        markBrandBookGenerated,
        addRecentWork,
        logout,
        refreshProducts: loadUserProducts,
        refreshLibrary: loadUserLibrary,
        refreshProfile,
      }}
    >
      {children}
    </DemoSessionContext.Provider>
  );
}

export function useDemoSession() {
  const context = useContext(DemoSessionContext);
  if (context === undefined) {
    throw new Error("useDemoSession must be used within a DemoSessionProvider");
  }
  return context;
}
