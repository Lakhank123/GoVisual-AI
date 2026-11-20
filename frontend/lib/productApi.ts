const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
import { supabase, getSafeSession } from './supabase'

export interface Product {
  id: string;
  name: string;
  description?: string;
  price_positioning?: string;
  category?: string;
  image_url?: string;
  business_id?: string;
}

export class ProductAuthError extends Error {
  status: number;
  isAuthError: boolean;
  constructor(message = 'Authentication required: session is invalid or expired (HTTP 401)') {
    super(message);
    this.name = 'ProductAuthError';
    this.status = 401;
    this.isAuthError = true;
  }
}

export class BackendUnavailableError extends Error {
  status: number;
  constructor(message = `Backend unavailable at ${BASE}. Start the FastAPI server on port 8000.`) {
    super(message);
    this.name = 'BackendUnavailableError';
    this.status = 503;
  }
}

/**
 * Attempts fetch to the primary BASE and seamlessly falls back to loopback alternative (localhost <-> 127.0.0.1)
 * to avoid IPv6/IPv4 loopback connection issues on Windows browsers.
 */
async function fetchWithFallback(path: string, options: RequestInit): Promise<Response> {
  const primaryUrl = `${BASE}${path}`;
  try {
    return await fetch(primaryUrl, options);
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;

    const altBase = BASE.includes('localhost')
      ? BASE.replace('localhost', '127.0.0.1')
      : BASE.replace('127.0.0.1', 'localhost');

    if (altBase !== BASE) {
      try {
        return await fetch(`${altBase}${path}`, options);
      } catch (altErr: any) {
        if (altErr?.name === 'AbortError') throw altErr;
      }
    }
    throw err;
  }
}

/**
 * Safely resolves the current access token, with optional fallback to refreshing the session.
 */
export async function resolveAccessToken(explicitToken?: string, forceRefresh = false): Promise<string | null> {
  if (explicitToken && !forceRefresh) {
    return explicitToken;
  }

  if (forceRefresh) {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session?.access_token) {
        return data.session.access_token;
      }
    } catch (e) {
      console.warn('[productApi] Failed to refresh Supabase session:', e);
    }
  }

  const session = await getSafeSession();
  return session?.access_token || null;
}

export async function getProducts(explicitToken?: string, signal?: AbortSignal): Promise<Product[]> {
  if (signal?.aborted) {
    return [];
  }

  const token = await resolveAccessToken(explicitToken);

  // If unauthenticated or token not ready (e.g. during onboarding or guest session),
  // return an empty catalogue gracefully instead of firing an unauthenticated request.
  if (!token) {
    return [];
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      return [];
    }
    signal.addEventListener('abort', onAbort);
  }

  let r: Response;
  try {
    r = await fetchWithFallback('/api/products', { headers, signal: controller.signal });
  } catch (err: any) {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
    if (err?.name === 'AbortError' || signal?.aborted) {
      console.warn('[getProducts] Request timed out or aborted');
      return [];
    }
    throw new BackendUnavailableError();
  }

  // If 401 Unauthorized, attempt a single token refresh and retry
  if (r.status === 401) {
    const refreshedToken = await resolveAccessToken(undefined, true);
    if (refreshedToken && refreshedToken !== token) {
      try {
        const retryRes = await fetchWithFallback('/api/products', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshedToken}`
          },
          signal: controller.signal
        });
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onAbort);
        if (retryRes.ok) {
          return retryRes.json();
        }
      } catch (retryErr: any) {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', onAbort);
        if (retryErr?.name === 'AbortError' || signal?.aborted) {
          return [];
        }
        throw new BackendUnavailableError();
      }
    }
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
    throw new ProductAuthError();
  }

  clearTimeout(timer);
  if (signal) signal.removeEventListener('abort', onAbort);

  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    throw new Error(`Failed to fetch products: HTTP ${r.status} ${errText}`.trim());
  }

  return r.json();
}

export async function createProduct(product: Partial<Product>, explicitToken?: string): Promise<Product> {
  let token = await resolveAccessToken(explicitToken);
  if (!token) {
    throw new ProductAuthError('Authentication required: cannot create product without an active session.');
  }

  let r: Response;
  try {
    r = await fetchWithFallback('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(product)
    });
  } catch {
    throw new BackendUnavailableError();
  }

  if (r.status === 401) {
    const refreshedToken = await resolveAccessToken(undefined, true);
    if (refreshedToken && refreshedToken !== token) {
      try {
        const retryRes = await fetchWithFallback('/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshedToken}`
          },
          body: JSON.stringify(product)
        });
        if (retryRes.ok) {
          return retryRes.json();
        }
      } catch {
        throw new BackendUnavailableError();
      }
    }
    throw new ProductAuthError();
  }

  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    throw new Error(`Creation failed: ${r.status} ${errText}`.trim());
  }
  return r.json();
}

