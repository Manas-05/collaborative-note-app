import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const actionConfig = {
  create: { icon: '✨', label: 'created', color: '#00aa44' },
  update: { icon: '✏️', label: 'updated', color: '#0066cc' },
  delete: { icon: '🗑️', label: 'deleted', color: '#cc0000' },
  share: { icon: '👥', label: 'shared', color: '#9900cc' },
  generate_share_link: { icon: '🔗', label: 'generated share link for', color: '#cc6600' },
};

export default function ActivityPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/activity')
      .then((r) => setLogs(r.data.logs))
      .catch((err) => console.error('Activity fetch error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ background: '#fff', padding: '16px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/dashboard" style={{ color: '#0066cc', textDecoration: 'none', fontSize: 14 }}>
          ← Back to Dashboard
        </Link>
        <h2 style={{ margin: 0 }}>📋 Activity Log</h2>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        {loading && (
          <p style={{ textAlign: 'center', color: '#888' }}>Loading activity...</p>
        )}

        {!loading && logs.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p>No activity yet. Start creating notes!</p>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            {logs.map((log, idx) => {
              const config = actionConfig[log.action] || { icon: '📋', label: log.action, color: '#333' };
              return (
                <div
                  key={log.id}
                  style={{ display: 'flex', gap: 16, padding: '16px 20px', borderBottom: idx < logs.length - 1 ? '1px solid #f0f0f0' : 'none', alignItems: 'flex-start' }}
                >
                  <span style={{ fontSize: 24, minWidth: 32, textAlign: 'center' }}>
                    {config.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 14, color: '#333' }}>
                      <strong>{log.user_name || 'Someone'}</strong>{' '}
                      <span style={{ color: config.color }}>{config.label}</span>{' '}
                      {log.note_id ? (
                        <Link
                          to={`/notes/${log.note_id}`}
                          style={{ color: '#0066cc', textDecoration: 'none', fontWeight: 'bold' }}
                        >
                          "{log.note_title || 'a note'}"
                        </Link>
                      ) : (
                        <span style={{ fontStyle: 'italic', color: '#888' }}>a deleted note</span>
                      )}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#999' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}