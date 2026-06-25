import Link from "next/link";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Pro plan", href: "#pro-plan" },
  { label: "Templates", href: "#templates" },
  { label: "User Guide", href: "#guide" },
];

const templateCards = [
  {
    title: "Slack to Summary",
    description: "Trigger from Slack, summarize with AI, and post the result back to the channel.",
  },
  {
    title: "Webhook to Gmail",
    description: "Accept external events, transform the payload, and send a polished Gmail response.",
  },
  {
    title: "Delay and Retry Flow",
    description: "Build reliable automations with conditional branches, retries, and delayed resumes.",
  },
];

const guideSteps = [
  "Start from a trigger node such as Slack, Cron, or Webhook.",
  "Connect AI, HTTP, Gmail, or Conditional nodes to shape the workflow.",
  "Use the inspector to verify execution, errors, retries, and branches.",
  "Upgrade to Pro when you are ready for higher limits and more runs.",
];

export default function Home() {
  return (
    <main
      id="home"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(20, 184, 166, 0.18), transparent 30%), radial-gradient(circle at top right, rgba(59, 130, 246, 0.16), transparent 28%), linear-gradient(180deg, #070b14 0%, #0b1120 45%, #050816 100%)",
        color: "#f8fafc",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          backdropFilter: "blur(14px)",
          background: "rgba(7, 11, 20, 0.7)",
          borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "18px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap" }}>
            <Link
              href="/"
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 0.2,
                textDecoration: "none",
                color: "#f8fafc",
              }}
            >
              FlowForge
            </Link>
            <nav style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  style={{
                    color: "#cbd5e1",
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link
              href="/login"
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "1px solid rgba(148, 163, 184, 0.22)",
                color: "#e2e8f0",
                textDecoration: "none",
                fontWeight: 600,
                background: "rgba(15, 23, 42, 0.62)",
              }}
            >
              Login
            </Link>
            <Link
              href="/login?mode=signup"
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "1px solid rgba(45, 212, 191, 0.35)",
                color: "#001a16",
                textDecoration: "none",
                fontWeight: 700,
                background: "linear-gradient(135deg, #5eead4 0%, #2dd4bf 100%)",
                boxShadow: "0 18px 40px rgba(45, 212, 191, 0.22)",
              }}
            >
              Signup
            </Link>
          </div>
        </div>
      </header>

      <section
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "72px 24px 36px",
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 28,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 999,
              border: "1px solid rgba(45, 212, 191, 0.24)",
              background: "rgba(15, 23, 42, 0.62)",
              color: "#99f6e4",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 18,
            }}
          >
            MVP launch ready
          </div>
          <h1
            style={{
              fontSize: "clamp(42px, 6vw, 72px)",
              lineHeight: 1.02,
              margin: 0,
              maxWidth: 820,
              letterSpacing: -1.8,
            }}
          >
            Build workflows that branch, retry, delay, and ship with confidence.
          </h1>
          <p
            style={{
              marginTop: 18,
              maxWidth: 700,
              color: "#cbd5e1",
              fontSize: 18,
              lineHeight: 1.7,
            }}
          >
            FlowForge is a workflow automation canvas for teams who want clean
            triggers, clear execution logs, and a simple path from prototype to
            production.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
            <Link
              href="/workflows"
              style={{
                padding: "13px 18px",
                borderRadius: 14,
                background: "linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)",
                color: "#f8fafc",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 18px 40px rgba(14, 165, 233, 0.22)",
              }}
            >
              Open App
            </Link>
            <a
              href="#templates"
              style={{
                padding: "13px 18px",
                borderRadius: 14,
                border: "1px solid rgba(148, 163, 184, 0.22)",
                color: "#e2e8f0",
                textDecoration: "none",
                fontWeight: 700,
                background: "rgba(15, 23, 42, 0.5)",
              }}
            >
              View Templates
            </a>
          </div>
        </div>

        <div
          style={{
            padding: 22,
            borderRadius: 24,
            border: "1px solid rgba(148, 163, 184, 0.16)",
            background:
              "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.92) 100%)",
            boxShadow: "0 30px 80px rgba(2, 6, 23, 0.45)",
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: "rgba(15, 118, 110, 0.15)",
              border: "1px solid rgba(45, 212, 191, 0.16)",
              marginBottom: 16,
            }}
          >
            <div style={{ color: "#99f6e4", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2 }}>
              Live MVP banner
            </div>
            <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>
              Connect triggers to AI, email, Slack, and HTTP without losing visibility.
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {[
              { label: "Triggers", value: "Slack, Webhook, Cron" },
              { label: "Logic", value: "Conditional, Retry, Delay, Loop" },
              { label: "Actions", value: "AI, Gmail, Slack, HTTP" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 14,
                  padding: 14,
                  borderRadius: 16,
                  background: "rgba(15, 23, 42, 0.68)",
                  border: "1px solid rgba(148, 163, 184, 0.12)",
                }}
              >
                <span style={{ color: "#94a3b8", fontSize: 13, textTransform: "uppercase" }}>{item.label}</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="pro-plan"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "28px 24px 0",
        }}
      >
        <div
          style={{
            borderRadius: 24,
            padding: 24,
            background: "rgba(15, 23, 42, 0.72)",
            border: "1px solid rgba(148, 163, 184, 0.14)",
            display: "grid",
            gap: 18,
          }}
        >
          <div>
            <div style={{ color: "#5eead4", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2 }}>
              Pro plan
            </div>
            <h2 style={{ margin: "8px 0 0", fontSize: 30 }}>Built for heavier usage and more production-ready workflows.</h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            {[
              "Higher workflow limits",
              "More monthly executions",
              "Access to all node types",
              "Reliable payment upgrade flow",
            ].map((item) => (
              <div
                key={item}
                style={{
                  padding: 16,
                  borderRadius: 16,
                  background: "rgba(2, 6, 23, 0.48)",
                  border: "1px solid rgba(148, 163, 184, 0.12)",
                  color: "#e2e8f0",
                  fontWeight: 600,
                }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="templates"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "36px 24px 0",
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: "#5eead4", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2 }}>
            Templates
          </div>
          <h2 style={{ margin: "8px 0 0", fontSize: 30 }}>Starter flows you can build on immediately.</h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {templateCards.map((card) => (
            <article
              key={card.title}
              style={{
                padding: 20,
                borderRadius: 20,
                background: "rgba(15, 23, 42, 0.66)",
                border: "1px solid rgba(148, 163, 184, 0.14)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: 20 }}>{card.title}</h3>
              <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.7 }}>{card.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="guide"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "36px 24px 72px",
        }}
      >
        <div
          style={{
            borderRadius: 24,
            padding: 24,
            background: "rgba(15, 23, 42, 0.72)",
            border: "1px solid rgba(148, 163, 184, 0.14)",
          }}
        >
          <div style={{ color: "#5eead4", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2 }}>
            User Guide
          </div>
          <h2 style={{ margin: "8px 0 18px", fontSize: 30 }}>The shortest path to getting a workflow live.</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {guideSteps.map((step, index) => (
              <div
                key={step}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  padding: 16,
                  borderRadius: 16,
                  background: "rgba(2, 6, 23, 0.48)",
                  border: "1px solid rgba(148, 163, 184, 0.12)",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    flex: "0 0 auto",
                    background: "linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)",
                    color: "#f8fafc",
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {index + 1}
                </div>
                <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>{step}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
