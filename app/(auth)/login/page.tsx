"use client";

import { signInWithGoogle } from "@/lib/auth/actions";
import { IconGoogle, IconSparkle } from "@/components/Icons";
import EditorPreview from "@/components/EditorPreview";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#08080f] flex relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@700;900&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .font-display { font-family: 'Playfair Display', serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .fade-1 { animation: fadeUp 0.5s 0.05s ease both; }
        .fade-2 { animation: fadeUp 0.5s 0.15s ease both; }
        .fade-3 { animation: fadeUp 0.5s 0.25s ease both; }
        .fade-4 { animation: fadeUp 0.5s 0.35s ease both; }

        .grain {
          position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .google-btn {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .google-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(232,255,71,0.28);
        }
        .google-btn:active { transform: translateY(0); }
        .dot-pulse { animation: pulse-dot 2s ease-in-out infinite; }
      `}</style>

      <div className="grain" />

      {/* ── Left: Editor preview ──────────────────────────── */}
      <div
        className="relative hidden lg:block flex-1"
        style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
      >
        {/* This div is the clip boundary — fills the panel, hides overflow */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Glows behind editor */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(232,255,71,0.05) 0%, transparent 70%)",
              zIndex: 1,
            }}
          />

          {/* EditorPreview scaled from top-left, clipped by parent */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -35%) scale(0.92)",
              transformOrigin: "center center",
              width: 1100,
              height: 1000,
              zIndex: 2,
            }}
          >
            <EditorPreview />
          </div>

          {/* Right-side fade so it bleeds into the border */}
          <div
            className="absolute inset-y-0 right-0 w-32 pointer-events-none"
            style={{
              background: "linear-gradient(to right, transparent, #08080f)",
              zIndex: 3,
            }}
          />
          {/* Top fade */}
          <div
            className="absolute inset-x-0 top-0 h-24 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, #08080f, transparent)",
              zIndex: 3,
            }}
          />
          {/* Bottom fade */}
          <div
            className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
            style={{
              background: "linear-gradient(to top, #08080f, transparent)",
              zIndex: 3,
            }}
          />
        </div>

        {/* Live preview badge */}
        <div
          className="absolute top-8 left-8 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#e8ff47] dot-pulse" />
          <span
            className="text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "rgba(240,237,232,0.35)" }}
          >
            Live preview
          </span>
        </div>
      </div>

      {/* ── Right: Login panel ────────────────────────────── */}
      <div className="relative z-10 w-full lg:w-[450px] shrink-0 flex flex-col justify-between px-10 py-10">
        {/* Logo */}
        <div className="fade-1 flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "#e8ff47" }}
          >
            <IconSparkle size={15} color="#08080f" />
          </div>
          <span className="font-bold text-[17px] text-[#f0ede8] tracking-tight">
            Templify
          </span>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-6">
          <div className="fade-2">
            <h1 className="font-display text-[38px] font-black text-[#f0ede8] tracking-[-0.03em] leading-[1.05] mb-3 text-center">
              Welcome back.
            </h1>
            <p
              className="text-[13px] leading-relaxed text-center"
              style={{ color: "rgba(240,237,232,0.42)" }}
            >
              Sign in to save your projects and export without limits.
            </p>
          </div>

          <div className="fade-3 flex flex-col gap-3">
            <button
              onClick={signInWithGoogle}
              className="google-btn w-full flex items-center justify-center gap-3 rounded-xl text-[14px] font-bold cursor-pointer"
              style={{
                padding: "13px 20px",
                background: "#e8ff47",
                color: "#08080f",
                border: "none",
              }}
            >
              <IconGoogle size={17} />
              Continue with Google
            </button>

            <div className="flex items-center gap-3">
              <div
                className="flex-1 h-px"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <span
                className="text-[11px] font-mono"
                style={{ color: "rgba(240,237,232,0.2)" }}
              >
                or
              </span>
              <div
                className="flex-1 h-px"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
            </div>

            <a
              href="/sandbox"
              className="w-full flex items-center justify-center rounded-xl text-[13px] font-semibold"
              style={{
                padding: "12px 20px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(240,237,232,0.55)",
                textDecoration: "none",
                transition: "background 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.color = "rgba(240,237,232,0.9)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.color = "rgba(240,237,232,0.55)";
              }}
            >
              Try without an account
            </a>
          </div>

          <p
            className="fade-4 text-[11px] leading-relaxed text-center"
            style={{ color: "rgba(240,237,232,0.2)" }}
          >
            By continuing, you agree to our{" "}
            <a
              href="/terms"
              style={{
                color: "rgba(240,237,232,0.38)",
                textDecoration: "underline",
              }}
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              style={{
                color: "rgba(240,237,232,0.38)",
                textDecoration: "underline",
              }}
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>

        {/* Back */}
        <div className="fade-4">
          <a
            href="/"
            className="text-[12px]"
            style={{
              color: "rgba(240,237,232,0.25)",
              textDecoration: "none",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "rgba(240,237,232,0.55)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(240,237,232,0.25)")
            }
          >
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}
