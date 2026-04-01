import React from 'react';
import { Link } from 'react-router-dom';
import { FiUpload, FiVideo } from 'react-icons/fi';
import './Header.css';

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <h1>🎬 Video Manager</h1>
          <p>ENNIE Marketing - Video Upload & Transcription</p>
        </div>

        <nav className="header-nav">
          <Link to="/" className="nav-link">
            <FiVideo /> Dashboard
          </Link>
          <Link to="/upload" className="nav-link primary">
            <FiUpload /> Upload Video
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
