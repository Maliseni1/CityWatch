import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import { io } from 'socket.io-client';
import { Toaster, toast } from 'react-hot-toast';
import { usePostHog } from 'posthog-js/react'; 

function App() {
  // --- STATES ---
  const [showPassword, setShowPassword] = useState(false); // Toggle for password visibility
  const posthog = usePostHog();
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const CLOUD_NAME = "dne0docy4"; 
  const UPLOAD_PRESET = "citywatch_preset"; 

  // --- HELPERS ---
  const parseJwt = (token) => {
    try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; }
  };

  const [showForm, setShowForm] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); 
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system'); 

  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState({ id: null, username: null, role: 'user' });
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState('All'); 

  const [formData, setFormData] = useState({ 
    title: '', location: '', description: '', type: 'General', isAnonymous: false 
  });
  const [imageFile, setImageFile] = useState(null); 
  
  const [view, setView] = useState('login'); 
  const [authData, setAuthData] = useState({ 
    username: '', email: '', password: '', resetToken: '', newPassword: '' 
  });

  const menuRef = useRef(null); 

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

  // --- CLOSE MENU ON CLICK OUTSIDE ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  // --- INITIALIZATION ---
  useEffect(() => {
    // 1. Check URL for Google Token
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');

    if (urlToken) {
      localStorage.setItem('token', urlToken);
      setToken(urlToken);
      // Remove token from URL for cleaner look
      window.history.replaceState({}, document.title, window.location.pathname);
      toast.success("Logged in with Google!");
    }

    // 2. Check LocalStorage (Standard check)
    const storedToken = urlToken || token; // Use new token if available
    
    if (storedToken) {
      const decoded = parseJwt(storedToken);
      if (decoded) {
        setCurrentUser({ 
          id: decoded.id, 
          username: decoded.username, 
          role: decoded.role || 'user' 
        });
        
        // PostHog Identification for Google Users
        if (decoded.id) {
            posthog.identify(decoded.id, { username: decoded.username });
        }
      }
      fetchIncidents();
    }
  }, [token]); // Run when 'token' state changes

  
  // --- ACTION: Fetch Incidents ---
  const fetchIncidents = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/incidents`);
      setIncidents(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load incidents");
    } finally {
      setIsLoading(false);
    }
  };

  // --- REAL-TIME SOCKETS ---
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL);
    
    socket.on('new_incident', (newIncident) => {
      setIncidents((prev) => {
        if (prev.find(i => i._id === newIncident._id)) return prev;
        toast.success(`New report: ${newIncident.title}`);
        return [newIncident, ...prev];
      });
    });

    socket.on('update_incident', (updatedIncident) => {
      setIncidents((prev) => prev.map(inc => 
        inc._id === updatedIncident._id ? updatedIncident : inc
      ));
    });

    return () => socket.disconnect();
  }, [token]);

  // --- HANDLERS ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const loader = toast.loading('Processing...');
    try {
      if (view === 'login') {
        const res = await axios.post(`${API_URL}/api/auth/login`, { username: authData.username, password: authData.password });
        
        const receivedToken = res.data.token;
        localStorage.setItem('token', receivedToken);
        setToken(receivedToken);
        
        // PostHog Identify
        const decodedUser = parseJwt(receivedToken);
        if (decodedUser?.id) {
          posthog.identify(decodedUser.id, {
            username: decodedUser.username,
            email: decodedUser.email 
          });
          posthog.capture('user_login');
        }

        toast.success('Welcome back!');
      } else if (view === 'register') {
        await axios.post(`${API_URL}/api/auth/register`, { username: authData.username, email: authData.email, password: authData.password });
        toast.success('Account created! Please login.');
        setView('login');
      } else if (view === 'forgot') {
        await axios.post(`${API_URL}/api/auth/forgot-password`, { email: authData.email });
        toast.success('Token sent to email!');
        setView('reset');
      } else if (view === 'reset') {
        await axios.post(`${API_URL}/api/auth/reset-password`, { token: authData.resetToken, newPassword: authData.newPassword });
        toast.success('Password changed! Please login.');
        setView('login');
      }
      toast.dismiss(loader);
    } catch (err) {
      toast.dismiss(loader);
      console.error(err);
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    const loader = toast.loading('Submitting...');
    try {
      let imageUrl = '';
      if (imageFile) {
        toast.loading('Uploading photo...', { id: loader });
        const imageFormData = new FormData();
        imageFormData.append("file", imageFile);
        imageFormData.append("upload_preset", UPLOAD_PRESET);
        const cloudRes = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, imageFormData);
        imageUrl = cloudRes.data.secure_url;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/incidents`, { ...formData, imageUrl }, config);
      
      posthog.capture('incident_reported', {
        category: formData.type,
        location: formData.location,
        has_image: !!imageFile,
        is_anonymous: formData.isAnonymous
      });

      toast.dismiss(loader);
      toast.success('Report submitted!');
      setFormData({ title: '', location: '', description: '', type: 'General', isAnonymous: false });
      setImageFile(null);
      document.getElementById('fileInput').value = ""; 
      setShowForm(false); 
    } catch (err) {
      toast.dismiss(loader);
      toast.error("Failed to submit report.");
    }
  };

  const handleUpvote = async (id) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_URL}/api/incidents/${id}/upvote`, {}, config);
      posthog.capture('incident_upvoted', { incident_id: id });
    } catch (err) {
      toast.error("Could not vote");
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_URL}/api/incidents/${id}`, { status: newStatus }, config);
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIncidents([]);
    toast.success('Logged out');
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    setIsMenuOpen(false); 
  };

  // --- FILTER LOGIC ---
  const filteredIncidents = filterType === 'All' 
    ? incidents 
    : incidents.filter(inc => inc.type === filterType);

  // --- RENDER AUTH ---
  if (!token) {
    return (
      <div className="auth-container">
        <Toaster position="top-center" />
        <div className="auth-box">
          <h1>CityWatch 🇿🇲</h1>
          <p className="subtitle">
            {view === 'login' && 'Login to your account'}
            {view === 'register' && 'Create a new account'}
            {view === 'forgot' && 'Recover your account'}
            {view === 'reset' && 'Set a new password'}
          </p>
          <form onSubmit={handleAuthSubmit}>
            {(view === 'login' || view === 'register') && (
              <input type="text" placeholder="Username" required value={authData.username} onChange={(e) => setAuthData({...authData, username: e.target.value})} />
            )}
            
            {(view === 'register' || view === 'forgot') && (
              <input type="email" placeholder="Email Address" required value={authData.email} onChange={(e) => setAuthData({...authData, email: e.target.value})} />
            )}
            
            {(view === 'login' || view === 'register') && (
              <div className="password-wrapper">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password" 
                  required 
                  value={authData.password} 
                  onChange={(e) => setAuthData({...authData, password: e.target.value})} 
                />
                <button 
                  type="button" 
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            )}

            {view === 'reset' && (
              <>
                <input type="text" placeholder="Paste Token from Email" required value={authData.resetToken} onChange={(e) => setAuthData({...authData, resetToken: e.target.value})} />
                <div className="password-wrapper">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="New Password" 
                    required 
                    value={authData.newPassword} 
                    onChange={(e) => setAuthData({...authData, newPassword: e.target.value})} 
                  />
                  <button 
                    type="button" 
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </>
            )}

            <button type="submit" style={{ marginTop: '10px' }}>
              {view === 'login' ? 'Login' : view === 'register' ? 'Sign Up' : view === 'forgot' ? 'Send Recovery Email' : 'Reset Password'}
            </button>

            {/* GOOGLE LOGIN BUTTON */}
            {view === 'login' && (
              <button 
                type="button" 
                className="google-btn"
                onClick={() => window.location.href = `${API_URL}/api/auth/google`} 
              >
                <img src="https://img.icons8.com/color/16/000000/google-logo.png" alt="G" />
                Sign in with Google
              </button>
            )}

          </form>
          <div style={{marginTop: '15px', fontSize: '0.9rem'}}>
            {view === 'login' && <><p className="toggle-link" onClick={() => setView('register')}>Create an account</p><p className="toggle-link" onClick={() => setView('forgot')}>Forgot Password?</p></>}
            {view !== 'login' && <p className="toggle-link" onClick={() => setView('login')}>Back to Login</p>}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN APP ---
  return (
    <div className="app-container">
      <Toaster position="top-right" />
      
      {/* HEADER WITH HAMBURGER MENU */}
      <header className="app-header">
        <h1>CityWatch 🇿🇲</h1>
        
        {/* Menu Container */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className="menu-btn"
            aria-label="Menu"
          >
            ☰
          </button>

          {/* Dropdown Content */}
          {isMenuOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-item" onClick={() => handleThemeChange('light')}>
                {theme === 'light' ? '●' : '○'} Light Mode ☀️
              </div>
              <div className="dropdown-item" onClick={() => handleThemeChange('dark')}>
                {theme === 'dark' ? '●' : '○'} Dark Mode 🌙
              </div>
              <div className="dropdown-item" onClick={() => handleThemeChange('system')}>
                {theme === 'system' ? '●' : '○'} System Auto 💻
              </div>
              
              <div className="dropdown-divider"></div>
              
              <div className="dropdown-item" onClick={logout} style={{ color: '#ef4444', fontWeight: 'bold' }}>
                🚪 Logout
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="main-content">
        
        {/* TOGGLE BUTTON */}
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={() => setShowForm(!showForm)}
            style={{ 
              width: 'auto', 
              background: showForm ? '#ef4444' : '#2563eb', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '10px 20px'
            }}
          >
            {showForm ? '✖ Close Form' : '➕ Report Incident'}
          </button>
        </div>

        {/* FORM SECTION */}
        {showForm && (
          <section className="form-section" style={{ animation: 'fadeIn 0.3s ease' }}>
            <h3>📢 Report an Incident</h3>
            <form onSubmit={handleIncidentSubmit}>
              <div className="input-group">
                <input placeholder="Title" value={formData.title} required onChange={(e) => setFormData({...formData, title: e.target.value})} />
                <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                  <option value="General">General</option>
                  <option value="Sanitation">Sanitation 🗑️</option>
                  <option value="Infrastructure">Infrastructure 🚧</option>
                  <option value="Traffic">Traffic 🚦</option>
                  <option value="Water">Water Supply 💧</option>
                </select>
              </div>
              <input placeholder="Location" value={formData.location} required onChange={(e) => setFormData({...formData, location: e.target.value})} />
              <textarea placeholder="Description..." value={formData.description} required rows="3" onChange={(e) => setFormData({...formData, description: e.target.value})} />
              
              <div className="file-upload-wrapper">
                <label style={{ fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Attach Photo (Optional) 📸</label>
                <input type="file" id="fileInput" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0', gap: '8px' }}>
                <input type="checkbox" id="anonCheck" checked={formData.isAnonymous} onChange={(e) => setFormData({...formData, isAnonymous: e.target.checked})} style={{ width: 'auto', margin: 0 }} />
                <label htmlFor="anonCheck" style={{ fontSize: '0.9rem', color: 'var(--text-main)', cursor: 'pointer' }}>Post Anonymously 🕵️</label>
              </div>

              <button type="submit">Submit Report</button>
            </form>
          </section>
        )}

        {/* FEED SECTION */}
        <section className="feed-section">
          <div className="feed-header">
            <h3>Community Reports</h3>
            <div className="filter-bar">
              {['All', 'Sanitation', 'Infrastructure', 'Traffic', 'Water'].map(type => (
                <button 
                  key={type} 
                  onClick={() => setFilterType(type)}
                  className={`filter-btn ${filterType === type ? 'active' : ''}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {isLoading && (
            <div className="loader-container">
              <img src="/logo.png" alt="Loading..." className="g-loader" />
            </div>
          )}
          {!isLoading && filteredIncidents.length === 0 && <p className="no-data">No reports found.</p>}
          
          {filteredIncidents.map((incident) => {
            const isHidden = incident.isAnonymous;
            const displayName = isHidden ? "Anonymous Citizen" : `@${incident.user}`;
            const dateString = incident.date || incident.createdAt;
            const formattedDate = dateString ? new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
            const statusColor = incident.status === 'Resolved' ? '#10b981' : incident.status === 'In Progress' ? '#f59e0b' : '#ef4444';
            
            const votes = incident.upvotes || [];
            const hasUpvoted = votes.includes(currentUser.id);
            const canEditStatus = (currentUser.username === incident.user) || (currentUser.role === 'admin');

            return (
              <div key={incident._id} className="card" style={{ borderLeft: `5px solid ${statusColor}` }}>
                {incident.imageUrl && (
                  <div className="card-image">
                    <img src={incident.imageUrl} alt="Incident" />
                  </div>
                )}
                
                <div className="card-header">
                  <div>
                    <h4>{incident.title}</h4>
                    <span className="type-badge">{incident.type}</span>
                  </div>
                  
                  {canEditStatus ? (
                    <div className="status-container">
                      <select 
                        className="status-select"
                        value={incident.status || 'Open'} 
                        onChange={(e) => handleStatusChange(incident._id, e.target.value)}
                        style={{ borderColor: statusColor, color: statusColor }}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  ) : (
                    <span 
                      className="status-badge-readonly" 
                      style={{ 
                        backgroundColor: statusColor, 
                        color: '#ffffff', 
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}
                    >
                      {incident.status || 'Open'}
                    </span>
                  )}
                </div>

                <p className="location">📍 {incident.location}</p>
                <p className="description">{incident.description}</p>
                
                <div className="card-footer">
                  <div className="user-info">
                    <span style={{ fontStyle: isHidden ? 'italic' : 'normal', fontWeight: isHidden ? '400' : '600' }}>
                      👤 {displayName}
                    </span>
                    
                    <button 
                      onClick={() => handleUpvote(incident._id)}
                      className={`upvote-btn ${hasUpvoted ? 'voted' : ''}`}
                      title="Verify this report"
                    >
                      👍 Verify 
                      {votes.length > 0 && <span style={{ fontWeight: 'bold', marginLeft:'2px' }}>{votes.length}</span>}
                    </button>
                  </div>
                  
                  <span className="timestamp">🕒 {formattedDate}</span>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

export default App;