// controllers/examController.js
const ExamConfig = require("../models/ExamConfig");
const Result = require("../models/Result");
const Student = require("../models/Student");

exports.setupBlankResults = async (req, res) => {
  try {
    const { examName, className, academicYear, subjectsConfig } = req.body;

    const examConfig = await ExamConfig.findOneAndUpdate(
      { examName, className, academicYear },
      { subjectsConfig },
      { upsert: true, new: true },
    );

    const students = await Student.find({ class: className });

    if (students.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No students found in this class" });
    }

    const bulkOps = students.map((student) => ({
      updateOne: {
        filter: {
          student: student._id,
          exam: examConfig._id,
        },
        update: {
          $set: {
            student: student._id,
            exam: examConfig._id,
            subjects: subjectsConfig.map((s) => ({
              subjectName: s.name,
              fullMarks: s.fullMarks,
              obtainedMarks: 0,
              grade: "F",
              point: 0,
              isAbsent: false,
            })),
          },
        },
        upsert: true,
      },
    }));

    await Result.bulkWrite(bulkOps);

    res
      .status(200)
      .json({ success: true, message: "Exam Setup & Student Table Ready!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExamConfigs = async (req, res) => {
  try {
    const configs = await ExamConfig.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: configs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateExamStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;

    const updatedExam = await ExamConfig.findByIdAndUpdate(
      id,
      { isPublished: isPublished },
      { new: true }, // আপডেট করার পর নতুন ডাটা রিটার্ন করবে
    );

    if (!updatedExam) {
      return res.status(404).json({ message: "Exam configuration not found" });
    }

    res.status(200).json({
      message: "Status updated successfully",
      data: updatedExam,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.removeSubject = async (req, res) => {
  try {
    const { examName, className, academicYear, subjectName } = req.body;
    // এক্সাম কনফিগারেশন থেকে মুছা
    await ExamConfig.updateOne(
      { examName, class: className, academicYear },
      { $pull: { subjectsConfig: { name: subjectName } } },
    );
    // রেজাল্ট টেবিল থেকেও মুছা
    await Result.updateMany(
      { examName, class: className, academicYear },
      { $pull: { subjects: { subjectName: subjectName } } },
    );
    res
      .status(200)
      .json({ success: true, message: "Subject removed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteExamConfig = async (req, res) => {
  try {
    const { id } = req.params; // ExamConfig-এর MongoDB ID

    // প্রথমে কনফিগারেশনটি খুঁজে বের করা
    const config = await ExamConfig.findById(id);

    if (!config) {
      return res
        .status(404)
        .json({ success: false, message: "Exam configuration not found" });
    }

    // সংশ্লিষ্ট সকল রেজাল্ট ডিলিট করা (একই ExamName, Class, AcademicYear এর ওপর ভিত্তি করে)
    await Result.deleteMany({
      examName: config.examName,
      class: config.class,
      academicYear: config.academicYear,
    });

    // শেষে মেইন কনফিগারেশনটি ডিলিট করা
    await ExamConfig.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Exam and all associated results deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
