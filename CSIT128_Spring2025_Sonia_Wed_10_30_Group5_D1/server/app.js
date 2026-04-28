// server/app.js - Main server file for the InternBase website

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup - Set up basic server features
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// JWT authentication middleware - Check if user is logged in
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

// Role-based authorization middleware - Check if user has permission to access certain features
const authorize = (roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
    }
    next();
};

// Health check endpoint - Check if server is working
app.get('/', (req, res) => {
    res.send('Internship Website Backend API is running!');
});

// --- Authentication Routes - User Account Management ---
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role, companyName } = req.body;
    if (!name || !email || !password || !role) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    try {
        const checkSql = `SELECT * FROM ${role === 'student' ? 'students' : 'companies'} WHERE email = ?`;
        db.query(checkSql, [email], async (err, results) => {
            if (err) { console.error('Database query error:', err); return res.status(500).json({ message: 'Server error during registration check.' }); }
            if (results.length > 0) { return res.status(400).json({ message: 'User already exists with this email.' }); }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            let insertSql;
            let insertValues;
            if (role === 'student') {
                insertSql = 'INSERT INTO students (student_name, email, password) VALUES (?, ?, ?)';
                insertValues = [name, email, hashedPassword];
            } else if (role === 'employer') {
                if (!companyName) { return res.status(400).json({ message: 'Company name is required for employer registration.' }); }
                insertSql = 'INSERT INTO companies (company_name, email, password) VALUES (?, ?, ?)';
                insertValues = [companyName, email, hashedPassword];
            } else { return res.status(400).json({ message: 'Invalid user role.' }); }

            db.query(insertSql, insertValues, (err, result) => {
                if (err) { console.error('Database insertion error:', err); return res.status(500).json({ message: 'Registration failed.' }); }
                const userId = result.insertId;
                const payload = { user: { id: userId, role: role, name: name, email: email } };
                jwt.sign( payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (jwtErr, token) => {
                    if (jwtErr) { console.error('JWT signing error:', jwtErr); return res.status(500).json({ message: 'Token generation failed.' }); }
                    res.status(201).json({ message: 'User registered successfully!', token, role: role, name: name, email: email, userId: userId });
                });
            });
        });
    } catch (err) {
        console.error('Registration server error:', err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password || !role) { return res.status(400).json({ message: 'Email, password, and role are required.' }); }
    try {
        const tableName = role === 'student' ? 'students' : 'companies';
        const nameColumn = role === 'student' ? 'student_name' : 'company_name';
        const idColumn = role === 'student' ? 'student_id' : 'company_id';
        const sql = `SELECT ${idColumn} AS id, ${nameColumn} AS name, email, password, '${role}' AS role FROM ${tableName} WHERE email = ?`;

        db.query(sql, [email], async (err, results) => {
            if (err) { console.error('Database query error:', err); return res.status(500).json({ message: 'Server error during login.' }); }
            if (results.length === 0) { return res.status(401).json({ message: 'Invalid credentials: User not found.' }); }
            const user = results[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) { return res.status(401).json({ message: 'Invalid credentials: Password does not match.' }); }
            const payload = { user: { id: user.id, role: user.role, name: user.name, email: user.email } };
            jwt.sign( payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (jwtErr, token) => {
                if (jwtErr) { console.error('JWT signing error:', jwtErr); return res.status(500).json({ message: 'Token generation failed.' }); }
                res.json({ message: 'Login successful!', token, role: user.role, name: user.name, email: user.email, userId: user.id });
            });
        });
    } catch (err) {
        console.error('Login server error:', err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// --- Company/Admin Routes - Company Features ---
app.get('/api/admin/profile', protect, authorize(['employer']), (req, res) => {
    const companyId = req.user.id;
    const sql = `SELECT company_name, email, company_website, company_description, contact_person, industry, created_at FROM companies WHERE company_id = ?`;
    db.query(sql, [companyId], (err, results) => {
        if (err) { console.error('Error fetching company profile:', err); return res.status(500).json({ message: 'Failed to fetch company profile.' }); }
        if (results.length === 0) { return res.status(404).json({ message: 'Company profile not found.' }); }
        res.json(results[0]);
    });
});

app.put('/api/admin/profile', protect, authorize(['employer']), (req, res) => {
    const companyId = req.user.id;
    const { companyName, companyWebsite, companyDescription, contactPerson, industry } = req.body;
    const sql = `UPDATE companies SET company_name = ?, company_website = ?, company_description = ?, contact_person = ?, industry = ? WHERE company_id = ?`;
    const values = [companyName, companyWebsite, companyDescription, contactPerson, industry, companyId];
    db.query(sql, values, (err, result) => {
        if (err) { console.error('Error updating company profile:', err); return res.status(500).json({ message: 'Failed to update company profile.' }); }
        if (result.affectedRows === 0) { return res.status(404).json({ message: 'Company not found or no changes made.' }); }
        res.json({ message: 'Company profile updated successfully!' });
    });
});

// Internship management routes - Company posting internship jobs
app.post('/api/admin/internships', protect, authorize(['employer']), (req, res) => {
    const { title, location, type, description, stipend, duration, deadline } = req.body;
    const companyId = req.user.id;

    if (!title || !location || !type || !description || !stipend || !duration || !deadline) {
        return res.status(400).json({ message: 'Please fill all required fields.' });
    }

    const sql = `
        INSERT INTO internships (company_id, title, location, type, description, stipend, duration, deadline)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [companyId, title, location, type, description, stipend, duration, deadline];

    db.query(sql, values, (err, result) => {
        if (err) { console.error('Error posting internship:', err); return res.status(500).json({ message: 'Failed to post internship.' }); }
        res.status(201).json({ message: 'Internship posted successfully!', internshipId: result.insertId });
    });
});

app.get('/api/admin/internships/my', protect, authorize(['employer']), (req, res) => {
    const companyId = req.user.id;
    const sql = `
        SELECT internship_id, title, location, type, description, stipend, duration, DATE_FORMAT(deadline, '%Y-%m-%d') as deadline, created_at
        FROM internships
        WHERE company_id = ?
        ORDER BY created_at DESC
    `;
    db.query(sql, [companyId], (err, results) => {
        if (err) { console.error('Error fetching company\'s internships:', err); return res.status(500).json({ message: 'Failed to fetch internships.' }); }
        res.json(results);
    });
});

app.delete('/api/admin/internships/:id', protect, authorize(['employer', 'admin']), async (req, res) => {
    const internshipId = req.params.id;
    const companyId = req.user.id;
    try {
        const checkSql = `SELECT company_id FROM internships WHERE internship_id = ?`;
        const [internshipResult] = await db.promise().query(checkSql, [internshipId]);
        if (internshipResult.length === 0) {
            return res.status(404).json({ message: 'Internship not found.' });
        }
        if (internshipResult[0].company_id !== companyId) {
            return res.status(403).json({ message: 'Unauthorized: You can only delete your own internships.' });
        }
        const deleteApplicationsSql = `DELETE FROM applications WHERE internship_id = ?`;
        await db.promise().query(deleteApplicationsSql, [internshipId]);
        const deleteInternshipSql = `DELETE FROM internships WHERE internship_id = ?`;
        const [result] = await db.promise().query(deleteInternshipSql, [internshipId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Internship not found or already deleted.' });
        }

        res.json({ message: 'Internship deleted successfully!' });

    } catch (err) {
        console.error('Error deleting internship:', err.message);
        res.status(500).json({ message: 'Server Error: Failed to delete internship.' });
    }
});

// Application management routes - Company viewing student applications
app.get('/api/admin/applications/all', protect, authorize(['employer', 'admin']), async (req, res) => {
    try {
        const employerInternships = await db.promise().query(`SELECT internship_id FROM internships WHERE company_id = ?`, [req.user.id]);
        const internshipIds = employerInternships[0].map(internship => internship.internship_id);

        if (internshipIds.length === 0) {
            return res.json([]);
        }

        const applicationsSql = `
            SELECT
                a.application_id,
                a.status,
                DATE_FORMAT(a.applied_at, '%Y-%m-%d') as applied_at,
                i.title AS internship_title,
                i.location AS internship_location,
                s.student_name,
                s.email AS student_email,
                s.major,
                s.university,
                s.skills,
                s.student_id  -- This line now correctly exists and is selected
            FROM applications a
            JOIN internships i ON a.internship_id = i.internship_id
            JOIN students s ON a.student_id = s.student_id
            WHERE i.internship_id IN (?)
            ORDER BY a.applied_at DESC
        `;
        const [applications] = await db.promise().query(applicationsSql, [internshipIds]);

        res.json(applications);
    } catch (err) {
        console.error('Error fetching admin applications:', err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

app.put('/api/admin/applications/:id/status', protect, authorize(['employer', 'admin']), async (req, res) => {
    const applicationId = req.params.id;
    const { status } = req.body;
    const companyId = req.user.id;
    if (!['pending', 'shortlisted', 'accepted', 'rejected'].includes(status)) { return res.status(400).json({ message: 'Invalid application status.' }); }
    try {
        const checkSql = `SELECT i.company_id FROM applications a JOIN internships i ON a.internship_id = i.internship_id WHERE a.application_id = ?`;
        const [checkResults] = await db.promise().query(checkSql, [applicationId]);
        if (checkResults.length === 0 || checkResults[0].company_id !== companyId) { return res.status(403).json({ message: 'Unauthorized: You can only update applications for your own internships.' }); }
        const updateSql = `UPDATE applications SET status = ? WHERE application_id = ?`;
        const [result] = await db.promise().query(updateSql, [status, applicationId]);
        if (result.affectedRows === 0) { return res.status(404).json({ message: 'Application not found.' }); }
        res.json({ message: 'Application status updated successfully!', status });
    } catch (err) {
        console.error('Error updating application status:', err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

// ====== Student Routes - Student Features ======

app.get('/api/student/profile', protect, authorize(['student']), (req, res) => {
    const studentId = req.user.id;
    const sql = `SELECT student_name, email, major, university, skills, created_at FROM students WHERE student_id = ?`;
    db.query(sql, [studentId], async (err, results) => {
        if (err) { console.error('Error fetching student profile:', err); return res.status(500).json({ message: 'Failed to fetch student profile.' }); }
        if (results.length === 0) { return res.status(404).json({ message: 'Student profile not found.' }); }
        const studentData = results[0];
        const applicationCountSql = `SELECT COUNT(*) AS count FROM applications WHERE student_id = ?`;
        db.query(applicationCountSql, [studentId], (appErr, appResults) => {
            if (appErr) { console.error('Error counting applications:', appErr); studentData.applicationCount = 0; } else { studentData.applicationCount = appResults[0].count; }
            studentData.savedCount = 0;
            res.json(studentData);
        });
    });
});

app.put('/api/student/profile', protect, authorize(['student']), (req, res) => {
    const studentId = req.user.id;
    const { student_name, email, major, university, skills } = req.body;
    
    // Basic validation: ensure updated email isn't already taken by another user
    if (email) {
        db.query('SELECT student_id FROM students WHERE email = ? AND student_id != ?', [email, studentId], (err, results) => {
            if (err) { console.error('Email check error:', err); return res.status(500).json({ message: 'Server error during email check.' }); }
            if (results.length > 0) { return res.status(400).json({ message: 'Email already in use by another student.' }); }
            
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
            if (err) { console.error('Error updating student profile:', err); return res.status(500).json({ message: 'Failed to update student profile.' }); }
            if (result.affectedRows === 0) { return res.status(404).json({ message: 'Student not found or no changes made.' }); }
            res.json({ message: 'Student profile updated successfully!' });
        });
    }
});

// Internship browsing routes - Students browsing available internships
app.get('/api/student/internships', protect, authorize(['student']), async (req, res) => {
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

// Public internship details route - Anyone can view internship details
app.get('/api/internships/:id', async (req, res) => {
    const internshipId = req.params.id;
    const sql = `
        SELECT i.internship_id, i.title, i.location, i.type, i.description, i.stipend, i.duration,
               DATE_FORMAT(i.deadline, '%Y-%m-%d') as deadline,
               c.company_name, c.company_website
        FROM internships i
        JOIN companies c ON i.company_id = c.company_id
        WHERE i.internship_id = ?
    `;
    try {
        const [results] = await db.promise().query(sql, [internshipId]);
        if (results.length === 0) {
            return res.status(404).json({ message: 'Internship not found.' });
        }
        res.json(results[0]);
    } catch (err) {
        console.error('Error fetching single internship:', err);
        res.status(500).json({ message: 'Server Error: ' + err.message });
    }
});

// Application submission route - Students applying for internships
app.post('/api/student/apply/:internship_id', protect, authorize(['student']), async (req, res) => {
    const internshipId = req.params.internship_id;
    const studentId = req.user.id;
    const resumeFile = req.body.resume_file || 'default_resume.pdf';
    try {
        const internshipSql = `SELECT company_id FROM internships WHERE internship_id = ?`;
        const [internshipResults] = await db.promise().query(internshipSql, [internshipId]);
        if (internshipResults.length === 0) { return res.status(404).json({ message: 'Internship not found.' }); }
        const employerId = internshipResults[0].company_id;

        const checkApplicationSql = `SELECT * FROM applications WHERE student_id = ? AND internship_id = ?`;
        const [existingApplication] = await db.promise().query(checkApplicationSql, [studentId, internshipId]);
        if (existingApplication.length > 0) { return res.status(400).json({ message: 'You have already applied to this internship.' }); }

        const insertSql = `INSERT INTO applications (internship_id, student_id, resume_file, employer) VALUES (?, ?, ?, ?)`;
        const insertValues = [internshipId, studentId, resumeFile, employerId];

        const [result] = await db.promise().query(insertSql, insertValues);
        res.status(201).json({ message: 'Application submitted successfully!', applicationId: result.insertId });
    } catch (err) {
        console.error('Application submission server error:', err.message);
        if (err.code === 'ER_DUP_ENTRY') { return res.status(400).json({ message: 'You have already applied to this internship.' }); }
        res.status(500).json({ message: 'Server Error' });
    }
});

// Student application tracking routes - Students viewing their applications
app.get('/api/student/applications/my', protect, authorize(['student']), async (req, res) => {
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

// Student profile viewing route (for companies) - Companies viewing student profiles
app.get('/api/students/:id', protect, authorize(['employer', 'admin']), async (req, res) => {
    const studentId = req.params.id;
    const sql = `
        SELECT student_id, student_name, email, major, university, skills, created_at
        FROM students
        WHERE student_id = ?
    `;
    try {
        const [results] = await db.promise().query(sql, [studentId]);
        if (results.length === 0) {
            return res.status(404).json({ message: 'Student profile not found.' });
        }
        res.json(results[0]);
    } catch (err) {
        console.error('Error fetching student profile for admin view:', err);
        res.status(500).json({ message: 'Server Error: ' + err.message });
    }
});

// Serve static files and start server
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
