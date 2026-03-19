"use client";

import { signInWithGoogle } from "@/lib/auth/actions";
import { IconGoogle } from "@/components/Icons";

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a10",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: "48px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 32,
        }}
      >
        {/* Logo / wordmark */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#f0ede8",
              letterSpacing: "-0.5px",
              marginBottom: 8,
            }}
          >
            Templify
          </div>
          <p
            style={{
              fontSize: 13,
              color: "rgba(240,237,232,0.5)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Sign in to save your projects and export without limits
          </p>
        </div>

        {/* Google OAuth button */}
        <button
          onClick={signInWithGoogle}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "12px 20px",
            background: "#e8ff47",
            color: "#0a0a10",
            border: "none",
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <IconGoogle size={18} />
          Continue with Google
        </button>

        {/* Back link */}
        <a
          href="/"
          style={{
            fontSize: 12,
            color: "rgba(240,237,232,0.35)",
            textDecoration: "none",
          }}
        >
          Back to home
        </a>
      </div>
    </div>
  );
}
