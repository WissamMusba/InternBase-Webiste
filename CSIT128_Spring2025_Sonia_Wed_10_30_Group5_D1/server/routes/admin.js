// server/routes/admin.js - Admin/Company-specific API routes

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

// Role-based authorization middleware for employers
const authorizeEmployer = (req, res, next) => {
    if (!req.user || req.user.role !== 'employer') {
        return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
    }
    next();
};

// @route GET /api/admin/profile
// @desc Get company profile data for logged-in employer
router.get('/profile', protect, authorizeEmployer, (req, res) => {
    const companyId = req.user.id;
    const sql = `SELECT company_name, email, company_website, company_description, contact_person, industry, created_at FROM companies WHERE company_id = ?`;
    db.query(sql, [companyId], (err, results) => {
        if (err) { 
            console.error('Error fetching company profile:', err); 
            return res.status(500).json({ message: 'Failed to fetch company profile.' }); 
        }
        if (results.length === 0) { 
            return res.status(404).json({ message: 'Company profile not found.' }); 
        }
        res.json(results[0]);
    });
});

// @route PUT /api/admin/profile
// @desc Update company profile data for logged-in employer
router.put('/profile', protect, authorizeEmployer, (req, res) => {
    const companyId = req.user.id;
    const { companyName, companyWebsite, companyDescription, contactPerson, industry } = req.body;
    const sql = `UPDATE companies SET company_name = ?, company_website = ?, company_description = ?, contact_person = ?, industry = ? WHERE company_id = ?`;
    const values = [companyName, companyWebsite, companyDescription, contactPerson, industry, companyId];
    db.query(sql, values, (err, result) => {
        if (err) { 
            console.error('Error updating company profile:', err); 
            return res.status(500).json({ message: 'Failed to update company profile.' }); 
        }
        if (result.affectedRows === 0) { 
            return res.status(404).json({ message: 'Company not found or no changes made.' }); 
        }
        res.json({ message: 'Company profile updated successfully!' });
    });
});

// Internship management routes
router.post('/internships', protect, authorizeEmployer, (req, res) => {
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
        if (err) { 
            console.error('Error posting internship:', err); 
            return res.status(500).json({ message: 'Failed to post internship.' }); 
        }
        res.status(201).json({ message: 'Internship posted successfully!', internshipId: result.insertId });
    });
});

// @route GET /api/admin/internships/my
// @desc Get all internships posted by the logged-in company
router.get('/internships/my', protect, authorizeEmployer, (req, res) => {
    const companyId = req.user.id;
    const sql = `
        SELECT internship_id, title, location, type, description, stipend, duration, DATE_FORMAT(deadline, '%Y-%m-%d') as deadline, created_at
        FROM internships
        WHERE company_id = ?
        ORDER BY created_at DESC
    `;
    db.query(sql, [companyId], (err, results) => {
        if (err) { 
            console.error('Error fetching company\'s internships:', err); 
            return res.status(500).json({ message: 'Failed to fetch internships.' }); 
        }
        res.json(results);
    });
});

// @route DELETE /api/admin/internships/:id
// @desc Delete an internship and cascade delete related applications
router.delete('/internships/:id', protect, authorizeEmployer, async (req, res) => {
    const internshipId = req.params.id;
    const companyId = req.user.id;
    try {
        // Check if the internship belongs to this company
        const checkSql = `SELECT company_id FROM internships WHERE internship_id = ?`;
        const [internshipResult] = await db.promise().query(checkSql, [internshipId]);
        if (internshipResult.length === 0) {
            return res.status(404).json({ message: 'Internship not found.' });
        }
        if (internshipResult[0].company_id !== companyId) {
            return res.status(403).json({ message: 'Unauthorized: You can only delete your own internships.' });
        }
        
        // Delete all applications for this internship first
        const deleteApplicationsSql = `DELETE FROM applications WHERE internship_id = ?`;
        await db.promise().query(deleteApplicationsSql, [internshipId]);
        
        // Then delete the internship
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

// Application management routes
router.get('/applications/all', protect, authorizeEmployer, async (req, res) => {
    try {
        // Get all internship IDs posted by this company
        const employerInternships = await db.promise().query(`SELECT internship_id FROM internships WHERE company_id = ?`, [req.user.id]);
        const internshipIds = employerInternships[0].map(internship => internship.internship_id);

        if (internshipIds.length === 0) {
            return res.json([]);
        }

        // Get all applications for these internships
        const applicationsSql = `
            SELECT
                a.application_id,
                a.status,
                DATE_FORMAT(a.applied_at, '%Y-%m-%d') as applied_at,
                i.internship_id,
                i.title AS internship_title,
                i.location AS internship_location,
                s.student_name,
                s.email AS student_email,
                s.major,
                s.university,
                s.skills,
                s.student_id
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

// @route PUT /api/admin/applications/:id/status
// @desc Update application status with ownership validation
router.put('/applications/:id/status', protect, authorizeEmployer, async (req, res) => {
    const applicationId = req.params.id;
    const { status } = req.body;
    const companyId = req.user.id;
    
    if (!['pending', 'shortlisted', 'accepted', 'rejected'].includes(status)) { 
        return res.status(400).json({ message: 'Invalid application status.' }); 
    }
    
    try {
        // Check if this application is for an internship posted by this company
        const checkSql = `SELECT i.company_id FROM applications a JOIN internships i ON a.internship_id = i.internship_id WHERE a.application_id = ?`;
        const [checkResults] = await db.promise().query(checkSql, [applicationId]);
        if (checkResults.length === 0 || checkResults[0].company_id !== companyId) { 
            return res.status(403).json({ message: 'Unauthorized: You can only update applications for your own internships.' }); 
        }
        
        // Update the application status
        const updateSql = `UPDATE applications SET status = ? WHERE application_id = ?`;
        const [result] = await db.promise().query(updateSql, [status, applicationId]);
        if (result.affectedRows === 0) { 
            return res.status(404).json({ message: 'Application not found.' }); 
        }
        res.json({ message: 'Application status updated successfully!', status });
    } catch (err) {
        console.error('Error updating application status:', err.message);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
