// server/routes/student.js - Student-specific API routes

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');

// JWT authentication middleware
const protect = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
    const token = authHeader.replace('Bearer ', '');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        console.error('JWT verification failed:', err.message);
        return res.status(401).json({ message: 'Token is not valid' });
    }
};

// Role-based authorization middleware for students
const authorizeStudent = (req, res, next) => {
    if (!req.user || req.user.role !== 'student') {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
    }
    next();
};

// @route GET /api/student/profile
// @desc Get student profile data for logged-in student
router.get('/profile', protect, authorizeStudent, (req, res) => {
    const studentId = req.user.id;
    const sql = `SELECT student_name, email, major, university, skills, created_at FROM students WHERE student_id = ?`;
    db.query(sql, [studentId], async (err, results) => {
        if (err) { 
            console.error('Error fetching student profile:', err); 
            return res.status(500).json({ message: 'Failed to fetch student profile.' }); 
        }
        if (results.length === 0) { 
            return res.status(404).json({ message: 'Student profile not found.' }); 
        }
        const studentData = results[0];
        
        // Count how many applications the student has made
        const applicationCountSql = `SELECT COUNT(*) AS count FROM applications WHERE student_id = ?`;
        db.query(applicationCountSql, [studentId], (appErr, appResults) => {
            if (appErr) { 
                console.error('Error counting applications:', appErr); 
                studentData.applicationCount = 0; 
            } else { 
                studentData.applicationCount = appResults[0].count; 
            }
            studentData.savedCount = 0; // Placeholder for future saved internships feature
            res.json(studentData);
        });
    });
});

// @route PUT /api/student/profile
// @desc Update student profile data for logged-in student
router.put('/profile', protect, authorizeStudent, (req, res) => {
    const studentId = req.user.id;
    const { student_name, email, major, university, skills } = req.body;
    
    // Check if email is already used by another student
    if (email) {
        db.query('SELECT student_id FROM students WHERE email = ? AND student_id != ?', [email, studentId], (err, results) => {
            if (err) { 
                console.error('Email check error:', err); 
                return res.status(500).json({ message: 'Server error during email check.' }); 
            }
            if (results.length > 0) { 
                return res.status(400).json({ message: 'Email already in use by another student.' }); 
            }
            
            updateStudentProfileInDB();
        });
    } else {
        updateStudentProfileInDB();
    }

    function updateStudentProfileInDB() {
        const sql = `
            UPDATE students
            SET student_name = ?, email = ?, major = ?, university = ?, skills = ?
            WHERE student_id = ?
        `;
        const values = [student_name, email, major, university, skills, studentId];
        db.query(sql, values, (err, result) => {
            if (err) { 
                console.error('Error updating student profile:', err); 
                return res.status(500).json({ message: 'Failed to update student profile.' }); 
            }
            if (result.affectedRows === 0) { 
                return res.status(404).json({ message: 'Student not found or no changes made.' }); 
            }
            res.json({ message: 'Student profile updated successfully!' });
        });
    }
});

// Internship browsing routes
router.get('/internships', protect, authorizeStudent, async (req, res) => {
    const sql = `
        SELECT i.internship_id, i.title, i.location, i.type, i.description, i.stipend, i.duration,
               DATE_FORMAT(i.deadline, '%Y-%m-%d') as deadline,
               c.company_name, c.company_website
        FROM internships i
        JOIN companies c ON i.company_id = c.company_id
        WHERE i.deadline >= CURDATE()
        ORDER BY i.created_at DESC
    `;
    try {
        const [results] = await db.promise().query(sql);
        res.json(results);
    } catch (err) {
        console.error('Error fetching student internships:', err);
        res.status(500).json({ message: 'Failed to fetch internships.' });
    }
});

// Application submission route
router.post('/apply/:internship_id', protect, authorizeStudent, async (req, res) => {
    const internshipId = req.params.internship_id;
    const studentId = req.user.id;
    const resumeFile = req.body.resume_file || 'default_resume.pdf';
    
    try {
        // Check if the internship exists
        const internshipSql = `SELECT company_id FROM internships WHERE internship_id = ?`;
        const [internshipResults] = await db.promise().query(internshipSql, [internshipId]);
        if (internshipResults.length === 0) { 
            return res.status(404).json({ message: 'Internship not found.' }); 
        }
        const employerId = internshipResults[0].company_id;

        // Check if student has already applied
        const checkApplicationSql = `SELECT * FROM applications WHERE student_id = ? AND internship_id = ?`;
        const [existingApplication] = await db.promise().query(checkApplicationSql, [studentId, internshipId]);
        if (existingApplication.length > 0) { 
            return res.status(400).json({ message: 'You have already applied to this internship.' }); 
        }

        // Submit the application
        const insertSql = `INSERT INTO applications (internship_id, student_id, resume_file, employer) VALUES (?, ?, ?, ?)`;
        const insertValues = [internshipId, studentId, resumeFile, employerId];

        const [result] = await db.promise().query(insertSql, insertValues);
        res.status(201).json({ message: 'Application submitted successfully!', applicationId: result.insertId });
    } catch (err) {
        console.error('Application submission server error:', err.message);
        if (err.code === 'ER_DUP_ENTRY') { 
            return res.status(400).json({ message: 'You have already applied to this internship.' }); 
        }
        res.status(500).json({ message: 'Server Error' });
    }
});

// Student application tracking routes
router.get('/applications/my', protect, authorizeStudent, async (req, res) => {
    const studentId = req.user.id;
    const sql = `
        SELECT
            a.application_id,
            a.status,
            DATE_FORMAT(a.applied_at, '%Y-%m-%d') as applied_at,
            i.internship_id,
            i.title AS internship_title,
            i.location AS internship_location,
            c.company_name
        FROM applications a
        JOIN internships i ON a.internship_id = i.internship_id
        JOIN companies c ON i.company_id = c.company_id
        WHERE a.student_id = ?
        ORDER BY a.applied_at DESC
    `;
    try {
        const [results] = await db.promise().query(sql, [studentId]);
        res.json(results);
    } catch (err) {
        console.error('Error fetching student applications:', err);
        res.status(500).json({ message: 'Failed to fetch applications.' });
    }
});

module.exports = router;
