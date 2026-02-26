const Result = require('../models/Result');

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
                student: entry.studentId,
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
        if (studentId) filter.student = studentId;

        // Determine sorting order (Marks, GPA, or Roll)
        let sortCriteria = {};
        if (sortBy === 'marks') {
            sortCriteria = { totalObtainedMarks: -1 }; 
        } else if (sortBy === 'gpa') {
            sortCriteria = { gpa: -1 }; 
        } else {
            sortCriteria = { 'student.rollNumber': 1 }; 
        }

        // Fetch results and populate student data
        const results = await Result.find(filter)
            .populate('student', 'firstName lastName rollNumber class section')
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