const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
  const form = new FormData()
  Object.entries(answers).forEach(([k, v]) => {
    if (v != null && k !== 'productImageFile') {
      const key = k === 'imageType' ? 'image_type' : k === 'mainText' ? 'main_text' : k
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
  if (!r.ok) throw new Error(`Generation failed: HTTP ${r.status}`)
  return r.json()
}
