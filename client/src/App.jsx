import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [incidents, setIncidents] = useState([]);
  const [formData, setFormData] = useState({ title: '', location: '', description: '' });

  // 1. Fetch Incidents on Load
  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      // connecting to your backend
      const res = await axios.get('http://localhost:5000/api/incidents');
      setIncidents(res.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  // 2. Handle Input Change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 3. Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/incidents', formData);
      setFormData({ title: '', location: '', description: '' }); // Reset form
      fetchIncidents(); // Refresh list
    } catch (err) {
      console.error("Error submitting report:", err);
    }
  };

  return (
    <div className="container">
      <h1>CityWatch 🏙️ </h1>

      {/* REPORT FORM */}
      <div className="form-box">
        <h3>Report an Incident</h3>
        <form onSubmit={handleSubmit}>
          <input 
            name="title" 
            placeholder="Title (e.g. Pothole)" 
            value={formData.title} 
            onChange={handleChange} 
            required 
          />
          <input 
            name="location" 
            placeholder="Location" 
            value={formData.location} 
            onChange={handleChange} 
            required 
          />
          <textarea 
            name="description" 
            placeholder="Description" 
            value={formData.description} 
            onChange={handleChange} 
            rows="3"
            required 
          />
          <button type="submit">Submit Report</button>
        </form>
      </div>

      {/* INCIDENT LIST */}
      <h3>Recent Reports</h3>
      {incidents.map((incident) => (
        <div key={incident._id} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h4>{incident.title}</h4>
            <span className={`status-${incident.status}`}>{incident.status}</span>
          </div>
          <p><strong>📍 Location:</strong> {incident.location}</p>
          <p>{incident.description}</p>
          <small>Reported on: {new Date(incident.createdAt).toLocaleDateString()}</small>
        </div>
      ))}
    </div>
  )
}

export default App