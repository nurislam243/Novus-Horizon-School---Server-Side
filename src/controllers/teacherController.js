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


