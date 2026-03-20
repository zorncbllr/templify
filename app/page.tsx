"use client";
import EditorPreview from "@/components/EditorPreview";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  IconUpload,
  IconSparkle,
  IconEye,
  IconDownload,
  IconType,
  IconShrink,
  IconCamera,
  IconBarChart,
  IconUndo,
  IconPalette,
  IconImage,
  IconWand,
  IconKeyboard,
  IconGradCap,
  IconBadge,
  IconIdCard,
  IconClipboard,
  IconMail,
  IconTrophy,
  IconTag,
  IconScroll,
  IconWarning,
  IconCheck,
  IconSettings,
  IconLogOut,
} from "@/components/Icons";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/auth/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const features = [
  {
    icon: <IconUpload size={16} />,
    title: "Upload Your Excel",
    desc: "Drop your spreadsheet and Templify instantly reads every column — names, dates, IDs, anything.",
  },
  {
    icon: <IconSparkle size={16} />,
    title: "Design Your Template",
    desc: "Upload a background image, drag your column fields anywhere on the canvas. Style each field freely.",
  },
  {
    icon: <IconEye size={16} />,
    title: "Preview Every Record",
    desc: "Flip through all rows before exporting. Catch overflow issues before they become 200 broken files.",
  },
  {
    icon: <IconDownload size={16} />,
    title: "Export in Any Format",
    desc: "Download as PNG or PDF. Bulk export every record in one click.",
  },
];

const featureGrid = [
  {
    icon: <IconType size={18} />,
    title: "26+ Google Fonts",
    desc: "Search and preview fonts by category — Serif, Sans, Script, Display, Mono — live on your canvas.",
    accent: "#e8ff47",
  },
  {
    icon: <IconShrink size={18} />,
    title: "Smart Auto-Shrink",
    desc: "Long names never overflow. Text auto-scales to fit its field, and flagged records show in preview.",
    accent: "#ffb400",
  },
  {
    icon: <IconCamera size={18} />,
    title: "Auto Photo Matching",
    desc: "Upload a folder of photos and Templify matches each one to the right row by filename — instantly.",
    accent: "#63b3ed",
  },
  {
    icon: <IconBarChart size={18} />,
    title: "Batch Layout",
    desc: "Print 1, 2, 4, 6, or 9 records per page. Perfect for ID cards, badges, and certificates.",
    accent: "#a78bfa",
  },
  {
    icon: <IconUndo size={18} />,
    title: "Undo / Redo",
    desc: "Full 25-step history. Experiment freely — every change is reversible.",
    accent: "#e8ff47",
  },
  {
    icon: <IconPalette size={18} />,
    title: "Canvas Styling",
    desc: "Set background color, border, corner radius, and grid overlay. Every detail, your call.",
    accent: "#f87171",
  },
  {
    icon: <IconImage size={18} />,
    title: "Background Images",
    desc: "Upload any image as a full-bleed canvas background. Sync the canvas size to match it exactly.",
    accent: "#4ade80",
  },
  {
    icon: <IconWand size={18} />,
    title: "Shadow & Border FX",
    desc: "Add drop shadows, outlines, borders, and corner radius to any text or image element.",
    accent: "#fb923c",
  },
  {
    icon: <IconKeyboard size={18} />,
    title: "Keyboard Shortcuts",
    desc: "Ctrl+D to duplicate, arrow keys to nudge, Delete to remove. Designed for speed.",
    accent: "#e8ff47",
  },
];

const useCases = [
  { label: "School Certificates", icon: <IconGradCap size={16} /> },
  { label: "Event Badges", icon: <IconBadge size={16} /> },
  { label: "ID Cards", icon: <IconIdCard size={16} /> },
  { label: "Scholarship Liquidation", icon: <IconClipboard size={16} /> },
  { label: "Invitations", icon: <IconMail size={16} /> },
  { label: "Award Documents", icon: <IconTrophy size={16} /> },
  { label: "Name Tags", icon: <IconTag size={16} /> },
  { label: "Bulk Certificates", icon: <IconScroll size={16} /> },
];

const exportFormats = ["PNG", "PDF"];

