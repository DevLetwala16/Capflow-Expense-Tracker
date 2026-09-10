import { useState } from 'react'
import capflowImg from './assets/capflow-logo.png'
import './App.css'

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const companyAuth = {
    name: "Softcapphyjas Pvt. Ltd.",
    status: "Active & Verified",
    cin: "U72900DL2026PTC000000",
    authHash: "AUTH-2026-SCPJ-CAPFLOW-098",
    domain: "capflow.com"
  }

  const features = [
    { icon: "💰", title: "Track Expenses", desc: "Log every transaction in under 3 taps" },
    { icon: "📊", title: "Smart Analytics", desc: "Charts & insights auto-generated from your data" },
    { icon: "🎯", title: "Budget Goals", desc: "Set limits per category with real-time alerts" },
    { icon: "📅", title: "EMI Manager", desc: "Never miss a payment with proactive reminders" },
    { icon: "🔒", title: "100% Private", desc: "All data stays on your device — zero cloud storage" },
    { icon: "📱", title: "Works Offline", desc: "Fully functional without an internet connection" },
  ]

  return (
    <div className="app-root">

      {/* ─── DESKTOP LAYOUT (≥768px) ─────────────────────── */}
      <div className="desktop-layout">

        {/* Top Navigation Bar */}
        <header className="desktop-navbar">
          <div className="navbar-inner">
            <a href="/" className="navbar-brand">
              <img src={capflowImg} alt="CapFlow" className="navbar-logo" />
              <span className="navbar-brand-name">CapFlow</span>
            </a>
            <nav className="navbar-links">
              <a href="#features">Features</a>
              <a href="#about">About</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setShowAuthModal(true) }}>Company</a>
            </nav>
            <div className="navbar-actions">
              <button className="btn-outline" onClick={() => setShowAuthModal(true)}>Verified Product</button>
              <button className="btn-primary">Get Started →</button>
            </div>
          </div>
        </header>

        {/* Desktop Hero — Two Column */}
        <main className="desktop-hero">
          <div className="glow-bg" />

          {/* Left Column: Text Content */}
          <div className="hero-text-col">
            <span className="coming-soon-chip">🚀 Coming Soon</span>
            <h1 className="hero-headline">
              Your money,<br />
              <span className="headline-accent">fully under control.</span>
            </h1>
            <p className="hero-desc">
              CapFlow is a mobile-first expense tracker that keeps all your financial
              data private — on your device, always. Track spending, set budgets,
              manage EMIs and savings goals — with zero cloud storage of your transactions.
            </p>
            <div className="hero-cta-row">
              <button className="btn-primary btn-lg">Join the Waitlist</button>
              <button className="btn-ghost btn-lg" onClick={() => setShowAuthModal(true)}>
                View Company ↗
              </button>
            </div>
            <div className="hero-trust-row">
              <span className="trust-badge">🔒 Data stays on your device</span>
              <span className="trust-badge">✓ Verified Product</span>
              <span className="trust-badge">📴 Works Offline</span>
            </div>
          </div>

          {/* Right Column: Animated Logo */}
          <div className="hero-logo-col">
            <div className="logo-wrapper">
              <div className="simulation-ring">
                <div className="ring ring-outer" />
                <div className="ring ring-inner" />
                <div className="pulse-dot" />
              </div>
              <img src={capflowImg} alt="CapFlow App" className="brand-logo" />
            </div>
          </div>
        </main>

        {/* Desktop Features Grid */}
        <section className="desktop-features" id="features">
          <h2 className="section-title">Everything you need, nothing you don't.</h2>
          <p className="section-sub">Built for people who want to understand their money — without giving it away to a server.</p>
          <div className="features-grid">
            {features.map((f) => (
              <div className="feature-card" key={f.title}>
                <span className="feature-icon">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Desktop Footer */}
        <footer className="desktop-footer" id="about">
          <div className="footer-inner">
            <div className="footer-brand">
              <img src={capflowImg} alt="CapFlow" className="footer-logo" />
              <span className="footer-brand-name">CapFlow</span>
            </div>
            <p className="footer-tagline">Smart expense tracking. Zero compromise on privacy.</p>
            <button className="auth-badge-btn" onClick={() => setShowAuthModal(true)}>
              <span className="auth-icon">✓</span> Verified Product of {companyAuth.name}
            </button>
            <p className="copyright">© {new Date().getFullYear()} {companyAuth.name} All rights reserved.</p>
          </div>
        </footer>
      </div>

      {/* ─── MOBILE LAYOUT (<768px) ──────────────────────── */}
      <div className="mobile-layout">
        <div className="glow-bg" />
        <div className="watermark-container" aria-hidden="true">
          <span className="watermark-text">CAPFLOW</span>
        </div>

        {/* Mobile Top Bar */}
        <header className="mobile-topbar">
          <div className="mobile-brand">
            <img src={capflowImg} alt="CapFlow" className="mobile-topbar-logo" />
            <span className="mobile-brand-name">CapFlow</span>
          </div>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </header>

        {/* Mobile Slide-down Menu */}
        {mobileMenuOpen && (
          <div className="mobile-menu-dropdown">
            <a href="#" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#" onClick={() => setMobileMenuOpen(false)}>About</a>
            <a href="#" onClick={() => { setMobileMenuOpen(false); setShowAuthModal(true) }}>Company Info</a>
          </div>
        )}

        {/* Mobile Hero — Centered Splash */}
        <main className="mobile-hero">
          <div className="logo-wrapper">
            <div className="simulation-ring">
              <div className="ring ring-outer" />
              <div className="ring ring-inner" />
              <div className="pulse-dot" />
            </div>
            <img src={capflowImg} alt="CapFlow" className="brand-logo" />
          </div>

          <div className="mobile-hero-text">
            <h1 className="brand-title">CapFlow</h1>
            <p className="brand-subtitle">Coming Soon</p>
            <p className="mobile-hero-desc">
              Smart expense tracking — 100% private, works offline.
            </p>
          </div>

          {/* Mobile Features — Horizontal Scroll Chips */}
          <div className="mobile-feature-chips">
            {features.map((f) => (
              <span className="chip" key={f.title}>
                {f.icon} {f.title}
              </span>
            ))}
          </div>
        </main>

        {/* Mobile Footer */}
        <footer className="mobile-footer">
          <button className="auth-badge-btn" onClick={() => setShowAuthModal(true)}>
            <span className="auth-icon">✓</span> Verified — {companyAuth.name}
          </button>
          <p className="copyright">© {new Date().getFullYear()} {companyAuth.name}</p>
        </footer>

        {/* Mobile Bottom Nav bar (matches implementation plan) */}
        <nav className="mobile-bottom-nav" aria-label="Main navigation">
          <a href="#" className="bottom-nav-item active" aria-label="Home">
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </a>
          <a href="#" className="bottom-nav-item" aria-label="Analytics">
            <span className="nav-icon">📊</span>
            <span className="nav-label">Analytics</span>
          </a>
          <a href="#" className="bottom-nav-item" aria-label="Budgets">
            <span className="nav-icon">🎯</span>
            <span className="nav-label">Budgets</span>
          </a>
          <a href="#" className="bottom-nav-item" aria-label="EMI">
            <span className="nav-icon">📅</span>
            <span className="nav-label">EMI</span>
          </a>
          <a href="#" className="bottom-nav-item" aria-label="Settings">
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Settings</span>
          </a>
        </nav>
      </div>

      {/* ─── SHARED: Company Auth Modal ──────────────────── */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="verified-badge">✓ Official Entity</span>
              <button className="close-btn" onClick={() => setShowAuthModal(false)}>✕</button>
            </div>
            <div className="modal-logo-row">
              <img src={capflowImg} alt="CapFlow" className="modal-logo" />
              <div>
                <h3>{companyAuth.name}</h3>
                <p className="modal-subtitle">Official Product Owner & Operator</p>
              </div>
            </div>
            <div className="auth-details">
              <div className="detail-row">
                <span>Status:</span>
                <strong className="status-active">{companyAuth.status}</strong>
              </div>
              <div className="detail-row">
                <span>Registration Hash:</span>
                <code>{companyAuth.authHash}</code>
              </div>
              <div className="detail-row">
                <span>Corporate ID:</span>
                <code>{companyAuth.cin}</code>
              </div>
              <div className="detail-row">
                <span>Domain:</span>
                <code>{companyAuth.domain}</code>
              </div>
            </div>
            <button className="close-modal-btn" onClick={() => setShowAuthModal(false)}>
              Close Verification
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App