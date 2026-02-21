const jwt = require('jsonwebtoken');
const db = require('../config/db');

const activeUsers = new Map();

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const { rows } = await db.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (!rows.length) return next(new Error('User not found'));
      socket.user = rows[0];
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.name}`);

    socket.on('join-note', async ({ noteId }) => {
      try {
        const { rows } = await db.query(
          'SELECT * FROM notes WHERE id = $1',
          [noteId]
        );
        if (!rows.length) return socket.emit('error', 'Note not found');

        const note = rows[0];
        const isOwner = note.owner_id === socket.user.id;

        if (!isOwner) {
          const { rows: collab } = await db.query(
            'SELECT 1 FROM note_collaborators WHERE note_id = $1 AND user_id = $2',
            [noteId, socket.user.id]
          );
          if (!collab.length) return socket.emit('error', 'Access denied');
        }

        socket.join(noteId);

        if (!activeUsers.has(noteId)) activeUsers.set(noteId, new Set());
        activeUsers.get(noteId).add({
          userId: socket.user.id,
          socketId: socket.id,
          name: socket.user.name
        });

        const usersInRoom = Array.from(activeUsers.get(noteId));
        io.to(noteId).emit('active-users', usersInRoom);
        socket.emit('joined', { noteId, note });
      } catch (err) {
        console.error('join-note error:', err);
        socket.emit('error', 'Failed to join note');
      }
    });

    socket.on('note-update', async ({ noteId, title, content }) => {
      try {
        const { rows } = await db.query(
          'SELECT * FROM notes WHERE id = $1',
          [noteId]
        );
        if (!rows.length) return;

        const note = rows[0];
        const isOwner = note.owner_id === socket.user.id;
        let canEdit = isOwner;

        if (!isOwner) {
          const { rows: collab } = await db.query(
            'SELECT permission FROM note_collaborators WHERE note_id = $1 AND user_id = $2',
            [noteId, socket.user.id]
          );
          canEdit = collab.length && collab[0].permission === 'editor';
        }

        if (!canEdit) return socket.emit('error', 'No edit permission');

        await db.query(
          `UPDATE notes SET 
            title = COALESCE($1, title), 
            content = COALESCE($2, content), 
            updated_at = NOW() 
          WHERE id = $3`,
          [title, content, noteId]
        );

        socket.to(noteId).emit('note-updated', {
          noteId,
          title,
          content,
          updatedBy: { id: socket.user.id, name: socket.user.name },
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('note-update error:', err);
        socket.emit('error', 'Update failed');
      }
    });

    socket.on('cursor-move', ({ noteId, position }) => {
      socket.to(noteId).emit('cursor-moved', {
        userId: socket.user.id,
        name: socket.user.name,
        position,
      });
    });

    socket.on('leave-note', ({ noteId }) => {
      socket.leave(noteId);
      if (activeUsers.has(noteId)) {
        const users = activeUsers.get(noteId);
        users.forEach(u => {
          if (u.socketId === socket.id) users.delete(u);
        });
        io.to(noteId).emit('active-users', Array.from(users));
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user?.name}`);
      activeUsers.forEach((users, noteId) => {
        const prevSize = users.size;
        users.forEach(u => {
          if (u.socketId === socket.id) users.delete(u);
        });
        if (users.size < prevSize) {
          io.to(noteId).emit('active-users', Array.from(users));
        }
      });
    });
  });
};