const shrinkRows = [
  { name: "Juan dela Cruz", status: "ok" },
  { name: "Ma. Theresa Bautista-Reyes", status: "warn" },
  { name: "Carlo Mendoza", status: "ok" },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [activeFormat, setActiveFormat] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setIsLoggedIn(true);
        setUserName(data.session.user.user_metadata?.full_name ?? null);
        setUserAvatar(data.session.user.user_metadata?.avatar_url ?? null);
      }
    });
    const interval = setInterval(() => {
      setActiveFormat((p) => (p + 1) % exportFormats.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <div className="bg-app-bg text-app-text min-h-screen overflow-x-hidden">
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
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up-1 { animation: fadeUp 0.7s 0.1s ease both; }
        .fade-up-2 { animation: fadeUp 0.7s 0.2s ease both; }
        .fade-up-3 { animation: fadeUp 0.7s 0.35s ease both; }
        .fade-up-4 { animation: fadeUp 0.7s 0.5s ease both; }
        .float-card { animation: float 4s ease-in-out infinite; }
        .shimmer-text {
          background: linear-gradient(90deg, var(--app-accent), #fff, var(--app-accent));
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
        .feature-card:hover {
          border-color: color-mix(in srgb, var(--app-accent) 20%, transparent) !important;
          background: color-mix(in srgb, var(--app-accent) 3%, transparent) !important;
          transform: translateY(-4px);
        }
        .feature-card { transition: all 0.2s ease; }
        .use-case-pill:hover {
          background: color-mix(in srgb, var(--app-accent) 6%, transparent) !important;
          border-color: color-mix(in srgb, var(--app-accent) 20%, transparent) !important;
        }
      `}</style>

      <div className="grain-overlay" />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-5 bg-app-bg/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-app-accent rounded-lg flex items-center justify-center text-app-bg text-sm font-bold">
            <IconSparkle size={14} />
          </div>
          <span className="font-bold text-lg tracking-tight">Templify</span>
        </div>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                    style={{ background: "none", border: "none", padding: 0 }}
                  >
                    {userAvatar ? (
                      <img
                        src={userAvatar}
                        alt={userName ?? "avatar"}
                        width={36}
                        height={36}
                        className="rounded-full ring-1 ring-white/10 hover:ring-white/30 transition-all"
                      />
                    ) : (
                      <div className="w-[36px] h-[36px] rounded-full bg-app-accent/20 border border-app-accent/30 flex items-center justify-center text-[11px] font-bold text-app-accent">
                        {userName?.[0]}
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  className="w-[200px] p-1.5 rounded-xl border border-[rgba(255,255,255,0.08)] text-[#f0ede8]"
                  style={{
                    background: "rgba(10,10,18,0.97)",
                    backdropFilter: "blur(20px)",
                    boxShadow:
                      "0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
                  }}
                >
                  {userName && (
                    <>
                      <div className="px-2.5 py-2 mb-1">
                        <p className="text-[11px] font-semibold text-[#f0ede8] truncate">
                          {userName}
                        </p>
                      </div>
                      <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.06)] mx-0 my-1" />
                    </>
                  )}
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer rounded-lg px-2.5 py-2 text-[12px] text-[rgba(240,237,232,0.65)] hover:text-[#f0ede8] hover:bg-[rgba(255,255,255,0.05)] focus:bg-[rgba(255,255,255,0.05)] focus:text-[#f0ede8] outline-none transition-colors"
                  >
                    <Link
                      href="/settings"
                      className="flex items-center gap-2.5"
                    >
                      <IconSettings size={13} />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[rgba(255,255,255,0.06)] mx-0 my-1" />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="cursor-pointer rounded-lg px-2.5 py-2 text-[12px]  text-[rgba(240,237,232,0.65)] hover:text-[#f0ede8] hover:bg-[rgba(220,60,60,0.06)] focus:bg-[rgba(220,60,60,0.06)] focus:text-[#f0ede8] outline-none transition-colors flex items-center gap-2.5"
                  >
                    <IconLogOut size={13} />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="w-px h-5 bg-white/10" />
              <Link href="/dashboard">
                <button className="px-6 py-2.5 rounded-full bg-app-accent text-app-bg text-sm font-bold hover:-translate-y-0.5 transition-all">
                  Open app
                </button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login">
                <button className="px-6 py-2.5 rounded-full border border-white/20 text-sm font-medium hover:border-white/40 hover:bg-white/5 transition-all">
                  Sign in
                </button>
              </Link>
              <Link href="/sandbox">
                <button className="px-6 py-2.5 rounded-full bg-app-accent text-app-bg text-sm font-bold hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(232,255,71,0.35)] transition-all">
                  Get started free
                </button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 relative overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-app-accent/[0.12] blur-[80px] top-[10%] left-1/2 -translate-x-1/2 pointer-events-none" />
        <div className="absolute w-[300px] h-[300px] rounded-full bg-[rgba(100,80,255,0.1)] blur-[80px] bottom-[20%] left-[10%] pointer-events-none" />
        <div className="absolute w-[250px] h-[250px] rounded-full bg-[rgba(255,100,80,0.08)] blur-[80px] bottom-[20%] right-[10%] pointer-events-none" />

        <div className="fade-up-1">
          <span className="inline-block bg-app-accent/10 text-app-accent border border-app-accent/20 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase">
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

        <p className="fade-up-3 text-lg text-app-text/55 max-w-lg leading-relaxed mt-6">
          Upload your Excel. Design your template. Drag your fields into place.
          Export as PDF or PNG — all in one go.
        </p>

        <div className="fade-up-4 flex gap-3 mt-10 flex-wrap justify-center">
          <Link href={"/sandbox"}>
            <button className="px-9 py-4 rounded-full bg-app-accent text-app-bg text-base font-bold hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(232,255,71,0.35)] transition-all">
              Try Templify free
            </button>
          </Link>
          <a href="#editor-preview">
            <button className="px-9 py-4 rounded-full border border-white/20 text-base font-medium hover:border-white/40 hover:bg-white/5 transition-all">
              See how it works
            </button>
          </a>
        </div>

        {/* Format pills */}
        <div className="flex gap-2 mt-12 flex-wrap justify-center">
          {exportFormats.map((f, i) => (
            <div
              key={f}
              className="px-5 py-2 rounded-full text-sm font-semibold tracking-wider border transition-all duration-300"
              style={{
                background:
                  activeFormat === i
                    ? "var(--app-accent)"
                    : "rgba(255,255,255,0.05)",
                color:
                  activeFormat === i
                    ? "var(--app-bg)"
                    : "rgba(240,237,232,0.5)",
                borderColor:
                  activeFormat === i
                    ? "var(--app-accent)"
                    : "rgba(255,255,255,0.1)",
              }}
            >
              {f}
            </div>
          ))}
        </div>

        {/* ── EDITOR PREVIEW SECTION ── */}
        <section id="editor-preview" className="py-24 px-6 w-[]">
          <EditorPreview />
        </section>
      </section>

      {/* USE CASES */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <span className="inline-block bg-app-accent/10 text-app-accent border border-app-accent/20 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase">
            Perfect for
          </span>
          <div className="flex flex-wrap gap-3 justify-center">
            {useCases.map((u) => (
              <div
                key={u.label}
                className="use-case-pill flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-full px-5 py-2.5 text-sm text-app-text/70 transition-all whitespace-nowrap cursor-default"
              >
                <span>{u.icon}</span>
                <span>{u.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES STEPS */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-app-accent/10 text-app-accent border border-app-accent/20 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase">
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
                className="feature-card bg-white/[0.03] border border-white/[0.07] rounded-2xl p-8 hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-app-accent/10 border border-app-accent/[0.15] rounded-xl flex items-center justify-center text-xl mb-5">
                  {f.icon}
                </div>
                <p className="text-[11px] font-bold text-app-accent/60 tracking-[0.12em] uppercase mb-2">
                  Step {i + 1}
                </p>
                <h3 className="text-[18px] font-bold tracking-tight mb-2.5">
                  {f.title}
                </h3>
                <p className="text-[14px] text-app-text/50 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block bg-app-accent/10 text-app-accent border border-app-accent/20 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase mb-5">
              What's inside
            </span>
            <h2
              className="font-display font-black tracking-tight leading-tight"
              style={{ fontSize: "clamp(32px,5vw,52px)" }}
            >
              Every tool. Already built.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featureGrid.map((f, i) => (
              <div
                key={i}
                className="feature-card group bg-white/[0.025] border border-white/[0.07] rounded-2xl p-6 cursor-default"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4"
                  style={{
                    background: `${f.accent}14`,
                    border: `1px solid ${f.accent}28`,
                  }}
                >
                  {f.icon}
                </div>
                <h3 className="text-[16px] font-bold tracking-tight mb-2">
                  {f.title}
                </h3>
                <p className="text-[13px] text-app-text/45 leading-relaxed">
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
          <div className="bg-gradient-to-br from-app-accent/[0.06] to-[rgba(100,80,255,0.06)] border border-app-accent/[0.12] rounded-3xl p-14 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block bg-app-accent/10 text-app-accent border border-app-accent/20 rounded-full px-4 py-1.5 text-xs font-semibold tracking-widest uppercase">
                Smart rendering
              </span>
              <h3
                className="font-display font-black mt-5 leading-tight tracking-tight"
                style={{ fontSize: "clamp(28px,4vw,42px)" }}
              >
                Long names never break your layout.
              </h3>
              <p className="text-[15px] text-app-text/50 leading-relaxed mt-4">
                Templify auto-shrinks text to fit its field — and flags any
                records that shrank significantly, right in preview mode. No
                more broken certificates at the bottom of a 200-row batch.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {shrinkRows.map((r, i) => (
                <div
                  key={i}
                  className={`flex justify-between items-center bg-white/[0.04] rounded-xl px-4 py-3.5 transition-all border ${
                    r.status === "warn"
                      ? "border-app-warn/30"
                      : "border-white/[0.08]"
                  }`}
                >
                  <span
                    className="text-app-text"
                    style={{ fontSize: r.status === "warn" ? "13px" : "17px" }}
                  >
                    {r.name}
                  </span>
                  {r.status === "warn" ? (
                    <span className="text-[11px] text-app-warn bg-app-warn/10 border border-app-warn/20 px-2.5 py-1 rounded-full whitespace-nowrap ml-2 inline-flex items-center gap-1">
                      <IconWarning size={10} /> auto-shrunk
                    </span>
                  ) : (
                    <span className="text-[11px] text-app-success bg-app-success/[0.08] border border-app-success/[0.15] px-2.5 py-1 rounded-full ml-2 inline-flex items-center gap-1">
                      <IconCheck size={10} /> fits
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
        <div className="absolute w-[600px] h-[400px] rounded-full bg-app-accent/[0.07] blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="relative z-10">
          <h2
            className="font-display font-black tracking-tight leading-none mb-6"
            style={{ fontSize: "clamp(40px,6vw,72px)" }}
          >
            Your Excel sheet is
            <br />
            <span className="shimmer-text">already halfway there.</span>
          </h2>
          <p className="text-[17px] text-app-text/50 max-w-md mx-auto mb-10">
            Stop manually typing names into templates. Let Templify handle the
            500. You handle the coffee.
          </p>
          <Link href={"/sandbox"}>
            <button className="px-11 py-5 rounded-full bg-app-accent text-app-bg text-[17px] font-bold hover:-translate-y-0.5 hover:shadow-[0_8px_40px_rgba(232,255,71,0.4)] transition-all">
              Start for free — no account needed
            </button>
          </Link>
          <p className="text-[13px] text-app-text/25 mt-4">PNG · PDF · ZIP</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] px-10 py-8 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-app-accent rounded-md flex items-center justify-center text-app-bg text-xs font-bold">
            <IconSparkle size={12} />
          </div>
          <span className="font-bold text-[15px]">Templify</span>
        </div>
        <p className="text-[13px] text-app-text/25">
          Built by a solo founder who was tired of copy-pasting names into
          templates.
        </p>
      </footer>
    </div>
  );
}
