export default function ProgressStepper({ currentStep }: { currentStep: number }) {
  const steps = [1, 2, 3, 4, 5, 6];
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 mb-10 w-full max-w-2xl mx-auto px-4">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-2 md:gap-4 flex-1 last:flex-none">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 ${
            currentStep === step
              ? 'bg-[#E8B66F] text-[#0B0907] shadow-[0_0_15px_rgba(232,182,111,0.3)]'
              : currentStep > step
                ? 'bg-[#E8B66F]/20 text-[#E8B66F] border border-[#E8B66F]/40'
                : 'bg-[#21170F] text-[#8A7B6D] border border-[#3B2B1E]'
          }`}>
            {step}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-[1px] w-full transition-colors ${
              currentStep > step ? 'bg-[#E8B66F]/40' : 'bg-[#3B2B1E]'
            }`} />
          )}
        </div>
      ))}
    </div>
  );
}
