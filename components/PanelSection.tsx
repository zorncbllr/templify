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
      style={{
        padding: "9px 10px",
        borderBottom: noBorder ? "none" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p
        style={{
          fontSize: 8,
          fontWeight: 700,
          color: "rgba(240,237,232,0.28)",
          textTransform: "uppercase" as const,
          letterSpacing: "0.08em",
          marginBottom: 7,
        }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

export default PanelSection;
