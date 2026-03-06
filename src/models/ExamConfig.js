// src/models/ExamConfig.js
const mongoose = require('mongoose');

const examConfigSchema = new mongoose.Schema({
    examName: {
        type: String,
        required: true,
        trim: true
    },
    className: {
        type: String,
        required: true
    },
    academicYear: {
        type: String,
        required: true
    },
    subjectsConfig: [
        {
            name: { type: String, required: true },
            fullMarks: { type: Number, default: 100 }
        }
    ],
    isPublished: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

examConfigSchema.index({ examName: 1, className: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('ExamConfig', examConfigSchema);