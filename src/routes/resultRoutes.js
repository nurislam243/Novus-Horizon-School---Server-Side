const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');

// Route for adding bulk results
router.post('/add-bulk', resultController.addBulkResults);

module.exports = router;