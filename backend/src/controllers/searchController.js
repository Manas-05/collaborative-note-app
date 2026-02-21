const db = require('../config/db');

const search = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) return res.status(400).json({ error: 'Query required' });

    const userId = req.user.id;
    const searchTerm = q.trim();

    const { rows } = await db.query(`
      SELECT DISTINCT n.id, n.title, n.updated_at,
        LEFT(n.content, 200) as content_preview,
        ts_rank(to_tsvector('english', n.title || ' ' || n.content), plainto_tsquery('english', $1)) as rank,
        u.name as owner_name,
        CASE WHEN n.owner_id = $2 THEN 'owner' ELSE nc.permission END as my_permission
      FROM notes n
      JOIN users u ON n.owner_id = u.id
      LEFT JOIN note_collaborators nc ON n.id = nc.note_id AND nc.user_id = $2
      WHERE (n.owner_id = $2 OR nc.user_id = $2)
        AND (
          n.title ILIKE $3 OR
          n.content ILIKE $3 OR
          to_tsvector('english', n.title || ' ' || n.content) @@ plainto_tsquery('english', $1)
        )
      ORDER BY rank DESC, n.updated_at DESC
      LIMIT 20
    `, [searchTerm, userId, `%${searchTerm}%`]);

    res.json({ results: rows, query: searchTerm });
  } catch (err) {
    next(err);
  }
};

module.exports = { search };