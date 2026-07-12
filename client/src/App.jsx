import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { usePostHog } from 'posthog-js/react';
import { Analytics } from '@vercel/analytics/react';
import Auth from './pages/Auth';
import Feed from './pages/Feed';
import './App.css';

function App() {
  const posthog = usePostHog();
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system'); 
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState({ id: null, username: null, role: 'user', city: null });

  // --- HELPERS ---
  const parseJwt = (token) => {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
  };

  // --- THEME LOGIC ---
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (selectedTheme) => {
      if (selectedTheme === 'system') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.setAttribute('data-theme', systemDark ? 'dark' : 'light');
      } else {
        root.setAttribute('data-theme', selectedTheme);
      }
    };
    applyTheme(theme);
    localStorage.setItem('theme', theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => { if (theme === 'system') applyTheme('system'); };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // --- AUTH INITIALIZATION ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    if (urlToken) {
      localStorage.setItem('token', urlToken);
      setToken(urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
      toast.success("Logged in with Google!");
    }

    const storedToken = urlToken || token; 
    
    if (storedToken) {
      const decoded = parseJwt(storedToken);
      if (decoded) {
        setCurrentUser({ 
          id: decoded.id, 
          username: decoded.username, 
          role: decoded.role || 'user',
          city: decoded.city || 'Lusaka' 
        });
        
        if (decoded.id) {
            posthog.identify(decoded.id, { username: decoded.username });
        }
      }
    }
  }, [token, posthog]); 

  return (
    <Router>
      <Toaster position="top-right" />
      <Analytics />
      <Routes>
        <Route 
          path="/login" 
          element={!token ? <Auth setToken={setToken} parseJwt={parseJwt} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={token ? <Feed token={token} setToken={setToken} currentUser={currentUser} theme={theme} setTheme={setTheme} /> : <Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;