"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

const features = [
  {
    icon: "⬆",
    title: "Upload Your Excel",
    desc: "Drop your spreadsheet and Templify instantly reads every column — names, dates, IDs, anything.",
  },
  {
    icon: "✦",
    title: "Design Your Template",
    desc: "Upload a background image, drag your column fields anywhere on the canvas. Style each field freely.",
  },
  {
    icon: "👁",
    title: "Preview Every Record",
    desc: "Flip through all rows before exporting. Catch overflow issues before they become 200 broken files.",
  },
  {
    icon: "⬇",
    title: "Export in Any Format",
    desc: "Download as PNG, PDF, PPTX, or DOCX. Bulk ZIP or one at a time — your choice.",
  },
];

const useCases = [
  { label: "School Certificates", emoji: "🎓" },
  { label: "Event Badges", emoji: "🪪" },
  { label: "ID Cards", emoji: "💳" },
  { label: "Scholarship Liquidation", emoji: "📋" },
  { label: "Invitations", emoji: "✉️" },
  { label: "Award Documents", emoji: "🏆" },
];

const exportFormats = ["PNG", "PDF", "PPTX", "DOCX"];

const sampleData = [
  { name: "Juan dela Cruz", course: "BSIT", date: "Feb 22, 2026" },
  { name: "Ma. Theresa Reyes", course: "BSCS", date: "Feb 22, 2026" },
  { name: "Carlo Mendoza", course: "BSECE", date: "Feb 22, 2026" },
];

