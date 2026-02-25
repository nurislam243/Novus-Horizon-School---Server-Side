const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    // Basic Information
    name: { 
        type: String, 
        required: [true, "Student name is required"],
        trim: true 
    },
    roll: { 
        type: Number, 
        required: [true, "Roll number is required"], 
        unique: true 
    },
    studentId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    class: { 
        type: String, 
        required: [true, "Class is required"] 
    },
    section: { 
        type: String, 
        default: "A" 
    },

    // Personal Details
    gender: { 
        type: String, 
        enum: ["Male", "Female", "Other"]
    },
    dateOfBirth: { 
        type: Date 
    },
    bloodGroup: { 
        type: String, 
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] 
    },

    // Contact Information
    email: { 
        type: String, 
        lowercase: true, 
        trim: true 
    },
    phone: { 
        type: String, 
        required: [true, "Phone number is required"] 
    },
    address: { 
        type: String 
    },

    // Account Status
    status: { 
    type: String, 
    enum: ["Active", "Inactive", "Suspended"],
    default: "Active"   
    },

    // Joining Date
    admissionDate: { 
        type: Date, 
        default: Date.now 
    },

}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);