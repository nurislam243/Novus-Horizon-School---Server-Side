const Result = require('../models/Result');
const Student = require('../models/Student');
const html_to_pdf = require('html-pdf-node');

exports.addBulkResults = async (req, res) => {
    try {
        const { examName, className, academicYear, allResults, subjectsConfig } = req.body;
        const finalData = [];

        allResults.forEach(entry => {
            let hasAtLeastOneInput = false;
            let totalObtained = 0;
            let totalPoints = 0;
            let failCount = 0;
            let tempSubjects = [];

            subjectsConfig.forEach(config => {
                const inputSubject = entry.subjects.find(s => s.subjectName === config.name);
                
                // Check if admin provided marks for this subject
                if (inputSubject && (inputSubject.obtainedMarks !== '' && inputSubject.obtainedMarks !== null)) {
                    hasAtLeastOneInput = true;
                    let obtained = Number(inputSubject.obtainedMarks);
                    totalObtained += obtained;
                    
                    let grade = 'F';
                    let point = 0;
                    const percentage = (obtained / config.fullMarks) * 100;

                    // Grading Logic
                    if (percentage >= 80) { grade = 'A+'; point = 5; }
                    else if (percentage >= 70) { grade = 'A'; point = 4; }
                    else if (percentage >= 60) { grade = 'A-'; point = 3.5; }
                    else if (percentage >= 50) { grade = 'B'; point = 3; }
                    else if (percentage >= 40) { grade = 'C'; point = 2; }
                    else if (percentage >= 33) { grade = 'D'; point = 1; }
                    else { failCount++; }

                    totalPoints += point;

                    tempSubjects.push({
                        subjectName: config.name,
                        fullMarks: config.fullMarks,
                        obtainedMarks: obtained,
                        grade,
                        point,
                        isAbsent: false
                    });
                } else {
                    // Mark as Fail/Absent if no marks are entered
                    failCount++;
                    tempSubjects.push({
                        subjectName: config.name,
                        fullMarks: config.fullMarks,
                        obtainedMarks: 0,
                        grade: 'F',
                        point: 0,
                        isAbsent: true
                    });
                }
            });

            // Average Point (GPA) Calculation
            let gpa = failCount > 0 ? 0 : (totalPoints / subjectsConfig.length).toFixed(2);

            let finalStatus = 'Fail';
            let finalSubjects = tempSubjects;

            // Handle overall status based on participation
            if (!hasAtLeastOneInput) {
                finalStatus = 'Absent';
                finalSubjects = [];
            } else if (failCount === 0) {
                finalStatus = 'Pass';
            }

            finalData.push({
                student: entry.studentOid,
                examName,
                class: className,
                academicYear,
                subjects: finalSubjects,
                totalObtainedMarks: totalObtained,
                gpa: Number(gpa),
                status: finalStatus
            });
        });

        await Result.insertMany(finalData);

        res.status(201).json({ 
            success: true, 
            message: "Bulk results processed successfully" 
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// Get results with dynamic filtering and sorting
exports.getResult = async (req, res) => {
    try {
        const { className, examName, academicYear, studentId, sortBy } = req.query;

        // Set search criteria
        let filter = { class: className, examName, academicYear };
        
        // start custom id logic
        if (studentId) {
            const studentRecord = await Student.findOne({ studentId: studentId });
            
            if (!studentRecord) {
                return res.status(404).json({ success: false, message: "Student ID not found" });
            }
            
            filter.student = studentRecord._id;
        }

        // Determine sorting order (Marks, GPA, or Roll)
        let sortCriteria = {};
        if (sortBy === 'marks') {
            sortCriteria = { totalObtainedMarks: -1 }; 
        } else if (sortBy === 'gpa') {
            sortCriteria = { gpa: -1 }; 
        } else {
            sortCriteria = { 'student.roll': 1 }; 
        }

        // Fetch results and populate student data correctly
        const results = await Result.find(filter)
            .populate('student', 'name roll studentId class section') 
            .sort(sortCriteria);

        if (!results || results.length === 0) {
            return res.status(404).json({ success: false, message: "No results found" });
        }

        // Return object for single student, array for class
        res.status(200).json({ 
            success: true, 
            count: results.length,
            data: studentId ? results[0] : results 
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.downloadPDF = async (req, res) => {
    try {
        const { className, examName, academicYear, studentId } = req.query;
        
        // Define base filter criteria
        let filter = { class: className, examName, academicYear };

        if (studentId) {
            const studentRecord = await Student.findOne({ studentId: studentId });
            if (!studentRecord) return res.status(404).send("Student not found");
            filter.student = studentRecord._id;
        }

        // Fetch data and populate student details
        const results = await Result.find(filter).populate('student', 'name roll studentId');

        if (!results || results.length === 0) {
            return res.status(404).send("No data found for the given criteria");
        }

        // Base64 Logo 
        const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

        let htmlContent = '';

        // Shared Header for both Individual and Class PDF
        const headerHtml = `
            <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px;">
                <img src="${logoBase64}" alt="School Logo" style="width: 80px; height: 80px; margin-bottom: 10px;">
                <h1 style="margin: 0; font-size: 24px;">YOUR SCHOOL NAME</h1>
                <p style="margin: 5px 0;">School Address Line 1, City, Country</p>
                <h3 style="margin: 10px 0; text-transform: uppercase; color: #555;">${studentId ? 'Academic Marksheet' : 'Class Result Sheet'}</h3>
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
                        <p><strong>Exam:</strong> ${examName}</p>
                    </div>
                </div>
                <table border="1" width="100%" style="border-collapse:collapse; text-align:left;">
                    <tr style="background:#4A90E2; color: white;">
                        <th style="padding:10px;">Subject Name</th>
                        <th style="padding:10px;">Obtained Marks</th>
                    </tr>
                    ${r.subjects.map(s => `
                        <tr>
                            <td style="padding:10px; border: 1px solid #ddd;">${s.subjectName}</td>
                            <td style="padding:10px; border: 1px solid #ddd;">${s.obtainedMarks}</td>
                        </tr>
                    `).join('')}
                </table>
                <div style="margin-top:30px; border-top: 1px solid #eee; pt: 10px;">
                    <p><strong>Total Marks:</strong> ${r.totalObtainedMarks}</p>
                    <p><strong>GPA:</strong> ${r.gpa || 'N/A'}</p>
                    <p><strong>Final Status:</strong> <span style="font-weight:bold; color: ${r.status === 'Pass' ? 'green' : 'red'};">${r.status}</span></p>
                </div>
            `;
        } else {
            // Logic for Class Result Sheet
            htmlContent = `
                ${headerHtml}
                <div style="margin-bottom: 10px;">
                    <p><strong>Class:</strong> ${className} | <strong>Exam:</strong> ${examName} | <strong>Year:</strong> ${academicYear}</p>
                </div>
                <table border="1" width="100%" style="border-collapse:collapse; text-align:left;">
                    <thead>
                        <tr style="background:#4A90E2; color: white;">
                            <th style="padding:8px;">Roll</th>
                            <th style="padding:8px;">Student Name</th>
                            <th style="padding:8px;">Total Marks</th>
                            <th style="padding:8px;">GPA</th>
                            <th style="padding:8px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${results.map(r => `
                            <tr>
                                <td style="padding:8px; border: 1px solid #ddd;">${r.student.roll}</td>
                                <td style="padding:8px; border: 1px solid #ddd;">${r.student.name}</td>
                                <td style="padding:8px; border: 1px solid #ddd;">${r.totalObtainedMarks}</td>
                                <td style="padding:8px; border: 1px solid #ddd;">${r.gpa || 'N/A'}</td>
                                <td style="padding:8px; border: 1px solid #ddd; color: ${r.status === 'Pass' ? 'green' : 'red'};">${r.status}</td>
                            </tr>
                        `).join('')}
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
        const file = { content: `<html><body style="font-family: 'Helvetica', sans-serif; padding:10px;">${htmlContent}${footerHtml}</body></html>` };
        const options = { format: 'A4', margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' } };

        html_to_pdf.generatePdf(file, options).then(pdfBuffer => {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Result_${examName}.pdf`);
            res.send(pdfBuffer);
        });

    } catch (error) {
        res.status(500).send("Error generating PDF: " + error.message);
    }
};