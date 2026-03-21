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
          animation: "skeleton-shimmer 1.8s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function StatCardSkeleton({ delay }: { delay: number }) {
  return (
    <div
      className="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-5"
      style={{ animation: `skeleton-fade-in 0.4s ease-out ${delay}s both` }}
    >
      <Shimmer className="h-10 w-10 shrink-0 !rounded-xl" />
      <div className="flex flex-col gap-2">
        <Shimmer className="w-[60px] h-[10px]" />
        <Shimmer className="w-[50px] h-[22px]" />
      </div>
    </div>
  );
}

function ProjectCardSkeleton({ delay }: { delay: number }) {
  return (
    <div
      className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02]"
      style={{ animation: `skeleton-fade-in 0.4s ease-out ${delay}s both` }}
    >
      {/* Thumbnail area */}
      <Shimmer className="h-[160px] w-full !rounded-b-none !rounded-t-xl" />

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Shimmer className="h-[16px] w-[65%]" />
          <Shimmer className="h-[16px] w-[16px] shrink-0" />
        </div>
        <div className="mt-auto flex items-center gap-3">
          <Shimmer className="h-[11px] w-[60px]" />
          <Shimmer className="h-[11px] w-[40px]" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 py-12">
      <style>{`
        @keyframes skeleton-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes skeleton-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Welcome section */}
      <div
        className="mb-10 flex items-end justify-between gap-4"
        style={{ animation: "skeleton-fade-in 0.3s ease-out both" }}
      >
        <div className="flex flex-col gap-2">
          <Shimmer className="w-[260px] h-[26px]" />
          <Shimmer className="w-[180px] h-[14px]" />
        </div>
        <Shimmer className="w-[150px] h-[42px] !rounded-full" />
      </div>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardSkeleton delay={0.1} />
        <StatCardSkeleton delay={0.2} />
        <StatCardSkeleton delay={0.3} />
      </div>

      {/* Section label */}
      <div
        className="mb-5"
        style={{ animation: "skeleton-fade-in 0.4s ease-out 0.35s both" }}
      >
        <Shimmer className="w-[90px] h-[11px]" />
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ProjectCardSkeleton delay={0.4} />
        <ProjectCardSkeleton delay={0.5} />
        <ProjectCardSkeleton delay={0.6} />
      </div>
    </div>
  );
}
