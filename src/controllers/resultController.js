const Result = require("../models/Result");
const Student = require("../models/Student");
const ExamConfig = require("../models/ExamConfig");
const PDFDocument = require("pdfkit");

// Calculate Result
const calculateFinalResult = (inputSubjects, subjectsConfig) => {
  let hasAtLeastOneInput = false;
  let totalObtained = 0;
  let totalPoints = 0;
  let failCount = 0;
  let tempSubjects = [];

  subjectsConfig.forEach((config) => {
    const inputSubject = inputSubjects.find(
      (s) => s.subjectName === config.name,
    );

    // Process marks if provided
    if (
      inputSubject &&
      inputSubject.obtainedMarks !== "" &&
      inputSubject.obtainedMarks !== null
    ) {
      hasAtLeastOneInput = true;
      let obtained = Number(inputSubject.obtainedMarks);
      totalObtained += obtained;

      let grade = "F";
      let point = 0;
      const percentage = (obtained / config.fullMarks) * 100;

      // Grading Logic
      if (percentage >= 80) {
        grade = "A+";
        point = 5;
      } else if (percentage >= 70) {
        grade = "A";
        point = 4;
      } else if (percentage >= 60) {
        grade = "A-";
        point = 3.5;
      } else if (percentage >= 50) {
        grade = "B";
        point = 3;
      } else if (percentage >= 40) {
        grade = "C";
        point = 2;
      } else if (percentage >= 33) {
        grade = "D";
        point = 1;
      } else {
        failCount++;
        point = 0;
      }

      totalPoints += point;
      tempSubjects.push({
        subjectName: config.name,
        fullMarks: config.fullMarks,
        obtainedMarks: obtained,
        grade,
        point,
        isAbsent: false,
      });
    } else {
      // Mark as Fail/Absent if no marks are entered
      failCount++;
      tempSubjects.push({
        subjectName: config.name,
        fullMarks: config.fullMarks,
        obtainedMarks: 0,
        grade: "F",
        point: 0,
        isAbsent: true,
      });
    }
  });

  // Average Point (GPA) Calculation
  let gpa =
    failCount > 0 ? 0 : (totalPoints / subjectsConfig.length).toFixed(2);
  let status = !hasAtLeastOneInput
    ? "Absent"
    : failCount === 0
      ? "Pass"
      : "Fail";

  return {
    subjects: !hasAtLeastOneInput ? [] : tempSubjects,
    totalObtainedMarks: totalObtained,
    gpa: Number(gpa),
    status,
  };
};

