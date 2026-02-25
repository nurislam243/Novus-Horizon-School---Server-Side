const Student = require('../models/Student');

// Create a new student
exports.createStudent = async (req, res) => {
    try {
        const student = new Student(req.body);
        await student.save();
        res.status(201).json({ message: "Student Added!", student });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};