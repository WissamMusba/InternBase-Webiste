// server/init_db.js - Database schema initialization and sample data seeding

const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Database schema definition with DDL statements
const schema = `
DROP DATABASE IF EXISTS 128_Project;
CREATE DATABASE IF NOT EXISTS 128_Project;
USE 128_Project;

CREATE TABLE IF NOT EXISTS companies (
    company_id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    company_website VARCHAR(255),
    company_description TEXT,
    contact_person VARCHAR(255),
    industry VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    major VARCHAR(255),
    university VARCHAR(255),
    skills TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS internships (
    internship_id INT AUTO_INCREMENT PRIMARY KEY,
    company_id INT,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    type ENUM('Remote', 'On-site', 'Hybrid') NOT NULL,
    description TEXT NOT NULL,
    stipend VARCHAR(100),
    duration VARCHAR(50),
    deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    internship_id INT,
    student_id INT,
    resume_file VARCHAR(255),
    status ENUM('pending', 'shortlisted', 'accepted', 'rejected') DEFAULT 'pending',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    employer INT,
    FOREIGN KEY (internship_id) REFERENCES internships(internship_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (employer) REFERENCES companies(company_id) ON DELETE CASCADE,
    UNIQUE(internship_id, student_id)
);

INSERT INTO companies (company_name, email, password, company_website, company_description, contact_person, industry) VALUES
('Meta', 'contact@meta.com', 'MetaSecure#2025', 'https://www.meta.com', 'A leading technology company building products that help people connect, find communities, and grow businesses, known for Facebook, Instagram, WhatsApp, and its focus on the metaverse.', 'Mark Zuckerberg', 'Technology'),
('Amazon', 'support@amazon.com', 'AmazonPrime$2025', 'https://www.amazon.com', 'A multinational technology company focusing on e-commerce, cloud computing, digital streaming, and artificial intelligence.', 'Andy Jassy', 'E-commerce'),
('Apple', 'media.help@apple.com', 'AppleCore2025!', 'https://www.apple.com', 'A global leader in consumer electronics, software, and digital services, known for the iPhone, Mac, and ecosystem of products and services.', 'Tim Cook', 'Consumer Electronics'),
('Netflix', 'info@netflix.com', 'StreamFlix#2025', 'https://www.netflix.com', 'A leading global entertainment service providing streaming media and original content across multiple genres and languages.', 'Ted Sarandos', 'Entertainment'),
('Google', 'press@google.com', 'GoogleSecure#1', 'https://about.google', 'An American multinational technology company focusing on online advertising, search engine technology, cloud computing, software, quantum computing, e-commerce, AI, and consumer electronics.', 'Sundar Pichai', 'Technology');

INSERT INTO students (student_name, email, password, major, university, skills) VALUES
('Hriday', 'hriday@uowmail.edu.au', 'hr982', 'Computer Science', 'University of Wollongong in Dubai', 'HTML, CSS, JavaScript, React'),
('Taha', 'tk239@uowmail.edu.au', 'tk239', 'Cyber Security', 'University of Sharjah', 'Network Security, Ethical Hacking, Python'),
('Rohan', 'rohan@uowmail.edu.au', 'ro722', 'Finance', 'American University of Sharjah', 'Financial Modeling, Excel, Data Analysis'),
('Wissam', 'wissam@uowmail.edu.au', 'wi922', 'Electrical Engineering', 'Khalifa University', 'Circuit Design, Robotics, C++'),
('Bilal', 'bilal@uowmail.edu.au', 'bil222', 'Business Administration', 'Zayed University', 'Marketing, Project Management, Communication');

INSERT INTO internships (company_id, title, location, type, description, stipend, duration, deadline) VALUES
(1, 'Software Engineering Intern', 'Menlo Park', 'Hybrid', 'Contribute to core social platform features and scale backend systems. **Skills: React, GraphQL, Hack, Distributed Systems**', '2000.00', '4 months', '2025-09-01'),
(2, 'Operations Intern', 'Seattle', 'On-site', 'Assist in warehouse optimization, data analysis, and supply chain planning. **Skills: SQL, Excel, Data Visualization**', '1700.00', '5 months', '2025-08-30'),
(3, 'Machine Learning Intern', 'Cupertino', 'Remote', 'Work with ML engineers to enhance Siri and recommendation systems. **Skills: Python, TensorFlow, CoreML**', '2200.00', '3 months', '2025-07-20'),
(4, 'Content Strategy Intern', 'Los Gatos', 'Remote', 'Collaborate with content, data, and marketing teams to improve viewer engagement. **Skills: Data Analysis, Market Research, SQL**', '1800.00', '6 months', '2025-10-15'),
(5, 'Cloud Solutions Intern', 'Mountain View', 'On-site', 'Support Google Cloud projects focusing on infrastructure automation. **Skills: GCP, Kubernetes, Bash, Terraform**', '1900.00', '3 months', '2025-06-30');

INSERT INTO applications (internship_id, student_id, resume_file, status, employer) VALUES
(1, 2, 'taha_resume.pdf', 'pending', 1),
(2, 1, 'hriday_resume.pdf', 'pending', 2),
(3, 3, 'rohan_resume.pdf', 'pending', 3),
(4, 4, 'wissam_resume.pdf', 'pending', 4),
(5, 5, 'bilal_resume.pdf', 'pending', 5);
`;

// Database initialization function with schema execution
function initDb() {
    const connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root', // Update with your MySQL root password
        multipleStatements: true
    });

    connection.connect((err) => {
        if (err) {
            console.error('❌ Failed to connect to MySQL:', err);
            return;
        }

        console.log('✅ Connected to MySQL. Setting up schema...');
        connection.query(schema, (err, result) => {
            if (err) {
                console.error('❌ Schema execution failed:', err, '\nSQL Message:', err.sqlMessage, '\nSQL:', err.sql);
            } else {
                console.log('✅ Database initialized successfully!');
            }
            connection.end(); // Close connection after execution
        });
    });
}

// Execute the initDb function when this script is run directly
if (require.main === module) {
    initDb();
}

module.exports = initDb;