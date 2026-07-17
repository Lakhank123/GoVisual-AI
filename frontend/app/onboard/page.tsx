'use client'

import { useOnboardingStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import ProgressStepper from '@/components/onboarding/ProgressStepper';
import BusinessSearch from '@/components/onboarding/BusinessSearch';
import SignalCollection from '@/components/onboarding/SignalCollection';
import AIProgressPipeline from '@/components/onboarding/AIProgressPipeline';
import BrandProfileEditor from '@/components/onboarding/BrandProfileEditor';
import ProductsEditor from '@/components/onboarding/ProductsEditor';
import AudienceSelector from '@/components/onboarding/AudienceSelector';
import BrandBrainPreview from '@/components/onboarding/BrandBrainPreview';
import { AnimatePresence } from 'framer-motion';

export default function OnboardPage() {
  const { step } = useOnboardingStore();

  const renderStep = () => {
    switch (step) {
      case 1: return <BusinessSearch />;
      case 2: return <SignalCollection />;
      case 3: return <AIProgressPipeline />;
      case 4: return <BrandProfileEditor />;
      case 5: return <ProductsEditor />;
      case 6: return <AudienceSelector />;
      case 7: return <BrandBrainPreview />;
      default: return <BusinessSearch />;
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#060a06] text-white pt-24 pb-12">
        {step !== 3 && step !== 7 && <ProgressStepper currentStep={step} />}
        
        <div className="max-w-6xl mx-auto px-4 w-full">
          <AnimatePresence mode="wait">
            {renderStep()}
          </AnimatePresence>
        </div>
      </main>
    </>
  );
}
