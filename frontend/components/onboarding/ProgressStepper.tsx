export default function ProgressStepper({ currentStep }: { currentStep: number }) {
  const steps = [1, 2, 3, 4, 5, 6];
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 mb-10 w-full max-w-2xl mx-auto px-4">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2 md:gap-4 flex-1 last:flex-none">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${
            currentStep === step
              ? 'bg-[#39ff14] text-black shadow-[0_0_15px_rgba(57,255,20,0.3)]'
              : currentStep > step
                ? 'bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/40'
                : 'bg-[#0d160d] text-[#2a4a2a] border border-[#1a2a1a]'
          }`}>
            {step}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-[1px] w-full transition-colors ${
              currentStep > step ? 'bg-[#39ff14]/40' : 'bg-[#1a2a1a]'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}
