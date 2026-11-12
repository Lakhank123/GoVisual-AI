/**
 * GoVisual AI — Shared Creative Generation Questions
 * Canonical 10-question definition shared between Creative Generation (Wizard) and Product Photoshoot.
 * Guarantees zero drift across generation workflows.
 */

export interface CreativeQuestion {
  key: string;
  label: string;
  type: 'text' | 'number' | 'choice' | 'image';
  placeholder?: string;
  hint?: string;
  options?: string[];
  defaultValue?: string;
}

export const CREATIVE_QUESTIONS: CreativeQuestion[] = [
  {
    key: 'product',
    label: 'What is your main product?',
    type: 'text',
    placeholder: "e.g. iPhone 16, Men's Kurta, Special Biryani",
  },
  {
    key: 'price',
    label: 'What is the price?',
    type: 'number',
    placeholder: 'e.g. 29999',
  },
  {
    key: 'offer',
    label: 'Any special offer?',
    type: 'choice',
    options: ['No offer', '10% discount', '20% off', 'Buy 1 Get 1 Free', 'Flat ₹500 off', 'Free gift'],
    defaultValue: 'No offer',
  },
  {
    key: 'mood',
    label: 'How should it feel?',
    type: 'choice',
    options: ['Premium & luxurious', 'Bold & energetic', 'Clean & minimal', 'Warm & friendly', 'Festive & colorful'],
    defaultValue: 'Premium & luxurious',
  },
  {
    key: 'background',
    label: 'What kind of background?',
    type: 'choice',
    options: ['Dark tech', 'Bright studio white', 'Outdoor lifestyle', 'Abstract gradient', 'Festive themed', 'Plain white'],
    defaultValue: 'Bright studio white',
  },
  {
    key: 'lighting',
    label: 'What kind of lighting?',
    type: 'choice',
    options: ['Dramatic spotlight', 'Soft natural light', 'Neon glow', 'Bright daylight', 'Cinematic dark'],
    defaultValue: 'Soft natural light',
  },
  {
    key: 'productImageFile',
    label: 'Upload your product photo',
    type: 'image',
    hint: 'A clear photo of the product on any background. This helps AI match your exact product.',
  },
  {
    key: 'mainText',
    label: 'Main text on the image?',
    type: 'text',
    placeholder: 'e.g. New Arrival! or Diwali Special',
  },
  {
    key: 'language',
    label: 'Caption language?',
    type: 'choice',
    options: ['English', 'Hindi', 'Marathi', 'Hinglish'],
    defaultValue: 'English',
  },
  {
    key: 'urgency',
    label: 'Is this time-limited?',
    type: 'choice',
    options: ['No urgency', 'Today only', 'This weekend', 'Limited stock'],
    defaultValue: 'No urgency',
  },
];
