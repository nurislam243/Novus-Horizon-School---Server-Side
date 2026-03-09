const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");

router.post("/setup-exam", examController.setupBlankResults);
router.get("/exam-configs", examController.getExamConfigs);
router.get("/exam-details/:examId", examController.getExamDetails);
router.put("/remove-subject", examController.removeSubject);
router.patch('/update-exam-status/:id', examController.updateExamStatus);
router.delete("/delete-exam/:id", examController.deleteExamConfig);



module.exports = router;