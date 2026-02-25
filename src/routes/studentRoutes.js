const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// handles student registration
router.post('/add-student', studentController.createStudent);

// fetches all student records
router.get('/all-students', studentController.getAllStudents);

module.exports = router;