import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Link as LinkIcon, 
  Trash2, 
  ExternalLink, 
  Download,
  Search,
  Globe,
  Clock,
  User
} from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

function App() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSession, setNewSession] = useState({ name: '', target_url: '' });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/sessions`);
      setSessions(res.data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    }
  };

  const createSession = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/sessions`, newSession);
      setNewSession({ name: '', target_url: '' });
      setShowCreateModal(false);
      fetchSessions();
    } catch (err) {
      console.error('Error creating session:', err);
      const msg = err.response?.data?.error || err.message;
      alert('Failed to create link: ' + msg);
    }
  };

  const deleteSession = async (id) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      await axios.delete(`${API_BASE}/api/sessions/${id}`);
      if (activeSession?.id === id) setActiveSession(null);
      fetchSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  const viewLogs = async (session) => {
    setActiveSession(session);
    try {
      const res = await axios.get(`${API_BASE}/api/logs/${session.id}`);
      setLogs(res.data);
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['IP', 'Timestamp', 'Location', 'Browser', 'OS', 'Referrer'];
    const rows = logs.map(l => [
      l.ip_address,
      l.timestamp,
      `${l.city}, ${l.country}`,
      l.browser,
      l.os,
      l.referrer
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `electra_logs_${activeSession.slug}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-container">
      <header className="animate-in">
        <div className="logo">ELECTRA.XYZ</div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} /> New Link
        </button>
      </header>

      <div className="grid animate-in" style={{ animationDelay: '0.1s' }}>
        {sessions.map(session => (
          <div key={session.id} className={`card ${activeSession?.id === session.id ? 'active-card' : ''}`} 
               onClick={() => viewLogs(session)} style={{ cursor: 'pointer' }}>
            <div className="flex-between">
              <span className="badge badge-purple">{session.slug}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" style={{ padding: '0.4rem' }} title="Copy Redirection Link"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          navigator.clipboard.writeText(`${API_BASE}/l/${session.slug}`);
                          alert('Redirection Link Copied!');
                        }}>
                  <ExternalLink size={14} />
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.4rem' }} title="Copy Image Pixel Logger"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          navigator.clipboard.writeText(`${API_BASE}/i/${session.slug}`);
                          alert('Image Pixel Logger Copied!');
                        }}>
                  <Globe size={14} />
                </button>
                <button className="btn btn-secondary" style={{ padding: '0.4rem', color: 'var(--danger)' }} 
                        onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <h3 style={{ marginTop: '1rem' }}>{session.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              Redirects to: {session.target_url || 'Decoy Page'}
            </p>
            <div className="flex-between">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {session.click_count} Hits
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                {session.target_url ? 'LINK + PIXEL' : 'PIXEL ONLY'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {activeSession && (
        <div className="mt-2 animate-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex-between">
            <h2>Logs for: {activeSession.name}</h2>
            <button className="btn btn-secondary" onClick={exportCSV}>
              <Download size={18} /> Export CSV
            </button>
          </div>
          <div className="table-container card">
            <table>
              <thead>
                <tr>
                  <th><User size={14} /> IP Address</th>
                  <th><Globe size={14} /> Location</th>
                  <th><Clock size={14} /> Timestamp</th>
                  <th><Search size={14} /> Browser / OS</th>
                  <th><Search size={14} /> Referrer</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No activity yet</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'monospace' }}>{log.ip_address}</td>
                      <td>
                        <span className="badge badge-cyan">{log.country}</span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{log.city}</div>
                      </td>
                      <td>{new Date(log.timestamp).toLocaleString()}</td>
                      <td>
                        <div style={{ fontSize: '0.9rem' }}>{log.browser}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.os}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{log.referrer}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px' }}>
            <h2>Create New Electra Link</h2>
            <form onSubmit={createSession}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Session Name</label>
                <input type="text" placeholder="e.g. Campaign Alpha" required 
                       value={newSession.name} onChange={e => setNewSession({...newSession, name: e.target.value})} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Target Redirect URL (Optional)</label>
                <input type="url" placeholder="https://example.com" 
                       value={newSession.target_url} onChange={e => setNewSession({...newSession, target_url: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Link</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .active-card { border-color: var(--accent-primary); box-shadow: 0 0 20px rgba(168, 85, 247, 0.2); }
      `}</style>
    </div>
  );
}

export default App;
