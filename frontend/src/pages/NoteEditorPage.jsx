import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNote, updateNote, deleteNote, updateNoteRealtime, clearCurrentNote } from '../features/notes/notesSlice';
import { getSocket } from '../services/socket';
import api from '../services/api';

export default function NoteEditorPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentNote, collaborators } = useSelector((s) => s.notes);
  const { user } = useSelector((s) => s.auth);
  const socket = getSocket();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [shareToken, setShareToken] = useState(null);
  const [showCollabModal, setShowCollabModal] = useState(false);

  const [saveMsg, setSaveMsg] = useState('');

  const saveTimer = useRef(null);
  const isRemoteUpdate = useRef(false);

  useEffect(() => {
    dispatch(fetchNote(id));
    return () => { dispatch(clearCurrentNote()); };
  }, [id, dispatch]);

  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title || '');
      setContent(currentNote.content || '');
      setShareToken(currentNote.share_token);
    }
  }, [currentNote]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join-note', { noteId: id });

    socket.on('note-updated', ({ title: t, content: c, updatedBy }) => {
      if (updatedBy?.id === user?.id) return;
      isRemoteUpdate.current = true;
      if (t !== undefined) setTitle(t);
      if (c !== undefined) setContent(c);
      dispatch(updateNoteRealtime({ noteId: id, title: t, content: c }));
      setTimeout(() => { isRemoteUpdate.current = false; }, 100);
    });

    socket.on('active-users', (users) => setActiveUsers(users));

    return () => {
      socket.emit('leave-note', { noteId: id });
      socket.off('note-updated');
      socket.off('active-users');
    };
  }, [socket, id, user?.id, dispatch]);

  const emitUpdate = useCallback((newTitle, newContent) => {
    if (!socket || isRemoteUpdate.current) return;
    socket.emit('note-update', { noteId: id, title: newTitle, content: newContent });
  }, [socket, id]);

  const scheduleSave = (t, c) => {
    clearTimeout(saveTimer.current);
    setSaveMsg('Saving...');
    saveTimer.current = setTimeout(async () => {
      await dispatch(updateNote({ id, title: t, content: c }));
      setSaveMsg('Saved ✓');
      setTimeout(() => setSaveMsg(''), 2000);
    }, 1500);
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    emitUpdate(val, content);
    scheduleSave(val, content);
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    emitUpdate(title, val);
    scheduleSave(title, val);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      await dispatch(deleteNote(id));
      navigate('/dashboard');
    }
  };

  const handleGenerateShareLink = async () => {
    const { data } = await api.post(`/notes/${id}/share`);
    setShareToken(data.shareToken);
  };

  const isOwner = currentNote?.owner_id === user?.id;
  const myCollab = collaborators.find((c) => c.id === user?.id);
  const canEdit = isOwner || myCollab?.permission === 'editor';

  if (!currentNote) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading note...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>

      {/* Top Bar */}
      <div style={{ background: '#fff', padding: '12px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: '1px solid #ddd', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
        >
          ← Back
        </button>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saveMsg && (
            <span style={{ fontSize: 13, color: saveMsg.includes('✓') ? 'green' : '#888' }}>
              {saveMsg}
            </span>
          )}
          {activeUsers.length > 0 && (
            <span style={{ fontSize: 12, background: '#e8f4fd', color: '#0066cc', padding: '4px 10px', borderRadius: 12 }}>
              👥 {activeUsers.length} online
            </span>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => setShowCollabModal(true)}
                style={{ padding: '6px 12px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
              >
                👥 Collaborators
              </button>
              <button
                onClick={handleGenerateShareLink}
                style={{ padding: '6px 12px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
              >
                🔗 Share
              </button>
              <button
                onClick={handleDelete}
                style={{ padding: '6px 12px', background: '#fff0f0', border: '1px solid #ffcccc', color: '#cc0000', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
              >
                🗑️ Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Share Link Banner */}
      {shareToken && (
        <div style={{ background: '#f0f9ff', border: '1px solid #b3d9ff', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13 }}>🔗 Public link:</span>
          <a
            href={`${window.location.origin}/public/${shareToken}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13, color: '#0066cc' }}
          >
            {`${window.location.origin}/public/${shareToken}`}
          </a>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/public/${shareToken}`)}
            style={{ padding: '4px 10px', fontSize: 12, border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', background: '#fff' }}
          >
            Copy
          </button>
        </div>
      )}

      {/* Editor */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        <input
          value={title}
          onChange={handleTitleChange}
          disabled={!canEdit}
          placeholder="Note title..."
          style={{ width: '100%', fontSize: 32, fontWeight: 'bold', border: 'none', borderBottom: '2px solid #eee', outline: 'none', marginBottom: 24, padding: '8px 0', boxSizing: 'border-box', background: 'transparent', color: '#222' }}
        />
        <textarea
          value={content}
          onChange={handleContentChange}
          disabled={!canEdit}
          placeholder={canEdit ? 'Start writing your note...' : 'You have view-only access to this note.'}
          style={{ width: '100%', minHeight: '65vh', border: '1px solid #eee', borderRadius: 8, padding: 16, fontSize: 16, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.7, outline: 'none', background: canEdit ? '#fff' : '#fafafa', color: '#333' }}
        />
        {!canEdit && (
          <p style={{ color: '#888', fontSize: 13, marginTop: 8 }}>👁️ You have view-only access to this note.</p>
        )}
      </div>

      {/* Collaborator Modal */}
      {showCollabModal && (
        <CollaboratorModal
          noteId={id}
          collaborators={collaborators}
          onClose={() => setShowCollabModal(false)}
          onUpdate={() => dispatch(fetchNote(id))}
        />
      )}
    </div>
  );
}

function CollaboratorModal({ noteId, collaborators, onClose, onUpdate }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('viewer');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleAdd = async () => {
    if (!email) return;
    try {
      await api.post(`/notes/${noteId}/collaborators`, { email, permission });
      setMessage('Collaborator added successfully!');
      setIsError(false);
      setEmail('');
      onUpdate();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Error adding collaborator');
      setIsError(true);
    }
  };

  const handleRemove = async (userId) => {
    try {
      await api.delete(`/notes/${noteId}/collaborators/${userId}`);
      onUpdate();
    } catch (err) {
      setMessage('Error removing collaborator');
      setIsError(true);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: 32, borderRadius: 8, width: '100%', maxWidth: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 20px' }}>👥 Manage Collaborators</h3>

        {message && (
          <div style={{ padding: 10, borderRadius: 4, marginBottom: 16, fontSize: 13, background: isError ? '#fff0f0' : '#f0fff0', color: isError ? 'red' : 'green', border: `1px solid ${isError ? '#ffcccc' : '#ccffcc'}` }}>
            {message}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="User email address"
            style={{ flex: 1, padding: 10, border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
          />
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 4, fontSize: 14 }}
          >
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
          </select>
          <button
            onClick={handleAdd}
            style={{ padding: '10px 16px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
          >
            Add
          </button>
        </div>

        <div style={{ marginBottom: 20 }}>
          {collaborators.length === 0 ? (
            <p style={{ color: '#888', fontSize: 14, textAlign: 'center' }}>No collaborators yet.</p>
          ) : (
            collaborators.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <span style={{ fontWeight: 'bold', fontSize: 14 }}>{c.name}</span>
                  <span style={{ color: '#888', fontSize: 13, marginLeft: 8 }}>{c.email}</span>
                  <span style={{ marginLeft: 8, fontSize: 11, background: '#e8f4fd', color: '#0066cc', padding: '2px 8px', borderRadius: 12 }}>{c.permission}</span>
                </div>
                <button
                  onClick={() => handleRemove(c.id)}
                  style={{ background: 'none', border: 'none', color: '#cc0000', cursor: 'pointer', fontSize: 13 }}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <button
          onClick={onClose}
          style={{ width: '100%', padding: 10, background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
        >
          Close
        </button>
      </div>
    </div>
  );
}