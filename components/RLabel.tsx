function RLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[8px] font-bold text-app-text/[0.28] uppercase tracking-[0.08em] mb-[5px]">
      {children as any}
    </p>
  );
}

export default RLabel;
