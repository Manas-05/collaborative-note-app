import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { FiEye, FiUser, FiClock, FiFileText } from 'react-icons/fi';

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
        <FiFileText size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
        <h2>{error}</h2>
        <Link to="/login" style={{ color: '#0066cc' }}>Go to Login</Link>
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
        <h2 style={{ margin: 0, color: '#0066cc', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiFileText /> CollabNotes
        </h2>
        <Link to="/login" style={{ fontSize: 14, color: '#0066cc', textDecoration: 'none' }}>
          Sign in to create notes →
        </Link>
      </div>

      <div style={{ background: '#fff9e6', border: '1px solid #f0c040', padding: '10px 24px', fontSize: 14, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <FiEye /> <strong>Read-only view</strong> — This note has been shared with you. You cannot edit it.
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 36, marginBottom: 8, color: '#222' }}>{note.title}</h1>
        <p style={{ color: '#999', fontSize: 14, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FiUser size={13} /> {note.owner_name}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FiClock size={13} /> {new Date(note.updated_at).toLocaleString()}
          </span>
        </p>
        <div style={{ fontSize: 16, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#333' }}>
          {note.content || 'This note is empty.'}
        </div>
      </div>
    </div>
  );
}