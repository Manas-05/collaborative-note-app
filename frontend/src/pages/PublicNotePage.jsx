import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

export default function PublicNotePage() {
  const { token } = useParams();
  const [note, setNote] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/notes/public/${token}`)
      .then((r) => setNote(r.data.note))
      .catch(() => setError('Note not found or no longer public.'));
  }, [token]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        <h2>😕 {error}</h2>
        <Link to="/login">Go to Login</Link>
      </div>
    );
  }

  if (!note) {
    return (
      <div style={{ textAlign: 'center', marginTop: 100 }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      <div style={{ background: '#fff', padding: '12px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: '#0066cc' }}>📝 CollabNotes</h2>
        <Link to="/login" style={{ fontSize: 14, color: '#0066cc' }}>Sign in to create notes →</Link>
      </div>

      <div style={{ background: '#fff9e6', border: '1px solid #f0c040', padding: '10px 24px', fontSize: 14, textAlign: 'center' }}>
        👁️ <strong>Read-only view</strong> — This note has been shared with you. You cannot edit it.
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 36, marginBottom: 8, color: '#222' }}>{note.title}</h1>
        <p style={{ color: '#999', fontSize: 14, marginBottom: 32 }}>
          By <strong>{note.owner_name}</strong> · Last updated {new Date(note.updated_at).toLocaleString()}
        </p>
        <div style={{ fontSize: 16, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#333' }}>
          {note.content || 'This note is empty.'}
        </div>
      </div>
    </div>
  );
}