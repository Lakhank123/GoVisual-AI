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

// --- Module 2: Onboarding Store ---

export interface ConfidenceField<T> {
  value: T;
  confidence: number;
  reason: string;
  sources: string[];
}

export interface PaletteColor {
  hex: string;
  role: 'primary' | 'secondary' | 'accent';
  source: string;
  confidence: number;
  manual_override: boolean;
}

export interface VisualDNA {
  primary_color: ConfidenceField<string>;
  secondary_color: ConfidenceField<string>;
  accent_colors: ConfidenceField<string[]>;
  dominant_color: ConfidenceField<string>;
  brand_gradient: any;
  palette: PaletteColor[];
}

export interface OnboardingState {
  step: number;
  
  // Step 1: Search
  shopName: string;
  city: string;
  googlePlaceId: string | null;
  
  // Step 2: Signals
  websiteUrl: string;
  instagramHandle: string;
  logoFile: File | null;
  manualData: Record<string, any>;
  
  // Step 3 & 4: Analysis & Editable Profile
  inferredProfile: Record<string, any> | null;
  
  // Step 5: Products
  products: any[];
  
  // Step 6: Audience
  audienceSegments: string[];
  
  setStep: (step: number) => void;
  updateSearch: (shopName: string, city: string, placeId: string | null) => void;
  updateSignals: (signals: Partial<OnboardingState>) => void;
  setInferredProfile: (profile: Record<string, any>) => void;
  updateInferredField: (field: string, value: any) => void;
  setProducts: (products: any[]) => void;
  setAudienceSegments: (segments: string[]) => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 1,
  shopName: '',
  city: '',
  googlePlaceId: null,
  websiteUrl: '',
  instagramHandle: '',
  logoFile: null,
  manualData: {},
  inferredProfile: null,
  products: [],
  audienceSegments: [],

  setStep: (step) => set({ step }),
  updateSearch: (shopName, city, googlePlaceId) => set({ shopName, city, googlePlaceId }),
  updateSignals: (signals) => set((state) => ({ ...state, ...signals })),
  setInferredProfile: (profile) => set({ inferredProfile: profile }),
  updateInferredField: (field, value) => set((state) => {
    if (!state.inferredProfile) return state;
    const current = state.inferredProfile[field];
    return {
      inferredProfile: {
        ...state.inferredProfile,
        [field]: { ...current, value }
      }
    };
  }),
  setProducts: (products) => set({ products }),
  setAudienceSegments: (audienceSegments) => set({ audienceSegments }),
  resetOnboarding: () => set({
    step: 1, shopName: '', city: '', googlePlaceId: null, websiteUrl: '', instagramHandle: '',
    logoFile: null, manualData: {}, inferredProfile: null, products: [], audienceSegments: []
  })
}))

