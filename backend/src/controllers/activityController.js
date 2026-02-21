const db = require('../config/db');

const getActivityLogs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { noteId } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    let query, params;
    if (noteId) {
      const accessCheck = await db.query(
        `SELECT 1 FROM notes n
         LEFT JOIN note_collaborators nc ON n.id = nc.note_id AND nc.user_id = $2
         WHERE n.id = $1 AND (n.owner_id = $2 OR nc.user_id = $2)`,
        [noteId, userId]
      );
      if (!accessCheck.rows.length) return res.status(403).json({ error: 'Access denied' });

      query = `
        SELECT al.*, u.name as user_name, u.email as user_email
        FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id
        WHERE al.note_id = $1 ORDER BY al.created_at DESC LIMIT $2
      `;
      params = [noteId, limit];
    } else {
      query = `
        SELECT al.*, u.name as user_name, u.email as user_email, n.title as note_title
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN notes n ON al.note_id = n.id
        WHERE al.user_id = $1 ORDER BY al.created_at DESC LIMIT $2
      `;
      params = [userId, limit];
    }

    const { rows } = await db.query(query, params);
    res.json({ logs: rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getActivityLogs };