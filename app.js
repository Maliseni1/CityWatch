const API_URL = 'http://localhost:5000/api/incidents';

// DOM Elements
const form = document.getElementById('incidentForm');
const list = document.getElementById('incidentList');

// 1. Fetch and Display Incidents
async function fetchIncidents() {
    try {
        const res = await fetch(API_URL);
        const incidents = await res.json();
        
        list.innerHTML = ''; // Clear loading text
        
        incidents.forEach(incident => {
            const div = document.createElement('div');
            div.className = 'incident-card';
            div.innerHTML = `
                <h4>${incident.title} <span style="font-size:0.8em; float:right" class="status-${incident.status}">${incident.status}</span></h4>
                <p><strong>📍 Location:</strong> ${incident.location}</p>
                <p>${incident.description}</p>
                <small>Reported on: ${new Date(incident.createdAt).toLocaleDateString()}</small>
            `;
            list.appendChild(div);
        });
    } catch (err) {
        console.error('Error fetching data:', err);
    }
}

// 2. Handle Form Submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newIncident = {
        title: document.getElementById('title').value,
        location: document.getElementById('location').value,
        description: document.getElementById('description').value
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newIncident)
        });
        
        // Reset form and refresh list
        form.reset();
        fetchIncidents(); 
        
    } catch (err) {
        console.error('Error posting data:', err);
    }
});

// Initial Load
fetchIncidents();