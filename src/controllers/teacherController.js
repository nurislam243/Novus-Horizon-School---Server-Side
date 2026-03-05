const Teacher = require("../models/Teacher");
const html_to_pdf = require("html-pdf-node");

// Create a new teacher profile
exports.createTeacher = async (req, res) => {
  try {
    const teacherData = new Teacher(req.body);
    const savedTeacher = await teacherData.save();

    res.status(201).json({
      success: true,
      message: "Teacher profile created successfully",
      data: savedTeacher,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all teachers
exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a single teacher by ID
exports.getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    res.status(200).json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update teacher profile
exports.updateTeacher = async (req, res) => {
  try {
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    if (!updatedTeacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      data: updatedTeacher,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete teacher profile
exports.deleteTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Teacher profile deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// downloadPDF for Teacher
exports.downloadTeachersPDF = async (req, res) => {
  try {
    const { searchTerm } = req.query;
    let filter = {};

    if (searchTerm && searchTerm.trim() !== "") {
      filter.$or = [
        { firstName: { $regex: searchTerm, $options: "i" } },
        { lastName: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { designation: { $regex: searchTerm, $options: "i" } },
      ];
    }

    const teachers = await Teacher.find(filter).sort({ firstName: 1 });

    if (!teachers || teachers.length === 0) {
      return res.status(404).json({ message: "No teachers found" });
    }

    const logoBase64 = "data:image/png;base64,...";

    let htmlContent = `
            <html>
            <body style="font-family: sans-serif; padding:20px;">
                <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
                    <h1 style="margin: 0; font-size: 22px;">INSTITUTION NAME</h1>
                    <p>Faculty Directory Report</p>
                    <p style="font-size: 12px; color: #666;">Total Teachers: ${teachers.length}</p>
                </div>
                <table border="1" width="100%" style="border-collapse:collapse; font-size: 12px;">
                    <thead>
                        <tr style="background:#1f2937; color: white;">
                            <th style="padding:10px;">Name</th>
                            <th style="padding:10px;">Email</th>
                            <th style="padding:10px;">Phone</th>
                            <th style="padding:10px;">Designation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${teachers
                          .map(
                            (t) => `
                            <tr>
                                <td style="padding:8px;">${t.firstName} ${t.lastName}</td>
                                <td style="padding:8px;">${t.email}</td>
                                <td style="padding:8px;">${t.phone}</td>
                                <td style="padding:8px;">${t.designation}</td>
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

    const pdfBuffer = await html_to_pdf.generatePdf(file, options);

    res.setHeader("Content-Type", "application/pdf");
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Error:", error);
    res.status(500).json({ message: "Server Error: " + error.message });
  }
};
