const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

// handles student registration
router.post('/add-student', studentController.createStudent);

// fetches all student records
router.get('/all-students', studentController.getAllStudents);

// delete a student record
router.delete('/delete-student/:id', studentController.deleteStudent);

// update a student record
router.patch('/update-student/:id', studentController.updateStudent);

module.exports = router;