import { useState } from 'react'
import capflowImg from './assets/capflow.png'
import './App.css'

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false)

  const companyAuth = {
    name: "Softcapphyjas Pvt. Ltd.",
    status: "Active & Verified",
    cin: "U72900DL2026PTC000000",
    authHash: "AUTH-2026-SCPJ-CAPFLOW-098",
    domain: "capflow.com"
  }

  return (
    <div className="app-layout">
      {/* Background Lighting Elements */}
      <div className="glow-bg"></div>
      <div className="watermark-container" aria-hidden="true">
        <span className="watermark-text">CAPFLOW</span>
      </div>

      <main className="hero-section">
        {/* Isolated Animation Frame */}
        <div className="logo-wrapper">
          <div className="simulation-ring">
            <div className="ring ring-outer"></div>
            <div className="ring ring-inner"></div>
            <div className="pulse-dot"></div>
          </div>
          <img 
            src={capflow} 
            alt="Capflow Logo" 
            className="brand-logo" 
          />
        </div>

        {/* Content Section */}
        <div className="brand-header">
          <h1 className="brand-title">Capflow</h1>
          <p className="brand-subtitle">Coming Soon</p>
        </div>
      </main>

      {/* Footer Section */}
      <footer className="footer-container">
        <button 
          className="auth-badge-btn" 
          onClick={() => setShowAuthModal(true)}
          title="Click to view company verification"
        >
          <span className="auth-icon">✓</span> Verified Product of {companyAuth.name}
        </button>

        <p className="copyright">
          © {new Date().getFullYear()} {companyAuth.name} All rights reserved.
        </p>
      </footer>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="verified-badge">✓ Official Entity</span>
              <button className="close-btn" onClick={() => setShowAuthModal(false)}>✕</button>
            </div>
            
            <h3>{companyAuth.name}</h3>
            <p className="modal-subtitle">Official Product Owner & Operator</p>
            
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