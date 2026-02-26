const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');

// Create a new teacher
router.post('/add-teacher', teacherController.createTeacher);

// Get all teachers
router.get('/all-teachers', teacherController.getAllTeachers);

// Get single teacher details
router.get('/teacher/:id', teacherController.getTeacherById);

// Update teacher details
router.patch('/update-teacher/:id', teacherController.updateTeacher);

// Delete teacher
router.delete('/delete-teacher/:id', teacherController.deleteTeacher);

module.exports = router;