const mongoose = require('mongoose');


const resultSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student', 
        required: true
    },
    examName: {
        type: String,
        required: true,
        trim: true
    },
    academicYear: {
        type: String,
        required: true
    },
    class: {
        type: String,
        required: true
    },
    subjects: [
        {
            subjectName: { type: String, required: true },
            fullMarks: { type: Number, required: true },
            obtainedMarks: { type: Number, default: 0 },
            grade: { type: String, default: 'F' },
            point: { type: Number, default: 0 },
            isAbsent: { type: Boolean, default: false }
        }
    ],
    totalObtainedMarks: {
        type: Number,
        default: 0
    },
    gpa: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['Pass', 'Fail', 'Absent'],
        default: 'Fail'
    },
    remarks: {
        type: String,
        trim: true
    }
}, { timestamps: true });

resultSchema.index({ student: 1, examName: 1, academicYear: 1, class: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);