const db = require('../config/db');
const { nanoid } = require('nanoid');

const logActivity = async (userId, noteId, action, metadata = {}) => {
  try {
    await db.query(
      'INSERT INTO activity_logs (user_id, note_id, action, metadata) VALUES ($1, $2, $3, $4)',
      [userId, noteId, action, JSON.stringify(metadata)]
    );
  } catch (e) {
    console.error('Activity log error:', e);
  }
};

const checkNoteAccess = async (noteId, userId, requiredPermission = 'viewer') => {
  const { rows } = await db.query('SELECT * FROM notes WHERE id = $1', [noteId]);
  if (!rows.length) return { note: null, access: false };

  const note = rows[0];
  if (note.owner_id === userId) return { note, access: true, permission: 'owner' };

  const collab = await db.query(
    'SELECT permission FROM note_collaborators WHERE note_id = $1 AND user_id = $2',
    [noteId, userId]
  );
  if (!collab.rows.length) return { note, access: false };

  const permission = collab.rows[0].permission;
  if (requiredPermission === 'editor' && permission !== 'editor') {
    return { note, access: false, permission };
  }
  return { note, access: true, permission };
};

const getAllNotes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows } = await db.query(`
      SELECT n.*, u.name as owner_name,
        CASE WHEN n.owner_id = $1 THEN 'owner' ELSE nc.permission END as my_permission
      FROM notes n
      JOIN users u ON n.owner_id = u.id
      LEFT JOIN note_collaborators nc ON n.id = nc.note_id AND nc.user_id = $1
      WHERE n.owner_id = $1 OR nc.user_id = $1
      ORDER BY n.updated_at DESC
    `, [userId]);
    res.json({ notes: rows });
  } catch (err) {
    next(err);
  }
};

const getNoteById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note, access, permission } = await checkNoteAccess(id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (!access) return res.status(403).json({ error: 'Access denied' });

    const { rows: collaborators } = await db.query(`
      SELECT nc.permission, u.id, u.name, u.email
      FROM note_collaborators nc
      JOIN users u ON nc.user_id = u.id
      WHERE nc.note_id = $1
    `, [id]);

    const ownerResult = await db.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [note.owner_id]
    );

    res.json({ note, collaborators, owner: ownerResult.rows[0], myPermission: permission });
  } catch (err) {
    next(err);
  }
};

const createNote = async (req, res, next) => {
  try {
    const { title = 'Untitled', content = '' } = req.body;
    const { rows } = await db.query(
      'INSERT INTO notes (title, content, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [title, content, req.user.id]
    );
    const note = rows[0];
    await logActivity(req.user.id, note.id, 'create', { title });
    res.status(201).json({ note });
  } catch (err) {
    next(err);
  }
};

const updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const { note, access } = await checkNoteAccess(id, req.user.id, 'editor');
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (!access) return res.status(403).json({ error: 'Edit access required' });

    const { rows } = await db.query(
      `UPDATE notes SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        updated_at = NOW()
      WHERE id = $3 RETURNING *`,
      [title, content, id]
    );
    await logActivity(req.user.id, id, 'update', { title });
    res.json({ note: rows[0] });
  } catch (err) {
    next(err);
  }
};

const deleteNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = await checkNoteAccess(id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only owner or admin can delete' });
    }
    await logActivity(req.user.id, id, 'delete', { title: note.title });
    await db.query('DELETE FROM notes WHERE id = $1', [id]);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    next(err);
  }
};

const addCollaborator = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, permission = 'viewer' } = req.body;
    const { note } = await checkNoteAccess(id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only owner can manage collaborators' });
    }

    const userResult = await db.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (!userResult.rows.length) return res.status(404).json({ error: 'User not found' });

    const targetUser = userResult.rows[0];
    if (targetUser.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot add yourself' });
    }

    await db.query(
      `INSERT INTO note_collaborators (note_id, user_id, permission) VALUES ($1, $2, $3)
       ON CONFLICT (note_id, user_id) DO UPDATE SET permission = $3`,
      [id, targetUser.id, permission]
    );

    await logActivity(req.user.id, id, 'share', { sharedWith: email, permission });
    res.json({ message: 'Collaborator added', user: targetUser, permission });
  } catch (err) {
    next(err);
  }
};

const removeCollaborator = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const { note } = await checkNoteAccess(id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only owner can manage collaborators' });
    }
    await db.query(
      'DELETE FROM note_collaborators WHERE note_id = $1 AND user_id = $2',
      [id, userId]
    );
    res.json({ message: 'Collaborator removed' });
  } catch (err) {
    next(err);
  }
};

const generateShareLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = await checkNoteAccess(id, req.user.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only owner can share' });
    }
    const token = nanoid(32);
    const { rows } = await db.query(
      'UPDATE notes SET share_token = $1, is_public = TRUE WHERE id = $2 RETURNING share_token',
      [token, id]
    );
    await logActivity(req.user.id, id, 'generate_share_link');
    res.json({ shareToken: rows[0].share_token });
  } catch (err) {
    next(err);
  }
};

const getPublicNote = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { rows } = await db.query(
      `SELECT n.id, n.title, n.content, n.created_at, n.updated_at, u.name as owner_name
       FROM notes n JOIN users u ON n.owner_id = u.id
       WHERE n.share_token = $1 AND n.is_public = TRUE`,
      [token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Note not found or not public' });
    res.json({ note: rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllNotes, getNoteById, createNote, updateNote, deleteNote,
  addCollaborator, removeCollaborator, generateShareLink, getPublicNote
};