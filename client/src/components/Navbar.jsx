import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

function Navbar({ theme, setTheme, setToken }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    setIsMenuOpen(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    toast.success('Logged out');
  };

  return (
    <header className="app-header">
      <h1>CityWatch 🇿🇲</h1>
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="menu-btn" aria-label="Menu">☰</button>
        {isMenuOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-item" onClick={() => handleThemeChange('light')}>{theme === 'light' ? '●' : '○'} Light Mode ☀️</div>
            <div className="dropdown-item" onClick={() => handleThemeChange('dark')}>{theme === 'dark' ? '●' : '○'} Dark Mode 🌙</div>
            <div className="dropdown-item" onClick={() => handleThemeChange('system')}>{theme === 'system' ? '●' : '○'} System Auto 💻</div>
            <div className="dropdown-divider"></div>
            <div className="dropdown-item" onClick={logout} style={{ color: '#ef4444', fontWeight: 'bold' }}>🚪 Logout</div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;