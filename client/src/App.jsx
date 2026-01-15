import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { io } from 'socket.io-client';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [incidents, setIncidents] = useState([]);
  const [formData, setFormData] = useState({ title: '', location: '', description: '' });
  
  // Auth States
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authData, setAuthData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  // --- ACTION: Fetch Incidents ---
  const fetchIncidents = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/incidents');
      setIncidents(res.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  // --- EFFECT 1: Load Initial Data when Logged In ---
  // (This was missing in your code!)
  useEffect(() => {
    if (token) {
      fetchIncidents();
    }
  }, [token]);

  // --- EFFECT 2: Setup Real-time Sockets ---
  useEffect(() => {
    // Connect to backend
    const socket = io('http://localhost:5000');

    // Listen for 'new_incident' event
    socket.on('new_incident', (newIncident) => {
      // Update state by adding the new incident to the top of the list
      setIncidents((prevIncidents) => {
        // Optional: Check to prevent duplicates if your network is slow
        if (prevIncidents.find(i => i._id === newIncident._id)) return prevIncidents;
        return [newIncident, ...prevIncidents];
      });
    });

    // Cleanup on unmount
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
      const res = await axios.post(`http://localhost:5000/api/auth/${endpoint}`, authData);
      
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
      // Post the data
      await axios.post('http://localhost:5000/api/incidents', formData);
      
      // Clear the form
      setFormData({ title: '', location: '', description: '' });
      
      // NOTE: We do NOT need to call fetchIncidents() here anymore.
      // The Socket.io listener above will automatically catch the 
      // "new_incident" event and update the list for us!
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

  // --- RENDER: LOGIN/REGISTER SCREEN ---
  if (!token) {
    return (
      <div className="container" style={{ maxWidth: '400px' }}>
        <h1>CityWatch 🔐</h1>
        <h3>{isLoginMode ? 'Login' : 'Register'}</h3>
        {error && <p style={{ color: 'red' }}>{error}</p>}
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
        <p style={{ marginTop: '1rem', cursor: 'pointer', color: '#007BFF' }} 
           onClick={() => { setIsLoginMode(!isLoginMode); setError(''); }}>
           {isLoginMode ? "Don't have an account? Register" : "Already have an account? Login"}
        </p>
      </div>
    );
  }

  // --- RENDER: MAIN DASHBOARD ---
  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>CityWatch 🏙️</h1>
        <button onClick={logout} style={{ width: 'auto', background: '#dc3545' }}>Logout</button>
      </div>

      <div className="form-box">
        <h3>Report an Incident</h3>
        <form onSubmit={handleIncidentSubmit}>
          <input 
            placeholder="Title" 
            value={formData.title} 
            onChange={(e) => setFormData({...formData, title: e.target.value})} 
            required 
          />
          <input 
            placeholder="Location" 
            value={formData.location} 
            onChange={(e) => setFormData({...formData, location: e.target.value})} 
            required 
          />
          <textarea 
            placeholder="Description" 
            value={formData.description} 
            onChange={(e) => setFormData({...formData, description: e.target.value})} 
            rows="3"
            required 
          />
          <button type="submit">Submit Report</button>
        </form>
      </div>

      <h3>Recent Reports</h3>
      {incidents.map((incident) => (
        <div key={incident._id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h4>{incident.title}</h4>
            <span className={`status-badge status-${incident.status}`}>{incident.status}</span>
          </div>
          <p><strong>📍 Location:</strong> {incident.location}</p>
          <p>{incident.description}</p>
          <small>Reported on: {new Date(incident.createdAt).toLocaleDateString()}</small>
        </div>
      ))}
    </div>
  );
}

export default App;