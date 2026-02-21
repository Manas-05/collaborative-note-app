const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  getAllNotes, getNoteById, createNote, updateNote, deleteNote,
  addCollaborator, removeCollaborator, generateShareLink, getPublicNote
} = require('../controllers/notesController');

router.get('/public/:token', getPublicNote);

router.use(authenticate);
router.get('/', getAllNotes);
router.post('/', createNote);
router.get('/:id', getNoteById);
router.put('/:id', updateNote);
router.delete('/:id', deleteNote);
router.post('/:id/collaborators', addCollaborator);
router.delete('/:id/collaborators/:userId', removeCollaborator);
router.post('/:id/share', generateShareLink);

module.exports = router;