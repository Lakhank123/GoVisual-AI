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
  id?: string;
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

  const activeAbortRef = React.useRef<AbortController | null>(null);
  const lastLoadedUserIdRef = React.useRef<string | null>(null);

  const loadUserProducts = async (token?: string, signal?: AbortSignal) => {
    try {
      let resolvedToken = token;
      if (!resolvedToken) {
        const authSession = await getSafeSession();
        resolvedToken = authSession?.access_token;
      }

      // If user is unauthenticated (guest / onboarding step), products catalog is empty
      if (!resolvedToken) {
        setSession((s) => ({ ...s, products: [] }));
        return;
      }

      const fetched = await getProducts(resolvedToken, signal);
      if (signal?.aborted) return;

      const mapped: ProductService[] = [];
      for (const p of fetched) {
        if (signal?.aborted) return;
        let signedUrl = undefined;
        if (p.image_url) {
          signedUrl = (await getProductImageUrl(p.image_url, signal)) || undefined;
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
      if (!signal?.aborted) {
        setSession((s) => ({ ...s, products: mapped }));
      }
    } catch (e: any) {
      if (signal?.aborted) return;
      if (e?.isAuthError || e?.status === 401 || e?.message?.includes("401")) {
        console.warn("[DemoSession] User unauthenticated or token expired, products empty:", e?.message);
        setSession((s) => ({ ...s, products: [] }));
      } else {
        console.warn("[DemoSession] Failed to load products from API:", e?.message || e);
      }
    }
  };

  const loadUserLibrary = async (explicitUserId?: string, explicitToken?: string, signal?: AbortSignal) => {
    try {
      const apiBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "" : "http://127.0.0.1:8000");
      let userId = explicitUserId;
      let token = explicitToken;

      if (!userId || !token) {
        const authSession = await getSafeSession();
        userId = userId || authSession?.user?.id;
        token = token || authSession?.access_token;
      }

      if (!userId) {
        setSession((s) => ({ ...s, library: [] }));
        return;
      }

      const sessions = await getGeneratedAssets(userId, signal);
      if (signal?.aborted) return;

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
      if (token && !signal?.aborted) {
        try {
          const photoRes = await fetch(`${apiBase}/api/photoshoot/library-assets`, {
            headers: { Authorization: `Bearer ${token}` },
            signal,
          });
          if (photoRes.ok) {
            const photoJson = await photoRes.json();
            if (photoJson.success && Array.isArray(photoJson.assets)) {
              for (const pa of photoJson.assets) {
                let assetUrl = pa.url || "";
                if (assetUrl && !assetUrl.startsWith("http") && !assetUrl.startsWith("data:")) {
                  assetUrl = `${apiBase}${assetUrl.startsWith("/") ? "" : "/"}${assetUrl}`;
                }
                const inferredType = (pa.type === "creative" || pa.metadata?.mode === "creative" || pa.metadata?.tags?.mode === "creative")
                  ? "creative"
                  : (pa.type || "photoshoot");
                libraryAssets.push({
                  id: pa.id,
                  type: inferredType,
                  url: assetUrl,
                  metadata: pa.metadata,
                  createdAt: pa.createdAt,
                });
              }
            }
          }
        } catch (pe: any) {
          if (pe?.name !== 'AbortError') {
            console.warn("Failed loading photoshoot library assets:", pe);
          }
        }
      }

      if (!signal?.aborted) {
        setSession((s) => {
          const remoteUrls = new Set(libraryAssets.map(a => a.url));
          // Preserve any locally added/generated items that haven't shown up in the query yet
          const retainedLocal = (s.library || []).filter(local => local.url && !remoteUrls.has(local.url));
          return { ...s, library: [...retainedLocal, ...libraryAssets] };
        });
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error("Failed to load library assets:", e);
      }
    }
  };

  const loadUserProfile = async (userId: string, signal?: AbortSignal) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const [profile, brand] = await Promise.all([
        getProfile(userId, signal),
        getBrandCoreIdentity(userId, signal),
      ]);

      if (signal?.aborted) return;

      let resolvedBrand = brand;
      let resolvedProfile = profile;

      // Fallback: If DB brand has placeholder name or is missing, check Backend API /brand/onboard/identity
      if (
        (!resolvedBrand || isPlaceholderBrandName(resolvedBrand?.brand_name)) &&
        (!resolvedProfile || isPlaceholderBrandName(resolvedProfile?.business_name))
      ) {
        try {
          const authSession = await getSafeSession();
          const email = authSession?.user?.email;
          const apiBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "" : "http://127.0.0.1:8000");
          const syncUrl = email
            ? `${apiBase}/brand/onboard/sync?email=${encodeURIComponent(email)}&user_id=${userId}`
            : `${apiBase}/brand/onboard/sync?user_id=${userId}`;
          const bRes = await fetch(syncUrl, {
            headers: authSession?.access_token ? { Authorization: `Bearer ${authSession.access_token}` } : {},
            signal,
          });
          if (bRes.ok) {
            const bJson = await bRes.json();
            const core = bJson?.brand?.core;
            if (core?.brand_name && !isPlaceholderBrandName(core.brand_name)) {
              resolvedBrand = {
                business_id: userId,
                brand_name: core.brand_name,
                category: core.category,
                city: core.city,
                logo_url: core.logo_url,
                primary_color: bJson.brand?.visual_dna?.primary_color,
                secondary_color: bJson.brand?.visual_dna?.secondary_color,
                brand_tone: core.brand_tone,
                tagline: core.tagline,
                brand_brief: core.brand_brief,
                website_url: core.website_url,
                instagram_handle: core.instagram_handle,
                onboarding_complete: true,
              };
            }
          }
        } catch (apiErr) {
          console.warn("[DemoSession] Fallback backend identity notice:", apiErr);
        }

        // Keyed local backup check (survives logout & browser restarts)
        if ((!resolvedBrand || isPlaceholderBrandName(resolvedBrand?.brand_name)) && typeof window !== 'undefined') {
          try {
            const authSession = await getSafeSession();
            const email = authSession?.user?.email;
            const candidateKeys = [
              email ? `govisual_user_data_${email}` : null,
              email ? `gv_backup_${email}` : null,
              `govisual_user_data_${userId}`,
              `gv_backup_${userId}`,
              'govisual_user_data_latest',
            ].filter(Boolean) as string[];

            for (const key of candidateKeys) {
              const bRaw = localStorage.getItem(key);
              if (bRaw) {
                const bData = JSON.parse(bRaw);
                const bName = bData?.businessName || bData?.brand_name;
                if (bName && !isPlaceholderBrandName(bName)) {
                  resolvedBrand = {
                    business_id: userId,
                    brand_name: bName,
                    category: bData.category,
                    city: bData.city,
                    logo_url: bData.logoUrl || bData.logo_url,
                    primary_color: bData.primaryColor || bData.primary_color,
                    secondary_color: bData.secondaryColor || bData.secondary_color,
                    brand_brief: bData.brandSummary || bData.brand_brief,
                    website_url: bData.website || bData.website_url,
                    instagram_handle: bData.instagram || bData.instagram_handle,
                    onboarding_complete: true,
                  };
                  break;
                }
              }
            }
          } catch {}
        }
      }

      const hasValidBrand = Boolean(
        resolvedBrand?.onboarding_complete ||
        !isPlaceholderBrandName(resolvedBrand?.brand_name) ||
        !isPlaceholderBrandName(resolvedProfile?.business_name)
      );

      const resolvedBusinessName =
        (resolvedBrand?.brand_name && !isPlaceholderBrandName(resolvedBrand.brand_name) ? resolvedBrand.brand_name : null) ||
        (resolvedProfile?.business_name && !isPlaceholderBrandName(resolvedProfile.business_name) ? resolvedProfile.business_name : null) ||
        resolvedBrand?.brand_name ||
        resolvedProfile?.business_name ||
        "";

      if (resolvedBrand || resolvedProfile) {
        setSession((s) => ({
          ...s,
          workspace: {
            businessName: resolvedBusinessName || s.workspace?.businessName || "",
            category: resolvedBrand?.category || s.workspace?.category || "",
            city: resolvedBrand?.city || s.workspace?.city || "",
          },
          brandProfile: {
            businessName: resolvedBusinessName || s.brandProfile?.businessName,
            logoUrl: resolvedBrand?.logo_url || s.brandProfile?.logoUrl || undefined,
            primaryColor: resolvedBrand?.primary_color || s.brandProfile?.primaryColor || undefined,
            secondaryColor: resolvedBrand?.secondary_color || s.brandProfile?.secondaryColor || undefined,
            typography: resolvedBrand?.brand_tone || s.brandProfile?.typography || undefined,
            targetAudience: resolvedBrand?.tagline || s.brandProfile?.targetAudience || undefined,
            brandPersonality: Array.isArray(resolvedBrand?.brand_personality_tags)
              ? resolvedBrand.brand_personality_tags.join(", ")
              : (resolvedBrand?.brand_tone || s.brandProfile?.brandPersonality || undefined),
            brandSummary: resolvedBrand?.brand_brief || s.brandProfile?.brandSummary || undefined,
            website: resolvedBrand?.website_url || s.brandProfile?.website || undefined,
            instagram: resolvedBrand?.instagram_handle || s.brandProfile?.instagram || undefined,
            city: resolvedBrand?.city || s.brandProfile?.city || undefined,
            category: resolvedBrand?.category || s.brandProfile?.category || undefined,
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
      if (e?.name === 'AbortError') {
        console.warn("[DemoSession] Profile load aborted or timed out for user:", userId);
      } else {
        console.error("Failed to load user profile:", e);
        setProfileError(e?.message || "Failed to load workspace profile.");
      }
    } finally {
      if (!signal?.aborted) {
        setProfileLoading(false);
      }
    }
  };

  const syncUserData = (supabaseSession: any, force = false) => {
    const user = supabaseSession?.user;
    if (!user) return;
    if (lastLoadedUserIdRef.current === user.id && !force) {
      return;
    }
    lastLoadedUserIdRef.current = user.id;

    // Abort any prior in-flight requests
    activeAbortRef.current?.abort();
    const controller = new AbortController();
    activeAbortRef.current = controller;

    // Trigger profile loading (managed by profileLoading flag)
    loadUserProfile(user.id, controller.signal);

    // Concurrently trigger optional products and library loading (does not block profileLoading or authLoading)
    loadUserProducts(supabaseSession.access_token, controller.signal);
    loadUserLibrary(user.id, supabaseSession.access_token, controller.signal);
  };

  const handleAuthChange = (event: string, supabaseSession: any) => {
    if (!supabaseSession?.user || event === 'SIGNED_OUT') {
      activeAbortRef.current?.abort();
      lastLoadedUserIdRef.current = null;
      setSession((s) => ({ ...s, user: null, products: [], library: [] }));
      setAuthLoading(false);
      setProfileLoading(false);
      setProfileError(null);
      setIsLoaded(true);
      return;
    }

    // Set user synchronously
    setSession((s) => ({
      ...s,
      user: {
        id: supabaseSession.user.id,
        name: supabaseSession.user.user_metadata?.full_name || supabaseSession.user.email || "",
        email: supabaseSession.user.email || "",
      },
    }));

    // Authentication is resolved!
    setAuthLoading(false);
    setIsLoaded(true);

    // Defer profile and optional data fetching outside the synchronous auth callback
    setTimeout(() => {
      syncUserData(supabaseSession, event === 'TOKEN_REFRESHED' ? false : false);
    }, 0);
  };

  const refreshProfile = async () => {
    const authSession = await getSafeSession();
    if (authSession?.user?.id) {
      syncUserData(authSession, true);
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

    // Synchronous auth state listener (never await inside callback)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, supabaseSession) => {
      handleAuthChange(event, supabaseSession);
    });

    // Fallback safe session probe in case onAuthStateChange is delayed
    getSafeSession()
      .then((authSession) => {
        if (authSession?.user) {
          if (lastLoadedUserIdRef.current !== authSession.user.id) {
            handleAuthChange("INITIAL_SESSION", authSession);
          }
        } else if (lastLoadedUserIdRef.current === null) {
          setAuthLoading(false);
        }
      })
      .catch(() => {
        setAuthLoading(false);
      });

    return () => {
      subscription.unsubscribe();
      activeAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      try {
        const { products, library, recentWork, brandProfile, ...rest } = session;

        // Clean brandProfile of huge base64 data URLs to prevent blowing localStorage quota
        const cleanBrandProfile = brandProfile ? { ...brandProfile } : undefined;
        if (
          cleanBrandProfile?.logoUrl &&
          cleanBrandProfile.logoUrl.startsWith("data:") &&
          cleanBrandProfile.logoUrl.length > 8192
        ) {
          cleanBrandProfile.logoUrl = "";
        }

        // Clean recentWork of huge data URLs and keep only recent 3 items
        const cleanRecentWork = (recentWork || [])
          .filter((w) => !w.url?.startsWith("data:") || w.url.length <= 8192)
          .slice(0, 3);

        const toSave = {
          ...rest,
          brandProfile: cleanBrandProfile,
          recentWork: cleanRecentWork,
        };

        localStorage.setItem("govisual_demo_session", JSON.stringify(toSave));
      } catch (err: any) {
        // Handle QuotaExceededError safely so the UI never crashes
        if (
          err?.name === "QuotaExceededError" ||
          err?.code === 22 ||
          err?.code === 1014 ||
          err?.message?.includes("quota")
        ) {
          console.warn("[DemoSession] localStorage quota exceeded. Pruning stored session.");
          try {
            const minimalSave = {
              user: session.user,
              workspace: session.workspace,
              onboarding: session.onboarding,
            };
            localStorage.setItem("govisual_demo_session", JSON.stringify(minimalSave));
          } catch {
            try {
              localStorage.removeItem("govisual_demo_session");
            } catch {}
          }
        } else {
          console.warn("[DemoSession] Failed to persist session to localStorage:", err);
        }
      }
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
        // Write workspace persistent backup
        if (typeof window !== 'undefined') {
          try {
            const email = authSession?.user?.email;
            const backupPayload = JSON.stringify({
              business_id: userId,
              businessName: workspace.businessName,
              category: workspace.category || "",
              city: workspace.city || "",
              onboardingComplete: true,
            });
            localStorage.setItem(`govisual_user_data_${userId}`, backupPayload);
            localStorage.setItem('govisual_user_data_latest', backupPayload);
            localStorage.setItem(`gv_backup_${userId}`, backupPayload);
            if (email) {
              localStorage.setItem(`govisual_user_data_${email}`, backupPayload);
              localStorage.setItem(`gv_backup_${email}`, backupPayload);
            }
          } catch {}
        }
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

        // Also persist via Backend API to ensure server-side DB synchronization
        try {
          const apiBase = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "" : "http://127.0.0.1:8000");
          await fetch(`${apiBase}/brand/onboard/save`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authSession.access_token}`,
            },
            body: JSON.stringify({
              brand_brain_session: {
                business_id: userId,
                shopName: businessName,
                category: profile.category || session.workspace?.category || "",
                city: profile.city || session.workspace?.city || "",
                brandSummary: profile.brandSummary || "",
                websiteUrl: profile.website || "",
                instagramHandle: profile.instagram || "",
                logoUrl: profile.logoUrl ?? currentBrand?.logoUrl ?? "",
                primaryColor: profile.primaryColor ?? currentBrand?.primaryColor ?? "",
                secondaryColor: profile.secondaryColor ?? currentBrand?.secondaryColor ?? "",
              },
            }),
          });
        } catch (apiErr) {
          console.warn("[updateBrandProfileAndPersist] Backend onboard/save notice:", apiErr);
        }
        // Write brand profile persistent backup
        if (typeof window !== 'undefined') {
          try {
            const email = authSession?.user?.email;
            const backupPayload = JSON.stringify({
              business_id: userId,
              businessName,
              category: profile.category || session.workspace?.category || "",
              city: profile.city || session.workspace?.city || "",
              brandSummary: profile.brandSummary || "",
              website: profile.website || "",
              instagram: profile.instagram || "",
              logoUrl: profile.logoUrl ?? currentBrand?.logoUrl ?? "",
              primaryColor: profile.primaryColor ?? currentBrand?.primaryColor ?? "",
              secondaryColor: profile.secondaryColor ?? currentBrand?.secondaryColor ?? "",
              onboardingComplete: true,
            });
            localStorage.setItem(`govisual_user_data_${userId}`, backupPayload);
            localStorage.setItem('govisual_user_data_latest', backupPayload);
            localStorage.setItem(`gv_backup_${userId}`, backupPayload);
            if (email) {
              localStorage.setItem(`govisual_user_data_${email}`, backupPayload);
              localStorage.setItem(`gv_backup_${email}`, backupPayload);
            }
          } catch {}
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
    const currentUserId = session.user?.id;
    await supabase.auth.signOut();
    setSession(defaultState);
    setProfileLoading(false);
    setProfileError(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("govisual_demo_session");
      if (currentUserId) {
        localStorage.removeItem(`govisual_user_data_${currentUserId}`);
      }
      localStorage.removeItem("govisual_user_data_latest");
    }
  };

  if (!isLoaded) {
    return null;
  }

  const hasCompletedOnboarding = Boolean(
    (
      session.onboarding.brandProfileApproved ||
      session.onboarding.workspaceCreated ||
      session.brandProfile?.onboardingComplete
    ) &&
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
