const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');

// Route for adding bulk results
router.get('/view-results', resultController.getResult);
router.get('/download-pdf', resultController.downloadPDF);
router.post('/add-bulk', resultController.addBulkResults);
router.put('/update-result', resultController.updateSingleResult);
router.put('/update-bulk', resultController.updateBulkResults);

module.exports = router;