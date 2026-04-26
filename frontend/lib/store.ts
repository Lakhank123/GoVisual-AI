import { create } from 'zustand'

interface BrandProfile {
  placeId:    string
  name:       string
  address:    string
  logoUrl:    string
  photos:     { url: string; thumb: string }[]
  colors:     string[]
  website:    string
  selectedReferenceUrl?: string
}

interface WizardAnswers {
  product:    string
  price:      string
  format:     string
  imageType:  string
  purpose:    string
  mood:       string
  background: string
  lighting:   string
  offer:      string
  mainText:   string
  language:   string
  urgency:    string
  productImageFile: File | null
}

interface GeneratedImage {
  tier:          string
  label:         string
  url:           string
  promptPreview: string
}

interface AppState {
  category:    string
  brand:       BrandProfile | null
  wizard:      Partial<WizardAnswers>
  results:     GeneratedImage[]
  caption:     string
  sessionId:   string

  setCategory: (c: string)              => void
  setBrand:    (b: BrandProfile)        => void
  setWizard:   (w: Partial<WizardAnswers>) => void
  setResults:  (r: GeneratedImage[], caption: string, id: string) => void
  reset:       ()                       => void
}

export const useStore = create<AppState>((set) => ({
  category:  '',
  brand:     null,
  wizard:    {},
  results:   [],
  caption:   '',
  sessionId: '',

  setCategory: (category) => set({ category }),
  setBrand:    (brand)    => set({ brand }),
  setWizard:   (wizard)   => set((s) => ({ wizard: { ...s.wizard, ...wizard } })),
  setResults:  (results, caption, sessionId) => set({ results, caption, sessionId }),
  reset:       ()         => set({ brand: null, wizard: {}, results: [], caption: '' }),
}))
