function PanelSection({
  label,
  children,
  noBorder,
}: {
  label: string;
  children: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <div
      className={`px-[10px] py-[9px] ${noBorder ? "" : "border-b border-white/[0.06]"}`}
    >
      <p className="text-[8px] font-bold text-app-text/[0.28] uppercase tracking-[0.08em] mb-[7px]">
        {label}
      </p>
      {children}
    </div>
  );
}

export default PanelSection;
