const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');

// Create a new teacher
router.post('/add-teacher', teacherController.createTeacher);

// Get all teachers
router.get('/all-teachers', teacherController.getAllTeachers);

module.exports = router;