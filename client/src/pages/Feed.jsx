import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { usePostHog } from 'posthog-js/react'; 
import Navbar from '../components/Navbar';
import IncidentCard from '../components/IncidentCard';

function Feed({ token, currentUser, setToken, theme, setTheme }) {
  const posthog = usePostHog();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const CLOUD_NAME = "dne0docy4"; 
  const UPLOAD_PRESET = "citywatch_preset"; 

  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [filterType, setFilterType] = useState('All'); 
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', location: '', description: '', type: 'General', isAnonymous: false });
  const [imageFile, setImageFile] = useState(null); 

  // Fetch Incidents
  useEffect(() => {
    const fetchIncidents = async () => {
      setIsLoading(true);
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get(`${API_URL}/api/incidents`, config);
        setIncidents(res.data);
      } catch (err) {
        toast.error("Failed to load incidents");
      } finally {
        setIsLoading(false);
      }
    };
    fetchIncidents();
  }, [token, API_URL]);

  // Sockets
  useEffect(() => {
    if (!token || !currentUser.city) return;
    const socket = io(API_URL);
    socket.emit('join_city', currentUser.city);
    socket.on('new_incident', (newIncident) => {
      setIncidents((prev) => {
        if (prev.find(i => i._id === newIncident._id)) return prev;
        toast.success(`New report in ${currentUser.city}: ${newIncident.title}`);
        return [newIncident, ...prev];
      });
    });
    socket.on('update_incident', (updatedIncident) => {
      setIncidents((prev) => prev.map(inc => inc._id === updatedIncident._id ? updatedIncident : inc));
    });
    return () => socket.disconnect();
  }, [token, currentUser.city, API_URL]);

  const handleAutoDetectLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation is not supported");
    setIsDetectingLocation(true);
    const loader = toast.loading("Detecting your location...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          setFormData(prev => ({ ...prev, location: res.data?.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
          toast.success("Location found!", { id: loader });
        } catch (err) {
          setFormData(prev => ({ ...prev, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
          toast.success("GPS Coordinates detected!", { id: loader });
        } finally { setIsDetectingLocation(false); }
      },
      () => { toast.error("Failed to detect location.", { id: loader }); setIsDetectingLocation(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
      posthog.capture('incident_reported', { category: formData.type, location: formData.location, city: currentUser.city });
      toast.dismiss(loader);
      toast.success('Report submitted!');
      setFormData({ title: '', location: '', description: '', type: 'General', isAnonymous: false });
      setImageFile(null);
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
    } catch (err) { toast.error("Could not vote"); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      await axios.put(`${API_URL}/api/incidents/${id}`, { status: newStatus }, config);
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) { toast.error("Failed to update status"); }
  };

  const filteredIncidents = filterType === 'All' ? incidents : incidents.filter(inc => inc.type === filterType);

  return (
    <div className="app-container">
      
      {/* 1. IMPORTED NAVBAR COMPONENT */}
      <Navbar theme={theme} setTheme={setTheme} setToken={setToken} />

      <main className="main-content">
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowForm(!showForm)} style={{ width: 'auto', background: showForm ? '#ef4444' : '#2563eb', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}>
            {showForm ? '✖ Close Form' : '➕ Report Incident'}
          </button>
        </div>

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
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input placeholder="Location / Address" value={formData.location} required onChange={(e) => setFormData({...formData, location: e.target.value})} style={{ flex: 1, marginBottom: 0 }} />
                <button type="button" onClick={handleAutoDetectLocation} disabled={isDetectingLocation} style={{ width: 'auto', padding: '0 15px', background: 'var(--bg-secondary)', color: 'var(--text-main)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {isDetectingLocation ? '⏳...' : '📍 Auto'}
                </button>
              </div>
              <textarea placeholder="Description..." value={formData.description} required rows="3" onChange={(e) => setFormData({...formData, description: e.target.value})} />
              <div className="file-upload-wrapper">
                <label style={{ fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Attach Photo (Optional) 📸</label>
                <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0', gap: '8px' }}>
                <input type="checkbox" id="anonCheck" checked={formData.isAnonymous} onChange={(e) => setFormData({...formData, isAnonymous: e.target.checked})} style={{ width: 'auto', margin: 0 }} />
                <label htmlFor="anonCheck" style={{ fontSize: '0.9rem', color: 'var(--text-main)', cursor: 'pointer' }}>Post Anonymously 🕵️</label>
              </div>
              <button type="submit">Submit Report</button>
            </form>
          </section>
        )}

        <section className="feed-section">
          <div className="feed-header">
            <h3>Community Reports {currentUser.city ? `- ${currentUser.city}` : ''}</h3>
            <div className="filter-bar">
              {['All', 'Sanitation', 'Infrastructure', 'Traffic', 'Water'].map(type => (
                <button key={type} onClick={() => setFilterType(type)} className={`filter-btn ${filterType === type ? 'active' : ''}`}>{type}</button>
              ))}
            </div>
          </div>
          {isLoading && <div className="loader-container"><img src="/logo.png" alt="Loading..." className="g-loader" /></div>}
          {!isLoading && filteredIncidents.length === 0 && <p className="no-data">No reports found in {currentUser.city}.</p>}
          
          {/* 2. MAPPING OVER IMPORTED INCIDENT CARD COMPONENT */}
          {filteredIncidents.map((incident) => (
            <IncidentCard 
              key={incident._id} 
              incident={incident} 
              currentUser={currentUser} 
              handleUpvote={handleUpvote} 
              handleStatusChange={handleStatusChange} 
            />
          ))}

        </section>
      </main>
      <footer style={{ marginTop: 'auto', padding: '20px', width: '100%', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}><p>© 2026 CityWatch 🇿🇲 • Built by <strong>Chiza Labs</strong></p></footer>
    </div>
  );
}

export default Feed;