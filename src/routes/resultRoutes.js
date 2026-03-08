const express = require("express");
const router = express.Router();
const resultController = require("../controllers/resultController");

// Route for adding bulk results
router.get("/get-edit-results", resultController.getEditResult);
router.get("/get-view-results", resultController.getViewResults);
router.get("/download-pdf", resultController.downloadPDF);

// router.put("/update-result", resultController.updateSingleResult);

router.post("/save-bulk", resultController.saveBulkResults);

// router.put("/update-bulk", resultController.updateBulkResults);
// router.delete("/delete-class-results", resultController.deleteClassResults);

module.exports = router;
