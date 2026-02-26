const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');

// Routes
router.post('/add-teacher', teacherController.createTeacher);

module.exports = router;