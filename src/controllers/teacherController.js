const Teacher = require('../models/Teacher');

// Create a new teacher profile
exports.createTeacher = async (req, res) => {
    try {
        const teacherData = new Teacher(req.body);
        const savedTeacher = await teacherData.save();
        
        res.status(201).json({
            success: true,
            message: "Teacher profile created successfully",
            data: savedTeacher
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


// Get all teachers
exports.getAllTeachers = async (req, res) => {
    try {
        const teachers = await Teacher.find();
        res.status(200).json({
            success: true,
            count: teachers.length,
            data: teachers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};