const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { getActivityLogs } = require('../controllers/activityController');

router.get('/', authenticate, getActivityLogs);

module.exports = router;