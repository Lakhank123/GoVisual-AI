const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export async function searchBrand(q: string, city: string) {
  try {
    const url = `${BASE}/brand-lookup?q=${encodeURIComponent(q)}&city=${encodeURIComponent(city)}`
    const r = await fetch(url)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const data = await r.json()
    return data.places || []
  } catch (e) {
    console.error('Brand search failed:', e)
    return []
  }
}

export async function getBrandProfile(placeId: string) {
  try {
    const r = await fetch(`${BASE}/brand-profile/${placeId}`)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  } catch (e) {
    console.error('Brand profile failed:', e)
    return null
  }
}

export async function generateCreatives(
  answers: Record<string, string>,
  brandName: string,
  brandColors: string,
  category: string,
  productImage?: File | null,
  referenceImageUrl?: string
) {
  // Map frontend camelCase keys to backend snake_case keys
  const keyMap: Record<string, string> = {
    imageType: 'image_type',
    mainText: 'main_text',
  }
  // Keys that should NOT be sent as form fields
  const skipKeys = new Set(['productImageFile'])

  const form = new FormData()
  Object.entries(answers).forEach(([k, v]) => {
    if (v != null && !skipKeys.has(k)) {
      const key = keyMap[k] || k
      form.append(key, String(v))
    }
  })
  form.append('brand_name', brandName)
  form.append('brand_colors', brandColors)
  form.append('category', category)
  if (productImage) {
    form.append('product_image', productImage)
  }
  if (referenceImageUrl) {
    form.append('reference_image_url', referenceImageUrl)
  }
  const r = await fetch(`${BASE}/generate`, { method: 'POST', body: form })
  if (!r.ok) {
    const errText = await r.text().catch(() => '')
    console.error(`Generate failed: HTTP ${r.status}`, errText)
    throw new Error(`Generation failed: HTTP ${r.status}`)
  }
  return r.json()
}

