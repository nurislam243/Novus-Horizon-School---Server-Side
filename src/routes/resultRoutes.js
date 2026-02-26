const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');

// Route for adding bulk results
router.post('/add-bulk', resultController.addBulkResults);
router.get('/view-results', resultController.getResult);
router.get('/download-pdf', resultController.downloadPDF);

module.exports = router;