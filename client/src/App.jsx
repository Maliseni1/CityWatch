import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { io } from 'socket.io-client';

function App() {
  // 1. DYNAMIC URL: Uses Vercel's env variable if available, otherwise Localhost
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [token, setToken] = useState(localStorage.getItem('token'));
  const [incidents, setIncidents] = useState([]);
  // Added 'type' to form data so users can categorize reports
  const [formData, setFormData] = useState({ title: '', location: '', description: '', type: 'General' });
  
  // Auth States
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authData, setAuthData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  // --- ACTION: Fetch Incidents ---
  const fetchIncidents = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/incidents`);
      setIncidents(res.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  // --- EFFECT 1: Load Initial Data when Logged In ---
  useEffect(() => {
    if (token) {
      fetchIncidents();
    }
  }, [token]);

  // --- EFFECT 2: Setup Real-time Sockets ---
  useEffect(() => {
    const socket = io(API_URL);

    // Listen for 'new_incident' event
    socket.on('new_incident', (newIncident) => {
      setIncidents((prevIncidents) => {
        // Prevent duplicates
        if (prevIncidents.find(i => i._id === newIncident._id)) return prevIncidents;
        return [newIncident, ...prevIncidents];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // --- ACTION: Handle Auth (Login/Register) ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLoginMode ? 'login' : 'register';
    
    try {
      const res = await axios.post(`${API_URL}/api/auth/${endpoint}`, authData);
      
      if (isLoginMode) {
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
      } else {
        setIsLoginMode(true);
        setError('Registration successful! Please login.');
        setAuthData({ username: '', password: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    }
  };

  // --- ACTION: Create Incident ---
  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    try {
      // We pass the token in headers if your backend requires it (good practice)
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.post(`${API_URL}/api/incidents`, formData, config);
      
      setFormData({ title: '', location: '', description: '', type: 'General' });
    } catch (err) {
      console.error("Error posting data:", err);
    }
  };

  // --- ACTION: Logout ---
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIncidents([]);
  };

  // --- RENDER ---
  if (!token) {
    return (
      <div className="container" style={{ maxWidth: '400px', marginTop: '50px' }}>
        <h1 style={{textAlign: 'center'}}>CityWatch 🔐</h1>
        <h3 style={{textAlign: 'center'}}>{isLoginMode ? 'Login' : 'Register'}</h3>
        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
        <form onSubmit={handleAuthSubmit} className="form-box">
          <input 
            type="text" 
            placeholder="Username" 
            value={authData.username} 
            onChange={(e) => setAuthData({...authData, username: e.target.value})}
            required
            style={{width: '100%', marginBottom: '10px', padding: '10px'}}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={authData.password} 
            onChange={(e) => setAuthData({...authData, password: e.target.value})}
            required
            style={{width: '100%', marginBottom: '10px', padding: '10px'}}
          />
          <button type="submit" style={{width: '100%'}}>{isLoginMode ? 'Login' : 'Register'}</button>
        </form>
        <p style={{ marginTop: '1rem', cursor: 'pointer', color: '#007BFF', textAlign: 'center' }} 
           onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}>
           {isLoginMode ? "Don't have an account? Register" : "Already have an account? Login"}
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>CityWatch 🏙️</h1>
        <button onClick={logout} style={{ width: 'auto', background: '#dc3545', padding: '8px 16px' }}>Logout</button>
      </div>

      <div className="form-box" style={{ marginBottom: '30px' }}>
        <h3>Report an Incident</h3>
        <form onSubmit={handleIncidentSubmit}>
          <input 
            placeholder="Title (e.g., Broken Pipe)" 
            value={formData.title} 
            onChange={(e) => setFormData({...formData, title: e.target.value})} 
            required 
          />
          <input 
            placeholder="Location (e.g., Cairo Road)" 
            value={formData.location} 
            onChange={(e) => setFormData({...formData, location: e.target.value})} 
            required 
          />
          {/* Added Type Selector */}
          <select 
            value={formData.type} 
            onChange={(e) => setFormData({...formData, type: e.target.value})}
            style={{ width: '100%', padding: '10px', margin: '8px 0', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="General">General</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="Traffic">Traffic</option>
            <option value="Water">Water Supply</option>
          </select>
          <textarea 
            placeholder="Description..." 
            value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})} 
            rows="3"
            required 
          />
          <button type="submit">Submit Report</button>
        </form>
      </div>

      <h3>Recent Reports</h3>
      
      {incidents.map((incident) => {
        // --- DATE FORMATTING LOGIC START ---
        const dateString = incident.date || incident.createdAt;
        const formattedDate = dateString 
          ? new Date(dateString).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })
          : 'Date unknown';
        // --- DATE FORMATTING LOGIC END ---

        // Determine Status Color
        const statusColor = incident.status === 'Resolved' ? '#28a745' : 
                            incident.status === 'In Progress' ? '#ffc107' : '#dc3545';

        return (
          <div key={incident._id} className="card" style={{ borderLeft: `5px solid ${statusColor}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ margin: '0 0 5px 0' }}>{incident.title}</h4>
                {incident.type && (
                  <span style={{ background: '#eee', color: '#555', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>
                    {incident.type}
                  </span>
                )}
              </div>
              <span style={{ 
                background: statusColor, 
                color: '#fff', 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '12px', 
                fontWeight: 'bold' 
              }}>
                {incident.status || 'Open'}
              </span>
            </div>
            
            <p style={{ margin: '10px 0' }}><strong>📍 Location:</strong> {incident.location}</p>
            <p style={{ color: '#555' }}>{incident.description}</p>
            
            <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #eee', fontSize: '13px', color: '#777', display: 'flex', justifyContent: 'space-between' }}>
              <span>👤 @{incident.user || 'Anonymous'}</span>
              <span>🕒 {formattedDate}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default App;