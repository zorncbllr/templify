function RLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 8,
        fontWeight: 700,
        color: "rgba(240,237,232,0.28)",
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        marginBottom: 5,
      }}
    >
      {children as any}
    </p>
  );
}

export default RLabel;
