const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');

const getUserRole = async (req, res) => {
    try {
        const email = req.params.email;
        
        const isAdmin = await Admin.findOne({ email });
        if (isAdmin) return res.status(200).json({ role: 'admin' });

        const isTeacher = await Teacher.findOne({ email });
        if (isTeacher) return res.status(200).json({ role: 'teacher' });

        const isStudent = await Student.findOne({ email });
        if (isStudent) return res.status(200).json({ role: 'student' });

        return res.status(404).json({ 
            message: "User record not found. Please contact the administrator." 
        });r

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

module.exports = { getUserRole };