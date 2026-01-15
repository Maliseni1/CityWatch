import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { io } from 'socket.io-client';
import { Toaster, toast } from 'react-hot-toast';

function App() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [token, setToken] = useState(localStorage.getItem('token'));
  const [incidents, setIncidents] = useState([]);
  const [formData, setFormData] = useState({ title: '', location: '', description: '', type: 'General' });
  
  // Auth States
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authData, setAuthData] = useState({ username: '', password: '' });

  // --- ACTION: Fetch Incidents ---
  const fetchIncidents = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/incidents`);
      setIncidents(res.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load incidents");
    }
  };

  // --- EFFECT: Load Data on Login ---
  useEffect(() => {
    if (token) fetchIncidents();
  }, [token]);

  // --- EFFECT: Real-time Sockets ---
  useEffect(() => {
    const socket = io(API_URL);
    socket.on('new_incident', (newIncident) => {
      setIncidents((prev) => {
        if (prev.find(i => i._id === newIncident._id)) return prev;
        toast.success(`New report: ${newIncident.title}`); // Real-time popup!
        return [newIncident, ...prev];
      });
    });
    return () => socket.disconnect();
  }, []);

  // --- ACTION: Auth Handler ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLoginMode ? 'login' : 'register';
    const loader = toast.loading(isLoginMode ? 'Logging in...' : 'Registering...'); // Loading spinner

    try {
      const res = await axios.post(`${API_URL}/api/auth/${endpoint}`, authData);
      
      toast.dismiss(loader); // Remove spinner

      if (isLoginMode) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        toast.success('Welcome to CityWatch! 🇿🇲');
      } else {
        setIsLoginMode(true);
        toast.success('Registration successful! Please login.');
        setAuthData({ username: '', password: '' });
      }
    } catch (err) {
      toast.dismiss(loader);
      toast.error(err.response?.data?.message || 'Authentication failed');
    }
  };

  // --- ACTION: Submit Incident ---
  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    const loader = toast.loading('Submitting report...');
    
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/incidents`, formData, config);
      
      toast.dismiss(loader);
      toast.success('Report submitted successfully!');
      setFormData({ title: '', location: '', description: '', type: 'General' });
    } catch (err) {
      toast.dismiss(loader);
      console.error("Error posting data:", err);
      toast.error("Failed to submit report. Try again.");
    }
  };

  // --- ACTION: Logout ---
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIncidents([]);
    toast.success('Logged out successfully');
  };

  // --- RENDER: Login Screen ---
  if (!token) {
    return (
      <div className="auth-container">
        <Toaster position="top-center" />
        <div className="auth-box">
          <h1>CityWatch 🏙️</h1>
          <p className="subtitle">Lusaka's Citizen Reporting Tool</p>
          
          <form onSubmit={handleAuthSubmit}>
            <input 
              type="text" 
              placeholder="Username" 
              value={authData.username} 
              onChange={(e) => setAuthData({...authData, username: e.target.value})}
              required
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={authData.password} 
              onChange={(e) => setAuthData({...authData, password: e.target.value})}
              required
            />
            <button type="submit">{isLoginMode ? 'Login' : 'Register'}</button>
          </form>
          
          <p className="toggle-link" onClick={() => setIsLoginMode(!isLoginMode)}>
             {isLoginMode ? "New here? Create an account" : "Already have an account? Login"}
          </p>
        </div>
      </div>
    );
  }

  // --- RENDER: Main App ---
  return (
    <div className="app-container">
      <Toaster position="top-right" />
      
      <header className="app-header">
        <h1>CityWatch 🇿🇲</h1>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>

      <main className="main-content">
        {/* REPORT FORM */}
        <section className="form-section">
          <h3>📢 Report an Incident</h3>
          <form onSubmit={handleIncidentSubmit}>
            <div className="input-group">
              <input 
                placeholder="Title (e.g. Uncollected Garbage)" 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})} 
                required 
              />
              <select 
                value={formData.type} 
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="General">General</option>
                <option value="Sanitation">Sanitation 🗑️</option>
                <option value="Infrastructure">Infrastructure 🚧</option>
                <option value="Traffic">Traffic 🚦</option>
                <option value="Water">Water Supply 💧</option>
              </select>
            </div>
            <input 
              placeholder="Location (e.g. Kabwata Market)" 
              value={formData.location} 
              onChange={(e) => setFormData({...formData, location: e.target.value})} 
              required 
            />
            <textarea 
              placeholder="Describe the issue..." 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              rows="3"
              required 
            />
            <button type="submit">Submit Report</button>
          </form>
        </section>

        {/* INCIDENT FEED */}
        <section className="feed-section">
          <h3>Recent Reports</h3>
          {incidents.length === 0 ? <p className="no-data">No reports yet. Be the first!</p> : null}
          
          {incidents.map((incident) => {
            const dateString = incident.date || incident.createdAt;
            const formattedDate = dateString 
              ? new Date(dateString).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })
              : 'Date unknown';

            const statusColor = incident.status === 'Resolved' ? '#10b981' : 
                                incident.status === 'In Progress' ? '#f59e0b' : '#ef4444';

            return (
              <div key={incident._id} className="card" style={{ borderLeft: `5px solid ${statusColor}` }}>
                <div className="card-header">
                  <div>
                    <h4>{incident.title}</h4>
                    <span className="type-badge">{incident.type || 'General'}</span>
                  </div>
                  <span className="status-badge" style={{ backgroundColor: statusColor }}>
                    {incident.status || 'Open'}
                  </span>
                </div>
                
                <p className="location">📍 {incident.location}</p>
                <p className="description">{incident.description}</p>
                
                <div className="card-footer">
                  <span className="user">👤 @{incident.user || 'Anonymous'}</span>
                  <span className="date">🕒 {formattedDate}</span>
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