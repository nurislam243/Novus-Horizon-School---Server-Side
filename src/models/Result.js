const mongoose = require("mongoose");

const resultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamConfig",
      required: true,
    },
    subjects: [
      {
        subjectName: { type: String, required: true },
        fullMarks: { type: Number, required: true },
        obtainedMarks: { type: Number, default: 0 },
        grade: { type: String, default: "F" },
        point: { type: Number, default: 0 },
        isAbsent: { type: Boolean, default: false },
      },
    ],
    totalObtainedMarks: {
      type: Number,
      default: 0,
    },
    gpa: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Pass", "Fail", "Absent"],
      default: "Fail",
    },
    remarks: {
      type: String,
      trim: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

resultSchema.index({ student: 1, exam: 1 }, { unique: true });

module.exports = mongoose.model("Result", resultSchema);
