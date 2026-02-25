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

// Get all students
exports.getAllStudents = async (req, res) => {
    try {
        const students = await Student.find();
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a student
exports.deleteStudent = async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        if (!student) {
            return res.status(404).json({ message: "Student not found!" });
        }
        res.status(200).json({ message: "Student deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};