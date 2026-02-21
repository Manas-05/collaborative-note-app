import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { fetchNotes, createNote } from '../features/notes/notesSlice';
import { searchNotes, clearSearch } from '../features/search/searchSlice';
import { logoutUser } from '../features/auth/authSlice';

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: notes, loading } = useSelector((s) => s.notes);
  const { results: searchResults, loading: searching } = useSelector((s) => s.search);
  const { user } = useSelector((s) => s.auth);
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState(false);

  useEffect(() => {
    dispatch(fetchNotes());
  }, [dispatch]);

  const handleCreate = async () => {
    const result = await dispatch(createNote({ title: 'Untitled Note', content: '' }));
    if (!result.error) navigate(`/notes/${result.payload.id}`);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length >= 2) {
      setSearchMode(true);
      dispatch(searchNotes(val));
    } else {
      setSearchMode(false);
      dispatch(clearSearch());
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const displayNotes = searchMode ? searchResults : notes;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Navbar */}
      <div style={{ background: '#fff', padding: '16px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: '#0066cc' }}>📝 CollabNotes</h2>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#666' }}>👤 {user?.name} ({user?.role})</span>
          <Link to="/activity" style={{ fontSize: 14, color: '#0066cc', textDecoration: 'none' }}>Activity Log</Link>
          <button
            onClick={handleLogout}
            style={{ padding: '6px 14px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <input
            value={query}
            onChange={handleSearch}
            placeholder="🔍 Search notes by title or content..."
            style={{ flex: 1, padding: 12, border: '1px solid #ddd', borderRadius: 4, fontSize: 14, background: '#fff' }}
          />
          <button
            onClick={handleCreate}
            style={{ padding: '12px 24px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 'bold', whiteSpace: 'nowrap' }}
          >
            + New Note
          </button>
        </div>

        {searchMode && (
          <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
            {searching ? 'Searching...' : `${displayNotes.length} result(s) for "${query}"`}
          </p>
        )}

        {loading && (
          <div style={{ textAlign: 'center', marginTop: 60, color: '#888' }}>Loading notes...</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {displayNotes.map((note) => (
            <Link
              key={note.id}
              to={`/notes/${note.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, padding: 20, cursor: 'pointer', transition: 'all 0.2s', height: '100%', boxSizing: 'border-box' }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
              >
                <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {note.title || 'Untitled'}
                </h3>
                <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {note.content_preview || note.content?.substring(0, 120) || 'Empty note...'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#999' }}>
                  <span>✍️ {note.owner_name}</span>
                  <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                </div>
                {note.my_permission && note.my_permission !== 'owner' && (
                  <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, background: '#e8f4fd', color: '#0066cc', padding: '2px 8px', borderRadius: 12 }}>
                    {note.my_permission}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {displayNotes.length === 0 && !loading && (
          <div style={{ textAlign: 'center', marginTop: 80, color: '#888' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📄</div>
            <h3>{searchMode ? 'No notes match your search.' : 'No notes yet!'}</h3>
            {!searchMode && (
              <button
                onClick={handleCreate}
                style={{ marginTop: 12, padding: '10px 24px', background: '#0066cc', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
              >
                Create your first note
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}