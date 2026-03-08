const Result = require("../models/Result");
const Student = require("../models/Student");
const ExamConfig = require("../models/ExamConfig");
const html_to_pdf = require("html-pdf-node");

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
      const studentRecord = await Student.findOne({
        studentId: studentId,
      }).select("_id");
      if (!studentRecord) return res.status(404).send("Student not found");
      filter.student = studentRecord._id;
    }

    // Fetch data and populate student details
    const results = await Result.find(filter)
      .populate("student", "name roll studentId")
      .populate("exam", "examName className academicYear");

    if (!results || results.length === 0) {
      return res.status(404).send("No data found for the given criteria");
    }

    if (!studentId && sortBy) {
      if (sortBy === "merit") {
        results.sort((a, b) => {
          if (a.status === "Pass" && b.status !== "Pass") return -1;
          if (a.status !== "Pass" && b.status === "Pass") return 1;

          if (b.gpa !== a.gpa) return b.gpa - a.gpa;

          if (b.totalObtainedMarks !== a.totalObtainedMarks) {
            return b.totalObtainedMarks - a.totalObtainedMarks;
          }

          return (a.student?.roll || 0) - (b.student?.roll || 0);
        });
      }else if (sortBy === "marks") {
        results.sort((a, b) => b.totalObtainedMarks - a.totalObtainedMarks);
      } else if (sortBy === "gpa") {
        results.sort((a, b) => b.gpa - a.gpa);
      } else if (sortBy === "roll") {
        results.sort((a, b) => (a.student?.roll || 0) - (b.student?.roll || 0));
      }
    }

    const r = results[0];

    // Base64 Logo
    const logoBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    let htmlContent = "";

    const headerHtml = `
            <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
                <img src="${logoBase64}" alt="School Logo" style="width: 80px; height: 80px; margin-bottom: 10px;">
                <h1 style="margin: 0; font-size: 24px;">YOUR SCHOOL NAME</h1>
                <p style="margin: 5px 0;">School Address Line 1, City, Country</p>
                <h3 style="margin: 10px 0; text-transform: uppercase; color: #555;">${studentId ? "Academic Marksheet" : "Class Result Sheet"}</h3>
            </div>
        `;

    if (studentId) {
      // Logic for Individual Marksheet
      const r = results[0];
      htmlContent = `
                ${headerHtml}
                <div style="margin-bottom: 20px; display: flex; justify-content: space-between;">
                    <div>
                        <p><strong>Student Name:</strong> ${r.student.name}</p>
                        <p><strong>Roll Number:</strong> ${r.student.roll}</p>
                    </div>
                    <div style="text-align: right;">
                        <p><strong>Class:</strong> ${r.class}</p>
                        <p><strong>Exam:</strong> ${r.exam.examName}</p>
                    </div>
                </div>
                <table border="1" width="100%" style="border-collapse:collapse; text-align:left;">
                    <tr style="background:#4A90E2; color: white;">
                        <th style="padding:10px;">Subject Name</th>
                        <th style="padding:10px;">Obtained Marks</th>
                    </tr>
                    ${r.subjects
                      .map(
                        (s) => `
                        <tr>
                            <td style="padding:10px; border: 1px solid #ddd;">${s.subjectName}</td>
                            <td style="padding:10px; border: 1px solid #ddd;">${s.obtainedMarks}</td>
                        </tr>
                    `,
                      )
                      .join("")}
                </table>
                <div style="margin-top:30px; border-top: 1px solid #eee; pt: 10px;">
                    <p><strong>Total Marks:</strong> ${r.totalObtainedMarks}</p>
                    <p><strong>GPA:</strong> ${r.gpa || "N/A"}</p>
                    <p><strong>Final Status:</strong> <span style="font-weight:bold; color: ${r.status === "Pass" ? "green" : "red"};">${r.status}</span></p>
                </div>
            `;
    } else {
      // Logic for Class Result Sheet
      htmlContent = `
                ${headerHtml}
                <div style="margin-bottom: 10px;">
                    <p><strong>Class:</strong> ${r.exam.className} | <strong>Exam:</strong> ${r.exam.examName} | <strong>Year:</strong> ${r.exam.academicYear}</p>
                </div>
                <table border="1" width="100%" style="border-collapse:collapse; text-align:left;">
                    <thead>
                        <tr style="background:#4A90E2; color: white;">
                            <th style="padding:8px;">Rank</th>
                            <th style="padding:8px;">Roll</th>
                            <th style="padding:8px;">Student Name</th>
                            <th style="padding:8px;">Total Marks</th>
                            <th style="padding:8px;">GPA</th>
                            <th style="padding:8px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results
                          .map(
                            (r, idx) => `
                            <tr>
                                <td style="padding:8px; border: 1px solid #ddd; text-align: center;">${idx + 1}</td> 
                                <td style="padding:8px; border: 1px solid #ddd;">${r.student.roll}</td>
                                <td style="padding:8px; border: 1px solid #ddd;">${r.student.name}</td>
                                <td style="padding:8px; border: 1px solid #ddd;">${r.totalObtainedMarks}</td>
                                <td style="padding:8px; border: 1px solid #ddd;">${r.gpa || "N/A"}</td>
                                <td style="padding:8px; border: 1px solid #ddd; color: ${r.status === "Pass" ? "green" : "red"};">${r.status}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            `;
    }

    // Signature Footer
    const footerHtml = `
            <div style="margin-top: 50px; display: flex; justify-content: space-between;">
                <div style="text-align: center; width: 150px; border-top: 1px solid #000;">Class Teacher</div>
                <div style="text-align: center; width: 150px; border-top: 1px solid #000;">Headmaster</div>
            </div>
        `;

    // PDF Generation
    const file = {
      content: `<html><body style="font-family: 'Helvetica', sans-serif; padding:10px;">${htmlContent}${footerHtml}</body></html>`,
    };
    const options = {
      format: "A4",
      margin: { top: "40px", bottom: "40px", left: "40px", right: "40px" },
    };

    html_to_pdf.generatePdf(file, options).then((pdfBuffer) => {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Result_${r.exam.examName}.pdf`,
      );
      res.send(pdfBuffer);
    });
  } catch (error) {
    res.status(500).send("Error generating PDF: " + error.message);
  }
};
