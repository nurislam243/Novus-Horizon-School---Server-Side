const Student = require("../models/Student");
const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");
const html_to_pdf = require("html-pdf-node");

// Firebase initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Create a new student
exports.createStudent = async (req, res) => {
  try {
    const { email, name, phone, image } = req.body;

    // create user in firebase
    const userRecord = await admin.auth().createUser({
      email: email,
      password: phone,
      displayName: name,
      photoURL: image,
    });

    // Stduent data save in mongodb
    const student = new Student({
      ...req.body,
      firebaseUid: userRecord.uid,
    });

    await student.save();

    res.status(201).json({
      success: true,
      message: "Student Added!",
      student,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get all students
exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find();
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a student
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found!" });
    }
    res.status(200).json({ message: "Student deleted successfully!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update student Details
exports.updateStudent = async (req, res) => {
  try {
    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found!" });
    }

    res.status(200).json({ message: "Update successfully!", updatedStudent });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// downloadPDF for student
exports.downloadStudentPDF = async (req, res) => {
  try {
    const { searchTerm, className, status } = req.query;
    let filter = {};

    if (className && className !== "") filter.class = className;

    if (status && status !== "") filter.status = status;

    if (searchTerm && searchTerm.trim() !== "") {
      filter.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { studentId: { $regex: searchTerm, $options: "i" } },
      ];
      if (!isNaN(searchTerm)) filter.$or.push({ roll: Number(searchTerm) });
    }

    const students = await Student.find(filter).sort({ roll: 1 });

    if (!students || students.length === 0) {
      return res.status(404).json({ message: "No students found" });
    }

    const logoBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

    let htmlContent = `
            <html>
            <body style="font-family: sans-serif; padding:20px;">
                <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
                    <img src="${logoBase64}" alt="Logo" style="width: 60px; height: 60px;">
                    <h1 style="margin: 0; font-size: 22px;">YOUR SCHOOL NAME</h1>
                    <p>Student Enrollment Report</p>
                    <p style="font-size: 12px; color: #666;">Filter: ${className ? "Class " + className : "All"} | Total: ${students.length}</p>
                </div>
                <table border="1" width="100%" style="border-collapse:collapse; font-size: 12px;">
                    <thead>
                        <tr style="background:#1f2937; color: white;">
                            <th style="padding:10px;">Roll</th>
                            <th style="padding:10px;">Name</th>
                            <th style="padding:10px;">Student ID</th>
                            <th style="padding:10px;">Phone</th>
                            <th style="padding:10px;">Class</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${students
                          .map(
                            (s) => `
                            <tr>
                                <td style="padding:8px;">${s.roll}</td>
                                <td style="padding:8px;">${s.name}</td>
                                <td style="padding:8px;">${s.studentId}</td>
                                <td style="padding:8px;">${s.phone}</td>
                                <td style="padding:8px;">Class ${s.class}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                </table>
            </body>
            </html>`;

    let options = { format: "A4", margin: { top: "20px", bottom: "20px" } };
    let file = { content: htmlContent };

    // generatePdf
    const pdfBuffer = await html_to_pdf.generatePdf(file, options);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Student_List.pdf",
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Error:", error);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};