export async function updateProduct(id: string, product: Partial<Product>, explicitToken?: string): Promise<Product> {
  let token = await resolveAccessToken(explicitToken);
  if (!token) {
    throw new ProductAuthError('Authentication required: cannot update product without an active session.');
  }

  let r: Response;
  try {
    r = await fetchWithFallback(`/api/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(product)
    });
  } catch {
    throw new BackendUnavailableError();
  }

  if (r.status === 401) {
    const refreshedToken = await resolveAccessToken(undefined, true);
    if (refreshedToken && refreshedToken !== token) {
      try {
        const retryRes = await fetchWithFallback(`/api/products/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshedToken}`
          },
          body: JSON.stringify(product)
        });
        if (retryRes.ok) {
          return retryRes.json();
        }
      } catch {
        throw new BackendUnavailableError();
      }
    }
    throw new ProductAuthError();
  }

  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    throw new Error(`Update failed: ${r.status} ${errText}`.trim());
  }
  return r.json();
}

export async function deleteProduct(id: string, explicitToken?: string): Promise<void> {
  let token = await resolveAccessToken(explicitToken);
  if (!token) {
    throw new ProductAuthError('Authentication required: cannot delete product without an active session.');
  }

  let r: Response;
  try {
    r = await fetchWithFallback(`/api/products/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  } catch {
    throw new BackendUnavailableError();
  }

  if (r.status === 401) {
    const refreshedToken = await resolveAccessToken(undefined, true);
    if (refreshedToken && refreshedToken !== token) {
      try {
        const retryRes = await fetchWithFallback(`/api/products/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshedToken}`
          }
        });
        if (retryRes.ok) {
          return;
        }
      } catch {
        throw new BackendUnavailableError();
      }
    }
    throw new ProductAuthError();
  }

  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    throw new Error(`Deletion failed: ${r.status} ${errText}`.trim());
  }
}

export async function uploadProductImage(file: File, userId: string): Promise<string> {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("File too large (max 10MB)")
  }
  
  const ext = file.name.split('.').pop()
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
  const filePath = `${userId}/${uniqueName}`

  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file)

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  return filePath
}

export async function getProductImageUrl(filePath: string, signal?: AbortSignal): Promise<string | null> {
  if (!filePath) return null;
  // If it's already a full URL (e.g. from previous tests), just return it
  if (filePath.startsWith('http')) return filePath;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort);
  }

  try {
    const { data, error } = await supabase.storage
      .from('product-images')
      .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

    if (error) {
      console.warn("Failed to generate signed url:", error.message || error);
      return null;
    }
    
    return data?.signedUrl || null;
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      console.warn("Failed to generate signed url:", err);
    }
    return null;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

export async function deleteProductImage(filePath: string): Promise<void> {
  if (!filePath || filePath.startsWith('http')) return;
  try {
    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath])
      
    if (error) {
      console.warn("Failed to delete image:", error.message || error);
    }
  } catch (err) {
    console.warn("Failed to delete image:", err);
  }
}

export async function getGeneratedAssets(explicitUserId?: string, signal?: AbortSignal) {
  let userId = explicitUserId;
  if (!userId) {
    const session = await getSafeSession();
    userId = session?.user?.id;
  }
  if (!userId) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort);
  }

  try {
    // Query generation_sessions for the current user and their generated_assets
    const { data, error } = await supabase
      .from('generation_sessions')
      .select(`
        id,
        created_at,
        generated_assets (
          id,
          asset_url,
          format,
          status,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .abortSignal(controller.signal);

    if (error) {
      console.warn("Failed to fetch generated assets:", error.message || error);
      return [];
    }

    return data || [];
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      console.warn("Failed to fetch generated assets:", err);
    }
    return [];
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}
