import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { io } from 'socket.io-client';
import { Toaster, toast } from 'react-hot-toast';

function App() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  
  // --- CONFIGURATION ---
  const CLOUD_NAME = "dne0docy4"; // Your Cloudinary cloud name
  const UPLOAD_PRESET = "citywatch_preset"; // Your unsigned upload preset

  // --- STATES ---
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [incidents, setIncidents] = useState([]);
  
  // FORM DATA (Added imageFile state)
  const [formData, setFormData] = useState({ 
    title: '', location: '', description: '', type: 'General', isAnonymous: false 
  });
  const [imageFile, setImageFile] = useState(null); // Stores the selected file
  
  // AUTH STATES
  const [view, setView] = useState('login'); 
  const [authData, setAuthData] = useState({ 
    username: '', email: '', password: '', resetToken: '', newPassword: '' 
  });

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

  useEffect(() => { if (token) fetchIncidents(); }, [token]);

  // --- EFFECT: Real-time Sockets ---
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
    return () => socket.disconnect();
  }, [token]);

  // --- AUTH HANDLER ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const loader = toast.loading('Processing...');
    try {
      if (view === 'login') {
        const res = await axios.post(`${API_URL}/api/auth/login`, { username: authData.username, password: authData.password });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
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
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  // --- INCIDENT SUBMIT (With Image Upload) ---
  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    const loader = toast.loading('Submitting...');

    try {
      let imageUrl = '';

      // 1. Upload Image to Cloudinary (if selected)
      if (imageFile) {
        toast.loading('Uploading photo...', { id: loader });
        const imageFormData = new FormData();
        imageFormData.append("file", imageFile);
        imageFormData.append("upload_preset", UPLOAD_PRESET);

        const cloudRes = await axios.post(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, 
          imageFormData
        );
        imageUrl = cloudRes.data.secure_url;
      }

      // 2. Submit Incident to Backend
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/incidents`, { ...formData, imageUrl }, config);
      
      toast.dismiss(loader);
      toast.success('Report submitted!');
      
      // Reset form
      setFormData({ title: '', location: '', description: '', type: 'General', isAnonymous: false });
      setImageFile(null);
      // Reset file input visually
      document.getElementById('fileInput').value = ""; 

    } catch (err) {
      toast.dismiss(loader);
      console.error(err);
      toast.error("Failed to submit report.");
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIncidents([]);
    toast.success('Logged out');
  };

  // --- RENDER AUTH (Unchanged) ---
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
            {(view === 'login' || view === 'register') && <input type="text" placeholder="Username" required value={authData.username} onChange={(e) => setAuthData({...authData, username: e.target.value})} />}
            {(view === 'register' || view === 'forgot') && <input type="email" placeholder="Email Address" required value={authData.email} onChange={(e) => setAuthData({...authData, email: e.target.value})} />}
            {(view === 'login' || view === 'register') && <input type="password" placeholder="Password" required value={authData.password} onChange={(e) => setAuthData({...authData, password: e.target.value})} />}
            {view === 'reset' && <><input type="text" placeholder="Paste Token from Email" required value={authData.resetToken} onChange={(e) => setAuthData({...authData, resetToken: e.target.value})} /><input type="password" placeholder="New Password" required value={authData.newPassword} onChange={(e) => setAuthData({...authData, newPassword: e.target.value})} /></>}
            <button type="submit">{view === 'login' ? 'Login' : view === 'register' ? 'Sign Up' : view === 'forgot' ? 'Send Recovery Email' : 'Reset Password'}</button>
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
      <header className="app-header">
        <h1>CityWatch 🇿🇲</h1>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>

      <main className="main-content">
        <section className="form-section">
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
            
            {/* FILE UPLOAD INPUT */}
            <div className="file-upload-wrapper">
              <label style={{ fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Attach Photo (Optional) 📸</label>
              <input 
                type="file" 
                id="fileInput"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0', gap: '8px' }}>
              <input type="checkbox" id="anonCheck" checked={formData.isAnonymous} onChange={(e) => setFormData({...formData, isAnonymous: e.target.checked})} style={{ width: 'auto', margin: 0 }} />
              <label htmlFor="anonCheck" style={{ fontSize: '0.9rem', color: '#555', cursor: 'pointer' }}>Post Anonymously 🕵️</label>
            </div>

            <button type="submit">Submit Report</button>
          </form>
        </section>

        <section className="feed-section">
          <h3>Recent Reports</h3>
          {incidents.length === 0 && <p className="no-data">No reports yet.</p>}
          
          {incidents.map((incident) => {
            const isHidden = incident.isAnonymous;
            const displayName = isHidden ? "Anonymous Citizen" : `@${incident.user}`;
            const dateString = incident.date || incident.createdAt;
            const formattedDate = dateString ? new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            const statusColor = incident.status === 'Resolved' ? '#10b981' : incident.status === 'In Progress' ? '#f59e0b' : '#ef4444';

            return (
              <div key={incident._id} className="card" style={{ borderLeft: `5px solid ${statusColor}` }}>
                {/* DISPLAY IMAGE IF EXISTS */}
                {incident.imageUrl && (
                  <div className="card-image">
                    <img src={incident.imageUrl} alt="Incident" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px 8px 0 0' }} />
                  </div>
                )}
                
                <div className="card-header">
                  <div><h4>{incident.title}</h4><span className="type-badge">{incident.type}</span></div>
                  <span className="status-badge" style={{ backgroundColor: statusColor }}>{incident.status || 'Open'}</span>
                </div>
                <p className="location">📍 {incident.location}</p>
                <p className="description">{incident.description}</p>
                
                <div className="card-footer">
                  <span style={{ fontStyle: isHidden ? 'italic' : 'normal', fontWeight: isHidden ? '400' : '600' }}>👤 {displayName}</span>
                  <span>🕒 {formattedDate}</span>
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