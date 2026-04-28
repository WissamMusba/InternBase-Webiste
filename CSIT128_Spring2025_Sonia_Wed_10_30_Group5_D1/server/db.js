// server/db.js - Database connection configuration

const mysql = require('mysql2');
require('dotenv').config({ path: '../.env' }); // Loading .env for MySQL password

// Create MySQL connection pool
const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root', // Update with your MySQL root password
    database: '128_Project' // Connecting to the database
});

// Establish database connection
conn.connect((err) => {
    if (err) {
        console.error('MySQL connection failed:', err.message);
        // Do not exit process here, let the main app handle it or log an error.
        // The app will likely fail on routes if DB is not connected.
        return;
    }
    console.log('✅ Connected to MySQL database: 128_Project');
});

module.exports = conn;