const shrinkRows = [
  { name: "Juan dela Cruz", status: "ok" },
  { name: "Ma. Theresa Bautista-Reyes", status: "warn" },
  { name: "Carlo Mendoza", status: "ok" },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [activeFormat, setActiveFormat] = useState(0);
  const [previewRow, setPreviewRow] = useState(0);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setActiveFormat((p) => (p + 1) % exportFormats.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  // Render nothing on server — prevents any hydration mismatch
  if (!mounted) return null;

  return (
    <div className="bg-[#0a0a0f] text-[#f0ede8] min-h-screen overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&family=Playfair+Display:wght@700;900&display=swap');
        body, html { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Playfair Display', serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .fade-up-1 { animation: fadeUp 0.7s 0.1s ease both; }
        .fade-up-2 { animation: fadeUp 0.7s 0.2s ease both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.35s ease both; }
        .fade-up-4 { animation: fadeUp 0.7s 0.5s ease both; }
        .float-card { animation: float 4s ease-in-out infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, #e8ff47, #fff, #e8ff47);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .grain-overlay {
          position: fixed; inset: 0; pointer-events: none; z-index: 100; opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className="grain-overlay" />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#e8ff47] rounded-lg flex items-center justify-center text-[#0a0a0f] text-sm font-bold">
            ✦
          </div>
          <span className="font-bold text-lg tracking-tight">Templify</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-6 py-2.5 rounded-full border border-white/20 text-sm font-medium hover:border-white/40 hover:bg-white/5 transition-all">
            Sign in
          </button>
          <Link href={"/sandbox"}>
            <button className="px-6 py-2.5 rounded-full bg-[#e8ff47] text-[#0a0a0f] text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(232,255,71,0.35)] transition-all">
              Get started free
            </button>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 relative overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[rgba(232,255,71,0.12)] blur-[80px] top-[10%] left-1/2 -translate-x-1/2 pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-[rgba(100,80,255,0.1)] blur-[80px] bottom-[20%] left-[10%] pointer-events-none" />
        <div className="absolute w-[250px] h-[250px] rounded-full bg-[rgba(255,100,80,0.08)] blur-[80px] bottom-[20%] right-[10%] pointer-events-none" />

        <div className="fade-up-1">
          <span className="inline-block bg-[rgba(232,255,71,0.1)] text-[#e8ff47] border border-[rgba(232,255,71,0.2)] rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase">
            Free to start · No credit card needed
          </span>
        </div>

        <h1
          className="font-display fade-up-2 font-black leading-none tracking-tight mt-6 max-w-4xl"
          style={{
            fontSize: "clamp(52px, 8vw, 96px)",
            letterSpacing: "-0.03em",
          }}
        >
          Stop copy-pasting.
          <br />
          <span className="shimmer-text">Fill 500 templates</span>
          <br />
          in seconds.
        </h1>

        <p className="fade-up-3 text-lg text-[#f0ede8]/55 max-w-lg leading-relaxed mt-6">
          Upload your Excel. Design your template. Drag your fields into place.
          Export as PDF, PNG, PPTX, or DOCX — all in one go.
        </p>

        <div className="fade-up-4 flex gap-3 mt-10 flex-wrap justify-center">
          <Link href={"/sandbox"}>
            <button className="px-9 py-4 rounded-full bg-[#e8ff47] text-[#0a0a0f] text-base font-bold hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(232,255,71,0.35)] transition-all">
              Try Templify free →
            </button>
          </Link>
          <button className="px-9 py-4 rounded-full border border-white/20 text-base font-medium hover:border-white/40 hover:bg-white/5 transition-all">
            See how it works
          </button>
        </div>

        {/* Format pills */}
        <div className="flex gap-2 mt-12 flex-wrap justify-center">
          {exportFormats.map((f, i) => (
            <div
              key={f}
              className="px-5 py-2 rounded-full text-sm font-semibold tracking-wider border transition-all duration-300"
              style={{
                background:
                  activeFormat === i ? "#e8ff47" : "rgba(255,255,255,0.05)",
                color: activeFormat === i ? "#0a0a0f" : "rgba(240,237,232,0.5)",
                borderColor:
                  activeFormat === i ? "#e8ff47" : "rgba(255,255,255,0.1)",
              }}
            >
              {f}
            </div>
          ))}
        </div>

        {/* Preview card */}
        <div className="float-card fade-up-4 mt-16 w-full max-w-[680px]">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.07]">
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <div
                  key={c}
                  className="w-3 h-3 rounded-full"
                  style={{ background: c }}
                />
              ))}
              <span className="ml-2 text-[13px] text-white/30 font-mono">
                templify.app — preview mode
              </span>
            </div>
            <div className="p-6">
              <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-[rgba(232,255,71,0.15)] rounded-xl p-8 text-center mb-4 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(232,255,71,0.06),transparent_70%)]" />
                <p className="text-[11px] tracking-[0.2em] text-[#e8ff47]/60 uppercase mb-3">
                  Certificate of Completion
                </p>
                <p className="font-display text-[22px] font-bold text-[#f0ede8] mb-2 transition-all duration-300">
                  {sampleData[previewRow].name}
                </p>
                <p className="text-[13px] text-[#f0ede8]/50 mb-1">
                  {sampleData[previewRow].course}
                </p>
                <p className="text-[12px] text-[#f0ede8]/35">
                  {sampleData[previewRow].date}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPreviewRow((p) => Math.max(0, p - 1))}
                  className="w-8 h-8 rounded-full bg-white/[0.06] text-[#f0ede8] flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all border-0"
                >
                  ←
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-[#f0ede8]/40">
                    Preview {previewRow + 1} of {sampleData.length}
                  </span>
                  <div className="flex gap-1.5">
                    {sampleData.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPreviewRow(i)}
                        className="w-2 h-2 rounded-full border-0 cursor-pointer transition-all"
                        style={{
                          background:
                            previewRow === i
                              ? "#e8ff47"
                              : "rgba(255,255,255,0.2)",
                          transform:
                            previewRow === i ? "scale(1.3)" : "scale(1)",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  onClick={() =>
                    setPreviewRow((p) => Math.min(sampleData.length - 1, p + 1))
                  }
                  className="w-8 h-8 rounded-full bg-white/[0.06] text-[#f0ede8] flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all border-0"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[13px] text-[#f0ede8]/35 tracking-[0.1em] uppercase mb-6">
            Perfect for
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {useCases.map((u) => (
              <div
                key={u.label}
                className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-5 py-2.5 text-sm text-[#f0ede8]/70 hover:bg-[rgba(232,255,71,0.06)] hover:border-[rgba(232,255,71,0.2)] transition-all whitespace-nowrap cursor-default"
              >
                <span>{u.emoji}</span>
                <span>{u.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-[rgba(232,255,71,0.1)] text-[#e8ff47] border border-[rgba(232,255,71,0.2)] rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase">
              How it works
            </span>
            <h2
              className="font-display font-black mt-5 tracking-tight leading-tight"
              style={{ fontSize: "clamp(36px,5vw,56px)" }}
            >
              Four steps.
              <br />
              Hundreds of documents.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 hover:border-[rgba(232,255,71,0.2)] hover:bg-[rgba(232,255,71,0.03)] hover:-translate-y-1 transition-all"
              >
                <div className="w-12 h-12 bg-[rgba(232,255,71,0.1)] border border-[rgba(232,255,71,0.15)] rounded-xl flex items-center justify-center text-xl mb-5">
                  {f.icon}
                </div>
                <p className="text-[11px] font-bold text-[#e8ff47]/60 tracking-[0.12em] uppercase mb-2">
                  Step {i + 1}
                </p>
                <h3 className="text-[18px] font-bold tracking-tight mb-2.5">
                  {f.title}
                </h3>
                <p className="text-[14px] text-[#f0ede8]/50 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SMART FEATURE CALLOUT */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-[rgba(232,255,71,0.06)] to-[rgba(100,80,255,0.06)] border border-[rgba(232,255,71,0.12)] rounded-3xl p-14 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block bg-[rgba(232,255,71,0.1)] text-[#e8ff47] border border-[rgba(232,255,71,0.2)] rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase">
                Smart rendering
              </span>
              <h3
                className="font-display font-black mt-5 leading-tight tracking-tight"
                style={{ fontSize: "clamp(28px,4vw,42px)" }}
              >
                Long names never break your layout.
              </h3>
              <p className="text-[15px] text-[#f0ede8]/50 leading-relaxed mt-4">
                Templify auto-shrinks text to fit its field — and flags any
                records that shrank significantly, right in preview mode. No
                more broken certificates at the bottom of a 200-row batch.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {shrinkRows.map((r, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-white/[0.04] rounded-xl px-4 py-3.5 transition-all"
                  style={{
                    border: `1px solid ${r.status === "warn" ? "rgba(255,180,0,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <span
                    className="text-[#f0ede8]"
                    style={{ fontSize: r.status === "warn" ? "13px" : "17px" }}
                  >
                    {r.name}
                  </span>
                  {r.status === "warn" ? (
                    <span className="text-[11px] text-[#ffb400] bg-[rgba(255,180,0,0.1)] border border-[rgba(255,180,0,0.2)] px-2.5 py-1 rounded-full whitespace-nowrap ml-2">
                      ⚠ auto-shrunk
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#4cff91] bg-[rgba(76,255,145,0.08)] border border-[rgba(76,255,145,0.15)] px-2.5 py-1 rounded-full ml-2">
                      ✓ fits
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center relative overflow-hidden">
        <div className="absolute w-[600px] h-[400px] rounded-full bg-[rgba(232,255,71,0.07)] blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="relative z-10">
          <h2
            className="font-display font-black tracking-tight leading-none mb-6"
            style={{ fontSize: "clamp(40px,6vw,72px)" }}
          >
            Your Excel sheet is
            <br />
            <span className="shimmer-text">already halfway there.</span>
          </h2>
          <p className="text-[17px] text-[#f0ede8]/50 max-w-md mx-auto mb-10">
            Stop manually typing names into templates. Let Templify handle the
            500. You handle the coffee.
          </p>
          <button className="px-11 py-5 rounded-full bg-[#e8ff47] text-[#0a0a0f] text-[17px] font-bold hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(232,255,71,0.4)] transition-all">
            Start for free — no account needed
          </button>
          <p className="text-[13px] text-[#f0ede8]/25 mt-4">
            PNG · PDF · PPTX · DOCX · ZIP
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] px-10 py-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#e8ff47] rounded-md flex items-center justify-center text-[#0a0a0f] text-xs font-bold">
            ✦
          </div>
          <span className="font-bold text-[15px]">Templify</span>
        </div>
        <p className="text-[13px] text-[#f0ede8]/25">
          Built by a solo founder who was tired of copy-pasting names into
          Template.
        </p>
      </footer>
    </div>
  );
}
