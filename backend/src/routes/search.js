const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { search } = require('../controllers/searchController');

router.get('/', authenticate, search);

module.exports = router;