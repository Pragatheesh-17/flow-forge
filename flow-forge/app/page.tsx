import Link from "next/link";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Pro plan", href: "#pricing" },
  { label: "Templates", href: "#templates" },
  { label: "User Guide", href: "#guide" },
];

const quickLinks = [
  {
    title: "Deploy on Vercel",
    description: "Run the app on your production domain and keep local work isolated.",
    href: "#guide",
  },
  {
    title: "Connect Slack",
    description: "Trigger workflows from Slack messages and send results back to channels.",
    href: "#templates",
  },
  {
    title: "Best Practice & Showcase",
    description: "Start with reliable templates for branches, retries, delays, and alerts.",
    href: "#templates",
  },
];

const features = [
  {
    title: "Visual Builder",
    description: "Design workflows on a React Flow canvas with triggers, actions, and logic nodes.",
  },
  {
    title: "Branching Logic",
    description: "Use conditional, error, loop, retry, and delay paths for real automation flows.",
  },
  {
    title: "Global Payments",
    description: "Upgrade users with Razorpay and enforce usage limits without feature gating.",
  },
  {
    title: "Run Inspector",
    description: "Inspect node inputs, outputs, errors, retries, branches, and execution timing.",
  },
];

const templates = [
  "Slack message to AI summary",
  "Webhook to Gmail response",
  "Cron report to Slack",
  "HTTP failure to error branch",
  "Delay follow-up reminder",
  "JSON transform to action",
];

