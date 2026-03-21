function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-[rgba(255,255,255,0.03)] ${className ?? ""}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 60%, transparent 100%)",
          animation: "pricing-shimmer 1.8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function PlanCardSkeleton({
  delay,
  highlighted,
}: {
  delay: number;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-8 flex flex-col ${
        highlighted
          ? "bg-app-accent/[0.04] border border-app-accent/20"
          : "bg-white/[0.025] border border-white/[0.07]"
      }`}
      style={{ animation: `pricing-fade-in 0.4s ease-out ${delay}s both` }}
    >
      {/* Tier name */}
      <Shimmer className="w-[50px] h-[10px] mb-2" />
      {/* Description */}
      <Shimmer className="w-[160px] h-[13px] mb-6" />
      {/* Price */}
      <Shimmer className="w-[100px] h-[36px] mb-1" />
      {/* Period */}
      <Shimmer className="w-[60px] h-[14px] mb-8" />
      {/* Features */}
      <div className="space-y-3 mb-auto">
        {Array.from({ length: highlighted ? 6 : 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <Shimmer className="w-[13px] h-[13px] shrink-0 !rounded-sm" />
            <Shimmer
              className="h-[13px]"
              style={{ width: `${90 + ((i * 37) % 60)}px` } as React.CSSProperties}
            />
          </div>
        ))}
      </div>
      {/* CTA button */}
      <Shimmer className="w-full h-[40px] !rounded-lg mt-8" />
    </div>
  );
}

export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-app-bg text-app-text overflow-x-hidden">
      <style>{`
        @keyframes pricing-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pricing-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute w-125 h-125 rounded-full bg-app-accent/[0.06] blur-[100px] top-[5%] left-1/2 -translate-x-1/2" />
      </div>

      {/* Top nav */}
      <nav
        className="relative z-20 flex items-center gap-4 px-6 py-5"
        style={{ animation: "pricing-fade-in 0.3s ease-out both" }}
      >
        <Shimmer className="w-[60px] h-[14px]" />
      </nav>

      <div className="relative z-10 max-w-300 mx-auto px-6 pt-4 pb-24">
        {/* Header */}
        <div
          className="text-center mb-12 flex flex-col items-center gap-3"
          style={{ animation: "pricing-fade-in 0.3s ease-out 0.05s both" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-3">
            <Shimmer className="w-10 h-10 !rounded-lg" />
            <Shimmer className="w-[100px] h-[22px]" />
          </div>
          {/* Title */}
          <Shimmer className="w-[340px] h-[36px]" />
          {/* Subtitle */}
          <Shimmer className="w-[240px] h-[16px]" />
        </div>

        {/* Billing cycle toggle */}
        <div
          className="flex justify-center mb-12"
          style={{ animation: "pricing-fade-in 0.3s ease-out 0.15s both" }}
        >
          <div className="flex gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1.5">
            <Shimmer className="w-[80px] h-[36px] !rounded-lg" />
            <Shimmer className="w-[80px] h-[36px] !rounded-lg" />
            <Shimmer className="w-[80px] h-[36px] !rounded-lg" />
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <PlanCardSkeleton delay={0.25} />
          <PlanCardSkeleton delay={0.35} />
          <PlanCardSkeleton delay={0.45} highlighted />
        </div>
      </div>
    </div>
  );
}
