function IncidentCard({ incident, currentUser, handleUpvote, handleStatusChange }) {
  const isHidden = incident.isAnonymous;
  const displayName = isHidden ? "Anonymous Citizen" : `@${incident.user}`;
  const formattedDate = (incident.date || incident.createdAt) ? new Date(incident.date || incident.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const statusColor = incident.status === 'Resolved' ? '#10b981' : incident.status === 'In Progress' ? '#f59e0b' : '#ef4444';
  const hasUpvoted = (incident.upvotes || []).includes(currentUser.id);
  const canEditStatus = (currentUser.username === incident.user) || (currentUser.role === 'admin');

  return (
    <div className="card" style={{ borderLeft: `5px solid ${statusColor}` }}>
      {incident.imageUrl && <div className="card-image"><img src={incident.imageUrl} alt="Incident" /></div>}
      <div className="card-header">
        <div><h4>{incident.title}</h4><span className="type-badge">{incident.type}</span></div>
        {canEditStatus ? (
          <div className="status-container">
            <select className="status-select" value={incident.status || 'Open'} onChange={(e) => handleStatusChange(incident._id, e.target.value)} style={{ borderColor: statusColor, color: statusColor }}>
              <option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option>
            </select>
          </div>
        ) : (
          <span className="status-badge-readonly" style={{ backgroundColor: statusColor, color: '#ffffff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{incident.status || 'Open'}</span>
        )}
      </div>
      <p className="location">📍 {incident.location}</p>
      <p className="description">{incident.description}</p>
      <div className="card-footer">
        <div className="user-info">
          <span style={{ fontStyle: isHidden ? 'italic' : 'normal', fontWeight: isHidden ? '400' : '600' }}>👤 {displayName}</span>
          <button onClick={() => handleUpvote(incident._id)} className={`upvote-btn ${hasUpvoted ? 'voted' : ''}`} title="Verify this report">👍 Verify {(incident.upvotes || []).length > 0 && <span style={{ fontWeight: 'bold', marginLeft:'2px' }}>{(incident.upvotes || []).length}</span>}</button>
        </div>
        <span className="timestamp">🕒 {formattedDate}</span>
      </div>
    </div>
  );
}

export default IncidentCard;