function AvatarStack() {
  const people = ["FF", "AI", "SL", "GM", "CR", "HT"];

  return (
    <div className="avatar-row" aria-label="FlowForge contributors and integrations">
      {people.map((person, index) => (
        <span key={person} className="avatar" style={{ zIndex: people.length - index }}>
          {person}
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <main id="home" className="landing">
      <header className="site-header">
        <div className="nav-wrap">
          <Link href="/" className="brand" aria-label="FlowForge home">
            <span className="brand-mark">F</span>
            <span>FlowForge</span>
          </Link>

          <nav className="nav-links" aria-label="Main navigation">
            {navItems.map((item) => (
              <a href={item.href} key={item.label}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="nav-actions">
            <a className="stars" href="#templates" aria-label="Template count">
              12 templates
            </a>
            <Link className="login-link" href="/login">
              Login
            </Link>
            <Link className="signup-link" href="/login?mode=signup">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="hero">
        <h1>
          Ship your workflows to the world easier with <span>FlowForge</span>
        </h1>

        <p className="hero-copy">
          A focused workflow automation platform for building, running, and debugging
          Slack, Gmail, HTTP, AI, webhook, and cron workflows from one canvas.
        </p>

        <div className="hero-actions">
          <Link className="primary-action" href="/workflows">
            Get Started
          </Link>
          <code>$ create flowforge-workflow</code>
        </div>

        <div className="social-proof">
          <AvatarStack />
          <div>
            <strong>Built for workflow operators</strong>
            <span>Helping teams move from one-off scripts to observable automations.</span>
          </div>
        </div>
      </section>

      <section className="quick-grid" aria-label="Quick actions">
        {quickLinks.map((link) => (
          <a className="quick-card" href={link.href} key={link.title}>
            <strong>{link.title}</strong>
            <span>{link.description}</span>
          </a>
        ))}
      </section>

      <section className="feature-grid" id="templates">
        {features.map((feature) => (
          <article key={feature.title} className="feature-card">
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="sponsor-strip" aria-label="FlowForge integrations">
        <p>Loved by your stack</p>
        <div>
          {["Slack", "Gmail", "Gemini", "Supabase", "Razorpay", "Vercel"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="demo" id="guide">
        <div className="section-heading">
          <h2>
            Watch a workflow run, then build your automation in <span>minutes</span>
          </h2>
          <p>
            Trigger from Slack, branch with conditions, retry failed actions, and inspect
            every node run without leaving the product.
          </p>
        </div>

        <div className="product-shot" aria-label="FlowForge workflow canvas preview">
          <div className="window-bar">
            <span />
            <span />
            <span />
          </div>
          <div className="canvas-preview">
            <div className="node trigger">Slack Trigger</div>
            <div className="line line-one" />
            <div className="node condition">Conditional</div>
            <div className="line line-two" />
            <div className="node ai">AI Transform</div>
            <div className="line line-three" />
            <div className="node action">Slack Send</div>
            <aside>
              <strong>Run Inspector</strong>
              <span>Status: SUCCESS</span>
              <span>Retries: 0</span>
              <span>Duration: 2.8s</span>
            </aside>
          </div>
        </div>
      </section>

      <section className="pricing" id="pricing">
        <div>
          <p className="eyebrow">Pro plan</p>
          <h2>Scale usage without locking node types behind a paywall.</h2>
        </div>
        <div className="pricing-list">
          <span>Free: 5 workflows and 100 monthly executions</span>
          <span>Pro: 1000 workflows and 10000 monthly executions</span>
          <span>All plans include Slack, Gmail, AI, HTTP, Cron, Retry, Delay, Loop, and Conditional nodes</span>
        </div>
      </section>

      <section className="templates">
        <p className="eyebrow">Templates</p>
        <h2>Start from practical workflow patterns.</h2>
        <div className="template-cloud">
          {templates.map((template) => (
            <span key={template}>{template}</span>
          ))}
        </div>
      </section>

      <footer className="footer">
        <span>Copyright © 2026 FlowForge. All rights reserved.</span>
        <Link href="/login">Login</Link>
      </footer>

      <style>{`
        .landing {
          min-height: 100vh;
          color: #0b1220;
          background:
            linear-gradient(rgba(15, 23, 42, 0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.045) 1px, transparent 1px),
            #ffffff;
          background-size: 36px 36px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .site-header {
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid #e5e7eb;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(16px);
        }

        .nav-wrap {
          max-width: 1180px;
          margin: 0 auto;
          min-height: 68px;
          padding: 0 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
        }

        .brand,
        .nav-links a,
        .nav-actions a,
        .quick-card,
        .footer a {
          color: inherit;
          text-decoration: none;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .brand-mark {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border: 1px solid #111827;
          border-radius: 8px;
          background: #111827;
          color: #ffffff;
          font-weight: 800;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 22px;
          color: #4b5563;
          font-size: 14px;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }

        .stars {
          border: 1px solid #d1d5db;
          border-radius: 999px;
          padding: 7px 12px;
          color: #374151;
          background: #ffffff;
        }

        .login-link {
          color: #374151;
        }

        .signup-link,
        .primary-action {
          border-radius: 999px;
          background: #111827;
          color: #ffffff !important;
          font-weight: 700;
        }

        .signup-link {
          padding: 9px 15px;
        }

        .hero {
          max-width: 1040px;
          margin: 0 auto;
          padding: 96px 22px 34px;
          text-align: center;
        }

        .hero h1 {
          max-width: 930px;
          margin: 0 auto;
          font-size: 68px;
          line-height: 1.06;
          letter-spacing: 0;
          font-weight: 800;
        }

        .hero h1 span {
          display: inline-block;
          color: #111827;
        }

        .hero-copy {
          max-width: 720px;
          margin: 22px auto 0;
          color: #4b5563;
          font-size: 18px;
          line-height: 1.75;
        }

        .hero-actions {
          margin-top: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .primary-action {
          padding: 13px 20px;
          text-decoration: none;
        }

        .hero-actions code {
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 999px;
          background: #f9fafb;
          color: #111827;
          font-size: 14px;
        }

        .social-proof {
          margin-top: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: #4b5563;
          font-size: 14px;
        }

        .social-proof div:last-child {
          display: grid;
          gap: 3px;
          text-align: left;
        }

        .social-proof strong {
          color: #111827;
        }

        .avatar-row {
          display: flex;
          align-items: center;
          padding-left: 14px;
        }

        .avatar {
          width: 34px;
          height: 34px;
          margin-left: -14px;
          display: grid;
          place-items: center;
          border: 2px solid #ffffff;
          border-radius: 999px;
          background: #111827;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
        }

        .quick-grid,
        .feature-grid,
        .sponsor-strip,
        .demo,
        .pricing,
        .templates,
        .testimonials,
        .footer {
          max-width: 1180px;
          margin: 0 auto;
          padding-left: 22px;
          padding-right: 22px;
        }

        .quick-grid {
          padding-top: 32px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .quick-card {
          min-height: 128px;
          padding: 20px;
          display: grid;
          align-content: start;
          gap: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.86);
          box-shadow: 0 18px 46px rgba(15, 23, 42, 0.06);
        }

        .quick-card span,
        .feature-card p,
        .section-heading p,
        .pricing-list,
        .footer {
          color: #4b5563;
        }

        .feature-grid {
          padding-top: 56px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 18px;
        }

        .feature-card {
          padding: 8px 0;
        }

        .feature-card h2 {
          margin: 0 0 10px;
          font-size: 22px;
        }

        .feature-card p {
          margin: 0;
          line-height: 1.7;
        }

        .sponsor-strip {
          padding-top: 54px;
          text-align: center;
        }

        .sponsor-strip p,
        .eyebrow {
          margin: 0 0 18px;
          color: #6b7280;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0;
          font-weight: 700;
        }

        .sponsor-strip div,
        .template-cloud {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .sponsor-strip span,
        .template-cloud span {
          border: 1px solid #d1d5db;
          border-radius: 999px;
          background: #ffffff;
          padding: 10px 14px;
          color: #374151;
          font-weight: 700;
          font-size: 14px;
        }

        .demo {
          padding-top: 76px;
        }

        .section-heading {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 30px;
        }

        .section-heading h2,
        .pricing h2,
        .templates h2 {
          margin: 0;
          font-size: 44px;
          line-height: 1.14;
          letter-spacing: 0;
        }

        .section-heading h2 span {
          color: #16a34a;
        }

        .section-heading p {
          margin: 14px auto 0;
          font-size: 17px;
          line-height: 1.7;
        }

        .product-shot {
          overflow: hidden;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #f8fafc;
          box-shadow: 0 28px 70px rgba(15, 23, 42, 0.14);
        }

        .window-bar {
          height: 42px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 16px;
          border-bottom: 1px solid #e5e7eb;
          background: #ffffff;
        }

        .window-bar span {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          background: #111827;
          opacity: 0.22;
        }

        .canvas-preview {
          min-height: 430px;
          position: relative;
          background:
            linear-gradient(rgba(17, 24, 39, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(17, 24, 39, 0.06) 1px, transparent 1px),
            #f9fafb;
          background-size: 28px 28px;
        }

        .node {
          position: absolute;
          width: 170px;
          padding: 14px 16px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
          font-weight: 800;
        }

        .trigger { left: 8%; top: 70px; }
        .condition { left: 31%; top: 158px; }
        .ai { left: 54%; top: 86px; }
        .action { left: 54%; top: 252px; }

        .line {
          position: absolute;
          height: 2px;
          background: #111827;
          opacity: 0.28;
          transform-origin: left center;
        }

        .line-one { width: 170px; left: 22%; top: 142px; transform: rotate(22deg); }
        .line-two { width: 160px; left: 45%; top: 176px; transform: rotate(-24deg); }
        .line-three { width: 160px; left: 45%; top: 218px; transform: rotate(24deg); }

        .canvas-preview aside {
          position: absolute;
          right: 7%;
          bottom: 58px;
          width: 220px;
          padding: 18px;
          display: grid;
          gap: 9px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: #111827;
          color: #ffffff;
          box-shadow: 0 18px 46px rgba(15, 23, 42, 0.18);
        }

        .canvas-preview aside span {
          color: #d1d5db;
          font-size: 14px;
        }

        .pricing,
        .templates {
          padding-top: 76px;
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 28px;
          align-items: start;
        }

        .pricing-list {
          display: grid;
          gap: 12px;
          line-height: 1.7;
        }

        .pricing-list span {
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }

        .template-cloud {
          justify-content: flex-start;
        }

        .footer {
          padding-top: 72px;
          padding-bottom: 32px;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          border-top: 1px solid #e5e7eb;
          margin-top: 72px;
          font-size: 14px;
        }

        @media (max-width: 920px) {
          .nav-wrap {
            justify-content: center;
          }

          .nav-links {
            order: 3;
            width: 100%;
            justify-content: center;
          }

          .hero {
            padding-top: 68px;
          }

          .hero h1 {
            font-size: 46px;
          }

          .quick-grid,
          .feature-grid,
          .pricing,
          .templates {
            grid-template-columns: 1fr;
          }

          .feature-card {
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 18px;
          }

          .canvas-preview {
            min-height: 500px;
          }

          .node {
            left: 24px !important;
            right: 24px;
            width: auto;
          }

          .trigger { top: 36px; }
          .condition { top: 116px; }
          .ai { top: 196px; }
          .action { top: 276px; }

          .line {
            display: none;
          }

          .canvas-preview aside {
            left: 24px;
            right: 24px;
            bottom: 28px;
            width: auto;
          }
        }

        @media (max-width: 620px) {
          .nav-actions {
            width: 100%;
            justify-content: center;
            flex-wrap: wrap;
          }

          .stars {
            display: none;
          }

          .hero h1 {
            font-size: 38px;
          }

          .hero-copy {
            font-size: 16px;
          }

          .social-proof {
            align-items: flex-start;
          }

          .section-heading h2,
          .pricing h2,
          .templates h2 {
            font-size: 32px;
          }

          .footer {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
