const Teacher = require("../models/Teacher");
const admin = require("firebase-admin");
const serviceAccount = require("../../serviceAccountKey.json");
const PDFDocument = require('pdfkit');

// Firebase initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Create a new teacher profile
exports.createTeacher = async (req, res) => {
  try {
    const { email, phone, name, image, ...otherData } = req.body;

    const userRecord = await admin.auth().createUser({
      email: email,
      password: phone, 
      displayName: name,
      photoURL: image,
    });

    const teacherData = new Teacher({
      ...otherData,
      name,
      phone,
      email,
      image,
      firebaseUid: userRecord.uid,
    });

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


// 
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

    // ১. PDF ডকুমেন্ট সেটআপ
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // ২. রেসপন্স হেডারে PDF সেট করা
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=Teacher_List.pdf");
    doc.pipe(res);

    // ৩. হেডার ডিজাইন (সব পেজেই থাকতে পারে)
    const generateHeader = (doc) => {
        doc.fillColor("#1f2937").fontSize(20).text("INSTITUTION NAME", { align: "center", bold: true });
        doc.fontSize(10).fillColor("#666666").text("Faculty Directory Report", { align: "center" });
        doc.moveDown();
        doc.strokeColor("#eeeeee").moveTo(40, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();
    };

    generateHeader(doc);

    // ৪. টেবিল হেডার ডিজাইন
    const tableTop = 130;
    const itemHeight = 25;
    
    // টেবিল হেডারের ব্যাকগ্রাউন্ড
    doc.rect(40, tableTop, 520, itemHeight).fill("#1f2937");
    
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold");
    doc.text("Name", 50, tableTop + 7);
    doc.text("Email", 180, tableTop + 7);
    doc.text("Phone", 350, tableTop + 7);
    doc.text("Designation", 460, tableTop + 7);

    // ৫. ডাটা রো (Rows) তৈরি করা
    let y = tableTop + itemHeight;
    doc.font("Helvetica").fillColor("#333333");

    teachers.forEach((t, index) => {
        // নতুন পেজ দরকার কি না চেক করা
        if (y > 750) {
            doc.addPage();
            generateHeader(doc);
            y = 150; // নতুন পেজের জন্য পজিশন
        }

        // প্রতি অল্টারনেট রো-তে হালকা ব্যাকগ্রাউন্ড (Zebra Stripes)
        if (index % 2 !== 0) {
            doc.rect(40, y, 520, itemHeight).fill("#f9fafb");
        }

        doc.fillColor("#333333");
        doc.text(`${t.firstName || ''} ${t.lastName || ''}`, 50, y + 7, { width: 120, lineBreak: false });
        doc.text(t.email || 'N/A', 180, y + 7, { width: 160, lineBreak: false });
        doc.text(t.phone || 'N/A', 350, y + 7);
        doc.text(t.designation || 'N/A', 460, y + 7);

        y += itemHeight;
    });

    // ৬. ফুটার যোগ করা
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor("#999999").text(
            `Generated on: ${new Date().toLocaleString()} | Page ${i + 1}`,
            40,
            doc.page.height - 50,
            { align: "center" }
        );
    }

    // ৭. শেষ করা
    doc.end();

  } catch (error) {
    console.error("PDF Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Server Error: " + error.message });
    }
  }
};
