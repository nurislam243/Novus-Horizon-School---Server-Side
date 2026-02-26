const Result = require('../models/Result');

exports.addBulkResults = async (req, res) => {
    try {
        const { examName, className, academicYear, allResults, subjectsConfig } = req.body;
        const finalData = [];

        allResults.forEach(entry => {
            let hasAtLeastOneInput = false;
            let totalObtained = 0;
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

                    // Grading logic
                    if (percentage >= 80) { grade = 'A+'; point = 5; }
                    else if (percentage >= 70) { grade = 'A'; point = 4; }
                    else if (percentage >= 60) { grade = 'A-'; point = 3.5; }
                    else if (percentage >= 33) { grade = 'D'; point = 1; }
                    else { failCount++; } 

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