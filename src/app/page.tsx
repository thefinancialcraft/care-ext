import "./globals.css";

export default function Home() {
  return (
    <div className="stereo-container">
      <header className="stereo-header">
        <h2 className="company-name">THE FINANCIAL CRAFT</h2>
        <h1 className="product-name">FAVEO EXTENSION</h1>
      </header>

      <main className="stereo-main">
        <div className="features-box">
          <h3 className="features-title">KEY FEATURES</h3>
          <ul className="features-list">
            <li>
              <span className="feature-icon">▶</span>
              TRACK PROPOSAL AND POLICIES
            </li>
            <li>
              <span className="feature-icon">▶</span>
              AUTO LOGIN
            </li>
            <li>
              <span className="feature-icon">▶</span>
              OTP INTEGRATION
            </li>
          </ul>
        </div>

        <div className="action-box">
          <a href="/install.bat" download className="download-btn">
            DOWNLOAD INSTALLER (BAT)
          </a>
          <div className="version-info">
            <span className="version-badge">Version 1.1</span>
            <span className="update-time">Updated: June 28, 2026</span>
          </div>
        </div>
      </main>

      <footer className="stereo-footer">
        <p>&copy; 2026 The Financial Craft. All systems nominal.</p>
      </footer>
    </div>
  );
}