// Get View Result Based On User Search
exports.getViewResults = async (req, res) => {
  try {
    const { academicYear, examName, className, studentId } = req.query;

    const ExamConfig = require("../models/ExamConfig");
    const exam = await ExamConfig.findOne({
      examName,
      className,
      academicYear,
    });

    if (!exam) {
      return res
        .status(404)
        .json({ success: false, message: "Exam configuration not found" });
    }

    let query = { exam: exam._id };

    if (studentId) {
      const Student = require("../models/Student");
      const targetStudent = await Student.findOne({ studentId: studentId });

      if (!targetStudent) {
        return res
          .status(404)
          .json({ success: false, message: "Student not found" });
      }
      query.student = targetStudent._id;
    }

    const results = await Result.find(query)
      .populate("student")
      .populate("exam")
      .sort({ totalObtainedMarks: -1 });

    if (studentId) {
      return res.status(200).json({ success: true, data: results[0] || null });
    } else {
      return res.status(200).json({ success: true, data: results });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Results Data For Edit
exports.getEditResult = async (req, res) => {
  try {
    const { examId, studentId, className } = req.query;

    let filter = { exam: examId };

    if (className) {
      filter.class = className;
    }

    if (studentId) {
      const studentRecord = await Student.findOne({ studentId: studentId });
      if (!studentRecord)
        return res.status(404).json({ message: "Student not found" });
      filter.student = studentRecord._id;
    }

    const results = await Result.find(filter)
      .populate("student", "name roll studentId")
      .populate("exam", "examName className academicYear");

    if (!results || results.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No results found" });
    }

    res.status(200).json({
      success: true,
      count: results.length,
      data: studentId ? results[0] : results,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Save Bulk Results
exports.saveBulkResults = async (req, res) => {
  try {
    const { examId, allResults, subjectsConfig } = req.body;

    const bulkOps = allResults.map((entry) => {
      // রেজাল্ট ক্যালকুলেট করুন
      const calculated = calculateFinalResult(entry.subjects, subjectsConfig);

      return {
        updateOne: {
          // স্টুডেন্ট এবং এক্সাম আইডি দিয়ে চেক করবে রেকর্ডটি আছে কি না
          filter: { student: entry.studentOid, exam: examId },
          // রেকর্ড থাকলে আপডেট হবে, না থাকলে নতুন তৈরি হবে
          update: {
            $set: {
              ...calculated,
              student: entry.studentOid,
              exam: examId,
            },
          },
          upsert: true,
        },
      };
    });

    await Result.bulkWrite(bulkOps);

    res.status(200).json({
      success: true,
      message: "Results saved/updated successfully!",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// downloadPDF result
exports.downloadPDF = async (req, res) => {
  try {
    const { examId, studentId, className, examName, academicYear, sortBy } =
      req.query;
    let filter = {};

    // Filtering Logic
    if (examId) {
      filter.exam = examId;
    } else {
      const ExamConfig = require("../models/ExamConfig");
      const exam = await ExamConfig.findOne({
        examName,
        className,
        academicYear,
      });
      if (!exam) return res.status(404).send("Exam not found");
      filter.exam = exam._id;
    }

    if (studentId) {
      const studentRecord = await Student.findOne({ studentId }).select("_id");
      if (!studentRecord) return res.status(404).send("Student not found");
      filter.student = studentRecord._id;
    }

    const results = await Result.find(filter)
      .populate("student", "name roll studentId")
      .populate("exam", "examName className academicYear");

    if (!results || results.length === 0)
      return res.status(404).send("No data found");

    // Sorting Logic
    if (!studentId && sortBy) {
      if (sortBy === "merit") {
        results.sort((a, b) => {
          if (a.status === "Pass" && b.status !== "Pass") return -1;
          if (a.status !== "Pass" && b.status === "Pass") return 1;
          if (b.gpa !== a.gpa) return b.gpa - a.gpa;
          if (b.totalObtainedMarks !== a.totalObtainedMarks)
            return b.totalObtainedMarks - a.totalObtainedMarks;
          return (a.student?.roll || 0) - (b.student?.roll || 0);
        });
      } else if (sortBy === "marks") {
        results.sort((a, b) => b.totalObtainedMarks - a.totalObtainedMarks);
      } else if (sortBy === "gpa") {
        results.sort((a, b) => b.gpa - a.gpa);
      } else if (sortBy === "roll") {
        results.sort((a, b) => (a.student?.roll || 0) - (b.student?.roll || 0));
      }
    }

    const firstResult = results[0];

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Result_${firstResult.exam.examName}.pdf`,
    );
    doc.pipe(res);

    // Header Function
    const drawHeader = () => {
      doc
        .fillColor("#1f2937")
        .fontSize(20)
        .text("YOUR SCHOOL NAME", { align: "center", bold: true });
      doc
        .fontSize(10)
        .fillColor("#666")
        .text("School Address Line 1, City, Country", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .fillColor("#333")
        .text(studentId ? "ACADEMIC MARKSHEET" : "CLASS RESULT SHEET", {
          align: "center",
          underline: true,
        });
      doc.moveDown();
      doc.strokeColor("#333").moveTo(40, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
    };

    drawHeader();

    if (studentId) {
      const r = results[0];
      doc.fontSize(11).fillColor("#000");
      doc.text(`Student Name: ${r.student.name}`, 40, doc.y);
      doc.text(`Class: ${r.class}`, 400, doc.y - 12);
      doc.text(`Roll Number: ${r.student.roll}`, 40, doc.y + 5);
      doc.text(`Exam: ${r.exam.examName}`, 400, doc.y - 12);
      doc.moveDown(2);

      // Subject Table Header
      let currentY = doc.y;
      doc.rect(40, currentY, 520, 25).fill("#4A90E2");
      doc.fillColor("#fff").text("Subject Name", 50, currentY + 7);
      doc.text("Obtained Marks", 400, currentY + 7);

      currentY += 25;
      doc.fillColor("#000");
      r.subjects.forEach((s) => {
        doc.rect(40, currentY, 520, 25).strokeColor("#ddd").stroke();
        doc.text(s.subjectName, 50, currentY + 7);
        doc.text(s.obtainedMarks.toString(), 400, currentY + 7);
        currentY += 25;
      });

      doc.moveDown();
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(`Total Marks: ${r.totalObtainedMarks}`);
      doc.text(`GPA: ${r.gpa || "N/A"}`);
      doc
        .fillColor(r.status === "Pass" ? "green" : "red")
        .text(`Final Status: ${r.status}`);
    } else {
      // Class Result Sheet
      doc
        .fontSize(10)
        .text(
          `Class: ${firstResult.exam.className} | Exam: ${firstResult.exam.examName} | Year: ${firstResult.exam.academicYear}`,
          { align: "left" },
        );
      doc.moveDown();

      let currentY = doc.y;
      const tableHeaders = [
        "Rank",
        "Roll",
        "Student Name",
        "Marks",
        "GPA",
        "Status",
      ];
      const colWidths = [40, 50, 180, 80, 80, 90];
      const startX = 40;

      // Table Header
      doc.rect(startX, currentY, 520, 25).fill("#4A90E2");
      doc.fillColor("#fff").font("Helvetica-Bold");
      let tempX = startX;
      tableHeaders.forEach((h, i) => {
        doc.text(h, tempX + 5, currentY + 7);
        tempX += colWidths[i];
      });

      currentY += 25;
      doc.fillColor("#000").font("Helvetica");

      results.forEach((r, idx) => {
        if (currentY > 750) {
          doc.addPage();
          drawHeader();
          currentY = 150;
        }

        if (idx % 2 !== 0) doc.rect(startX, currentY, 520, 25).fill("#f9f9f9");

        doc.fillColor("#333");
        let rowX = startX;
        doc.text((idx + 1).toString(), rowX + 5, currentY + 7);
        rowX += colWidths[0];
        doc.text(r.student.roll.toString(), rowX + 5, currentY + 7);
        rowX += colWidths[1];
        doc.text(r.student.name, rowX + 5, currentY + 7);
        rowX += colWidths[2];
        doc.text(r.totalObtainedMarks.toString(), rowX + 5, currentY + 7);
        rowX += colWidths[3];
        doc.text(r.gpa?.toString() || "N/A", rowX + 5, currentY + 7);
        rowX += colWidths[4];

        const statusColor = r.status === "Pass" ? "green" : "red";
        doc.fillColor(statusColor).text(r.status, rowX + 5, currentY + 7);

        currentY += 25;
      });
    }

    // Signature Footer
    const footerY = doc.page.height - 100;
    doc.strokeColor("#000").moveTo(40, footerY).lineTo(160, footerY).stroke();
    doc.strokeColor("#000").moveTo(430, footerY).lineTo(550, footerY).stroke();
    doc
      .fontSize(10)
      .fillColor("#000")
      .text("Class Teacher", 40, footerY + 5, { width: 120, align: "center" });
    doc.text("Headmaster", 430, footerY + 5, { width: 120, align: "center" });

    doc.end();
  } catch (error) {
    console.error("PDF Error:", error);
    if (!res.headersSent) {
      res.status(500).send("Error generating PDF: " + error.message);
    }
  }
};
