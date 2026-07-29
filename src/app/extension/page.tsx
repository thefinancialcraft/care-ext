"use client";

import { useState } from "react";
import "../globals.css";
import Link from "next/link";

export default function ExtensionHomePage() {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    (
      <div className="slide-content" key="slide-1">
        <header className="stereo-header">
          <h2 className="company-name">THE FINANCIAL CRAFT</h2>
          <h1 className="product-name">FAVEO EXTENSION</h1>
        </header>

        <main className="stereo-main">
          <div className="features-box">
            <h3 className="features-title">KEY FEATURES</h3>
            <ul className="features-list">
              <li><span className="feature-icon">▶</span>TRACK PROPOSAL AND POLICIES</li>
              <li><span className="feature-icon">▶</span>AUTO LOGIN</li>
              <li><span className="feature-icon">▶</span>OTP INTEGRATION</li>
            </ul>
          </div>

          <div className="action-box">
            <a href="/install.bat" download className="download-btn">DOWNLOAD INSTALLER (BAT)</a>
            <Link href="/" className="download-btn" style={{ textAlign: "center", textDecoration: "none" }}>
              VIEW PROPOSALS DIRECTORY &rarr;
            </Link>
            <div className="version-info">
              <span className="version-badge">Version 1.1</span>
              <span className="update-time">Updated: June 28, 2026</span>
            </div>
          </div>
        </main>
      </div>
    ),
    (
      <div className="slide-content" key="slide-2">
        <header className="stereo-header">
          <h2 className="company-name">INSTALLATION</h2>
          <h1 className="product-name">INSTRUCTIONS</h1>
        </header>

        <main className="instructions-main">
          <div className="features-box">
            <h3 className="features-title">HOW TO INSTALL IN CHROME</h3>
            <ol className="instructions-list">
              <li>Open Chrome and go to: <strong>chrome://extensions/</strong></li>
              <li>Enable <strong>'Developer mode'</strong> (top-right toggle).</li>
              <li>Click <strong>'Load unpacked'</strong> button.</li>
              <li>Paste the path: <code className="code-block">%LOCALAPPDATA%\FaveoExtension</code> and click <strong>'Select Folder'</strong>.</li>
              <li>Already installed? Just click the <strong>'Reload'</strong> icon on the extension card.</li>
            </ol>
          </div>
        </main>
      </div>
    )
  ];

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "calc(100vh - 2rem)", width: "100%" }}>
      <div className="stereo-container">
        <div className="slide-viewport">
          {slides.map((slide, index) => {
            let positionClass = "active";
            if (index < activeSlide) positionClass = "up";
            if (index > activeSlide) positionClass = "down";

            return (
              <div key={index} className={`slide-item ${positionClass}`}>
                {slide}
              </div>
            );
          })}
        </div>

        <div className="slider-controls">
          <button
            className="slider-arrow"
            onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))}
            disabled={activeSlide === 0}
          >
            ▲
          </button>

          <div className="slider-indicators">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`indicator-dot ${activeSlide === index ? 'active' : ''}`}
                onClick={() => setActiveSlide(index)}
              />
            ))}
          </div>

          <button
            className="slider-arrow"
            onClick={() => setActiveSlide(prev => Math.min(slides.length - 1, prev + 1))}
            disabled={activeSlide === slides.length - 1}
          >
            ▼
          </button>
        </div>

        <footer className="stereo-footer">
          <p>&copy; 2026 The Financial Craft. All systems nominal.</p>
        </footer>
      </div>
    </div>
  );
}
