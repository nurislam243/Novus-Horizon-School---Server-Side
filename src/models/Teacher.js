const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    // identification
    firstName: { 
        type: String, 
        required: true,
        trim: true 
    },
    lastName: { 
        type: String, 
        required: true,
        trim: true 
    },

    // Contact information
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true 
    },
    phone: { 
        type: String, 
        required: true 
    },

    // Social links
    facebook: {
        type: String,
        trim: true
    },
    twitter: {
        type: String,
        trim: true
    },
    linkedin: {
        type: String,
        trim: true
    },

    // Professional roles and vision
    designation: { 
        type: String, 
        required: true
    },
    vision: { 
        type: String
    },

    // Specialist areas
    specialistIn: { 
        type: [String], 
        default: []
    },

    // Education history
    academicJourney: [
        {
            degree: { type: String },     
            institution: { type: String }
        }
    ],

    // Honors and Awards 
    awards: { 
        type: [String], 
        default: [] 
    },

    // Extra-curricular
    responsibilities: { 
        type: [String], 
        default: []
    }

}, { 
    timestamps: true 
});

module.exports = mongoose.model('Teacher', teacherSchema);