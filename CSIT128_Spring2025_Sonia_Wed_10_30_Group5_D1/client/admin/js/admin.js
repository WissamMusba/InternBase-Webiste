// client/js/admin.js
// ===== GLOBAL CONFIG =====
const API_BASE_URL = 'http://localhost:3000/api';

// ===== CUSTOM ALERT MODAL (General purpose) =====
let messageModal;
let messageModalContent;

function createMessageModal() {
    messageModal = document.createElement('div');
    messageModal.style.position = 'fixed';
    messageModal.style.top = '0';
    messageModal.style.left = '0';
    messageModal.style.width = '100%';
    messageModal.style.height = '100%';
    messageModal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    messageModal.style.display = 'none';
    messageModal.style.justifyContent = 'center';
    messageModal.style.alignItems = 'center';
    messageModal.style.zIndex = '9999';
    messageModal.style.opacity = '0';
    messageModal.style.transition = 'opacity 0.3s ease-in-out';
    messageModal.style.pointerEvents = 'none';

    messageModalContent = document.createElement('div');
    messageModalContent.style.backgroundColor = '#fff';
    messageModalContent.style.padding = '30px 40px';
    messageModalContent.style.borderRadius = '12px';
    messageModalContent.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
    messageModalContent.style.textAlign = 'center';
    messageModalContent.style.maxWidth = '400px';
    messageModalContent.style.transform = 'scale(0.9)';
    messageModalContent.style.transition = 'transform 0.3s ease-in-out';
    messageModalContent.style.pointerEvents = 'auto';
    messageModalContent.innerHTML = `
        <p id="messageModalText" style="font-size: 1.1rem; margin-bottom: 20px; color: #333;"></p>
        <button id="messageModalCloseBtn" style="background-color: #222; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">OK</button>
    `;
    messageModal.appendChild(messageModalContent);
    document.body.appendChild(messageModal);

    document.getElementById('messageModalCloseBtn').addEventListener('click', hideAlert);
    messageModal.addEventListener('click', (e) => {
        if (e.target === messageModal) {
            hideAlert();
        }
    });
}

function showAlert(message) {
    if (!messageModal) {
        createMessageModal();
    }
    document.getElementById('messageModalText').textContent = message;
    messageModal.style.display = 'flex';
    messageModal.style.pointerEvents = 'auto';
    setTimeout(() => {
        messageModal.style.opacity = '1';
        messageModalContent.style.transform = 'scale(1)';
    }, 10);
}

function hideAlert() {
    if (messageModal) {
        messageModal.style.opacity = '0';
        messageModalContent.style.transform = 'scale(0.9)';
        setTimeout(() => {
            messageModal.style.display = 'none';
            messageModal.style.pointerEvents = 'none';
        }, 300);
    }
}


// ===== UTILITY FUNCTION FOR API CALLS =====
async function fetchData(endpoint, method = 'GET', payload = null, needsAuth = false) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (needsAuth) {
        const token = localStorage.getItem('companyToken');
        if (!token) {
            console.error('Authentication token not found for company.');
            showAlert('Session expired. Please log in again.');
            window.location.href = '/admin/login.html';
            return null;
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            body: payload ? JSON.stringify(payload) : null,
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('companyToken');
            localStorage.removeItem('loggedInCompanyName');
            localStorage.removeItem('loggedInCompanyEmail');
            localStorage.removeItem('loggedInCompanyId');

            showAlert('Session expired or unauthorized. Please log in again.');
            window.location.href = '/admin/login.html';
            return null;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status}`);
        }

        return await response.json();
    } catch (err) {
        console.error('Fetch error:', err.message);
        showAlert(`Error: ${err.message}`);
        return null;
    }
}

// ===== AUTH HANDLERS =====
function handleCompanyLogin() {
    const loginForm = document.getElementById('companyLoginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = loginForm.querySelector('input[name="email"]').value;
        const password = loginForm.querySelector('input[name="password"]').value;

        const result = await fetchData('/auth/login', 'POST', { email, password, role: 'employer' });

        if (result && result.token) {
            localStorage.setItem('companyToken', result.token);
            localStorage.setItem('loggedInCompanyName', result.name || 'Company');
            localStorage.setItem('loggedInCompanyEmail', result.email);
            localStorage.setItem('loggedInCompanyId', result.userId);

            showAlert('✅ Login successful!');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        } else {
        }
    });
}

function handleCompanySignup() {
    const signupForm = document.getElementById('companySignupForm');
    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const companyName = signupForm.querySelector('input[name="name"]').value;
        const email = signupForm.querySelector('input[name="email"]').value;
        const password = signupForm.querySelector('input[name="password"]').value;
        const confirmPassword = signupForm.querySelector('input[name="confirmPassword"]').value;

        if (password !== confirmPassword) {
            showAlert('❌ Passwords do not match.');
            return;
        }

        const result = await fetchData('/auth/register', 'POST', { name: companyName, email, password, role: 'employer', companyName });

        if (result && result.token) {
            localStorage.setItem('companyToken', result.token);
            localStorage.setItem('loggedInCompanyName', result.name || 'Company');
            localStorage.setItem('loggedInCompanyEmail', result.email);
            localStorage.setItem('loggedInCompanyId', result.userId);

            showAlert('✅ Registration successful! You are now logged in.');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } else {
        }
    });
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('companyToken');
            localStorage.removeItem('loggedInCompanyName');
            localStorage.removeItem('loggedInCompanyEmail');
            localStorage.removeItem('loggedInCompanyId');

            showAlert('Logged out successfully.');
            setTimeout(() => {
                window.location.href = '/admin/login.html';
            }, 500);
        });
    }
}

// ===== DASHBOARD FUNCTIONS =====
async function loadDashboardStats() {
    if (document.getElementById('activeInternships') && document.getElementById('newApplications')) {
        try {
            const myInternships = await fetchData('/admin/internships/my', 'GET', null, true);
            if (myInternships) {
                document.getElementById('activeInternships').textContent = myInternships.length;
            } else {
                document.getElementById('activeInternships').textContent = '0';
            }

            const allApplications = await fetchData('/admin/applications/all', 'GET', null, true);
            if (allApplications) {
                const newApps = allApplications.filter(app => app.status === 'pending').length;
                const shortlistedApps = allApplications.filter(app => app.status === 'shortlisted').length;

                document.getElementById('newApplications').textContent = newApps;
                document.getElementById('shortlisted').textContent = shortlistedApps;
                renderRecentApplications(allApplications);
            } else {
                document.getElementById('newApplications').textContent = '0';
                document.getElementById('shortlisted').textContent = '0';
            }
        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            showAlert('Failed to load dashboard statistics.');
        }
    }
}

function renderRecentApplications(applications) {
    const tbody = document.getElementById('recentApplications');
    if (!tbody) return;

    tbody.innerHTML = '';
    const recent5 = applications.slice(0, 5);

    if (recent5.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4">No recent applications.</td></tr>`;
        return;
    }

    recent5.forEach(app => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${app.student_name}</td>
            <td>${app.internship_title}</td>
            <td>${new Date(app.applied_at).toLocaleDateString()}</td>
            <td><span class="status-badge status-${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// ===== INTERNSHIPS PAGE (POSTING & LISTING) =====
function handleInternshipPost() {
    const form = document.getElementById('internshipForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = form.querySelector('input[name="title"]').value;
        const location = form.querySelector('input[name="location"]').value;
        const type = form.querySelector('select[name="type"]').value;
        const description = form.querySelector('textarea[name="description"]').value;
        const stipend = form.querySelector('input[name="stipend"]').value;
        const duration = form.querySelector('input[name="duration"]').value;
        const deadline = form.querySelector('input[name="deadline"]').value;

        const payload = {
            title,
            location,
            type,
            description,
            stipend,
            duration,
            deadline
        };

        const result = await fetchData('/admin/internships', 'POST', payload, true);

        if (result) {
            showAlert('✅ Internship posted successfully!');
            form.reset();
            loadCompanyInternships();
        } else {
        }
    });
}

async function loadCompanyInternships() {
    const tbody = document.getElementById('companyInternshipsTableBody');
    if (!tbody) return;

    try {
        const internships = await fetchData('/admin/internships/my', 'GET', null, true);

        tbody.innerHTML = '';

        if (internships && internships.length > 0) {
            internships.forEach(internship => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${internship.title}</td>
                    <td>${internship.location}</td>
                    <td>${internship.type}</td>
                    <td>${internship.duration}</td>
                    <td>${internship.stipend}</td>
                    <td>${internship.deadline}</td>
                    <td>
                        <button class="action-btn view-details-btn" data-id="${internship.internship_id}">View</button>
                        <button class="action-btn delete-btn" data-id="${internship.internship_id}">Delete</button>
                    </td>
                `;
                tbody.appendChild(row);
            });
            setupInternshipActionListeners();
        } else {
            tbody.innerHTML = `<tr><td colspan="7">No internships posted yet.</td></tr>`;
        }
    }
    catch (error) {
        console.error('Error loading company internships:', error);
        showAlert('Failed to load your posted internships.');
    }
}

// ===== ADMIN INTERNSHIP VIEW/DELETE LOGIC =====
let adminInternshipDetailsModal;
let adminInternshipDetailsModalContent;

function createAdminInternshipDetailsModal() {
    adminInternshipDetailsModal = document.createElement('div');
    adminInternshipDetailsModal.className = 'modal-overlay';
    adminInternshipDetailsModal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-btn">&times;</button>
            <h2 id="adminModalTitle"></h2>
            <p><strong>Company:</strong> <span id="adminModalCompany"></span></p>
            <p><strong>Location:</strong> <span id="adminModalLocation"></span> (<span id="adminModalType"></span>)</p>
            <p><strong>Stipend:</strong> <span id="adminModalStipend"></span></p>
            <p><strong>Duration:</strong> <span id="adminModalDuration"></span></p>
            <p><strong>Deadline:</strong> <span id="adminModalDeadline"></span></p>
            <h3>Description:</h3>
            <p id="adminModalDescription"></p>
            <!-- Removed Required Skills section from modal HTML -->
            <p style="margin-top: 15px;"><strong>Company Website:</strong> <a id="adminModalCompanyWebsite" href="#" target="_blank"></a></p>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="adminModalCloseBtn">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(adminInternshipDetailsModal);

    adminInternshipDetailsModalContent = adminInternshipDetailsModal.querySelector('.modal-content');

    adminInternshipDetailsModal.querySelector('.modal-close-btn').addEventListener('click', () => {
        adminInternshipDetailsModal.classList.remove('active');
    });
    document.getElementById('adminModalCloseBtn').addEventListener('click', () => {
        adminInternshipDetailsModal.classList.remove('active');
    });
    adminInternshipDetailsModal.addEventListener('click', (e) => {
        if (e.target === adminInternshipDetailsModal) {
            adminInternshipDetailsModal.classList.remove('active');
        }
    });
}

async function showAdminInternshipDetails(internshipId) {
    if (!adminInternshipDetailsModal) {
        createAdminInternshipDetailsModal();
    }

    try {
        const internship = await fetchData(`/internships/${internshipId}`, 'GET', null, false);

        if (internship) {
            document.getElementById('adminModalTitle').textContent = internship.title;
            document.getElementById('adminModalCompany').textContent = internship.company_name;
            document.getElementById('adminModalLocation').textContent = internship.location;
            document.getElementById('adminModalType').textContent = internship.type;
            document.getElementById('adminModalStipend').textContent = internship.stipend || 'Unpaid';
            document.getElementById('adminModalDuration').textContent = internship.duration;
            document.getElementById('adminModalDeadline').textContent = new Date(internship.deadline).toLocaleDateString();
            document.getElementById('adminModalDescription').textContent = internship.description;
            // Removed required_skills display logic

            const companyWebsiteLink = document.getElementById('adminModalCompanyWebsite');
            if (internship.company_website) {
                companyWebsiteLink.href = internship.company_website.startsWith('http') ? internship.company_website : `https://${internship.company_website}`;
                companyWebsiteLink.textContent = internship.company_website;
                companyWebsiteLink.style.display = 'inline';
            } else {
                companyWebsiteLink.style.display = 'none';
            }

            adminInternshipDetailsModal.classList.add('active');
        } else {
            showAlert('Failed to load internship details.');
        }
    } catch (error) {
        console.error('Error fetching admin internship details:', error);
        showAlert('Failed to load internship details.');
    }
}


function setupInternshipActionListeners() {
    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', function() {
            const internshipId = this.getAttribute('data-id');
            showAdminInternshipDetails(internshipId);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const internshipId = this.getAttribute('data-id');
            if (confirm('Are you sure you want to delete this internship? This action cannot be undone.')) {
                const result = await fetchData(`/admin/internships/${internshipId}`, 'DELETE', null, true);
                if (result) {
                    showAlert('✅ Internship deleted successfully!');
                    loadCompanyInternships();
                } else {
                }
            }
        });
    });
}


// ===== APPLICATIONS PAGE (ADMIN VIEW) =====
async function loadApplications() {
    const applicationsTableBody = document.getElementById('applicationsTableBody');
    if (!applicationsTableBody) return;

    try {
        const applications = await fetchData('/admin/applications/all', 'GET', null, true);

        applicationsTableBody.innerHTML = '';
        if (applications && applications.length > 0) {
            applications.forEach(app => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${app.student_name} (${app.student_email})</td>
                    <td>${app.internship_title} (${app.internship_location})</td>
                    <td>${new Date(app.applied_at).toLocaleDateString()}</td>
                    <td><span class="status-badge status-${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span></td>
                    <td>
                        <select class="status-selector" data-id="${app.application_id}">
                            <option value="pending" ${app.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="shortlisted" ${app.status === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
                            <option value="accepted" ${app.status === 'accepted' ? 'selected' : ''}>Accepted</option>
                            <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </td>
                    <td>
                        <button class="action-btn view-student-profile-btn" data-student-id="${app.student_id}">View Student Profile</button>
                    </td>
                `;
                applicationsTableBody.appendChild(row);
            });
            setupStatusChangeListeners();
            setupViewStudentProfileListeners(); // Add this listener here
        } else {
            applicationsTableBody.innerHTML = `<tr><td colspan="6">No applications received yet.</td></tr>`;
        }
        setupApplicationFilters(applications);
    } catch (error) {
        console.error('Error loading applications:', error);
        showAlert('Failed to load applications.');
    }
}

function setupStatusChangeListeners() {
    document.querySelectorAll('.status-selector').forEach(selector => {
        selector.addEventListener('change', async function() {
            const applicationId = this.getAttribute('data-id');
            const newStatus = this.value;
            const result = await fetchData(`/admin/applications/${applicationId}/status`, 'PUT', { status: newStatus }, true);
            if (result) {
                showAlert(`Application ${applicationId} status updated to ${newStatus}.`);
                this.closest('tr').querySelector('.status-badge').className = `status-badge status-${newStatus}`;
                this.closest('tr').querySelector('.status-badge').textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
            } else {
                showAlert('Failed to update status.');
                loadApplications();
            }
        });
    });
}

function setupApplicationFilters(applicationsData) {
    const internshipFilter = document.getElementById('internshipFilter');
    const statusFilter = document.getElementById('statusFilter');
    const applicationsTableBody = document.getElementById('applicationsTableBody');

    const populateInternshipFilter = () => {
        if (!internshipFilter) return;
        
        internshipFilter.innerHTML = '<option value="all">All Internships</option>';
        const uniqueInternships = [...new Set(applicationsData.map(app => app.internship_title))];
        
        uniqueInternships.forEach(title => {
            if (title) {
                const option = document.createElement('option');
                option.value = title;
                option.textContent = title;
                internshipFilter.appendChild(option);
            }
        });
    };

    populateInternshipFilter();

    const applyFilters = () => {
        const selectedInternship = internshipFilter?.value || 'all';
        const selectedStatus = statusFilter?.value || 'all';

        applicationsTableBody.innerHTML = '';

        const filteredApps = applicationsData.filter(app => {
            const matchesInternship = selectedInternship === 'all' || app.internship_title === selectedInternship;
            const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;
            return matchesInternship && matchesStatus;
        });

        if (filteredApps.length > 0) {
            filteredApps.forEach(app => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${app.student_name} (${app.student_email})</td>
                    <td>${app.internship_title} (${app.internship_location})</td>
                    <td>${new Date(app.applied_at).toLocaleDateString()}</td>
                    <td><span class="status-badge status-${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span></td>
                    <td>
                        <select class="status-selector" data-id="${app.application_id}">
                            <option value="pending" ${app.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="shortlisted" ${app.status === 'shortlisted' ? 'selected' : ''}>Shortlisted</option>
                            <option value="accepted" ${app.status === 'accepted' ? 'selected' : ''}>Accepted</option>
                            <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </td>
                    <td>
                        <button class="action-btn view-student-profile-btn" data-student-id="${app.student_id}">View Student Profile</button>
                    </td>
                `;
                applicationsTableBody.appendChild(row);
            });
            setupStatusChangeListeners();
            setupViewStudentProfileListeners();
        } else {
            applicationsTableBody.innerHTML = `<tr><td colspan="6">No applications matching criteria.</td></tr>`;
        }
    };

    internshipFilter?.addEventListener('change', applyFilters);
    statusFilter?.addEventListener('change', applyFilters);
}

// ===== ADMIN VIEW STUDENT PROFILE MODAL LOGIC =====
let studentProfileModal;
let studentProfileModalContent;

function createStudentProfileModal() {
    studentProfileModal = document.createElement('div');
    studentProfileModal.className = 'modal-overlay';
    studentProfileModal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-btn">&times;</button>
            <h2 id="studentModalTitle">Student Profile</h2>
            <p><strong>Name:</strong> <span id="studentModalName"></span></p>
            <p><strong>Email:</strong> <span id="studentModalEmail"></span></p>
            <p><strong>Major:</strong> <span id="studentModalMajor"></span></p>
            <p><strong>University:</strong> <span id="studentModalUniversity"></span></p>
            <h3>Skills:</h3>
            <p id="studentModalSkills"></p>
            <p><strong>Member Since:</strong> <span id="studentModalMemberSince"></span></p>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="studentModalCloseBtn">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(studentProfileModal);

    studentProfileModalContent = studentProfileModal.querySelector('.modal-content');

    studentProfileModal.querySelector('.modal-close-btn').addEventListener('click', () => {
        studentProfileModal.classList.remove('active');
    });
    document.getElementById('studentModalCloseBtn').addEventListener('click', () => {
        studentProfileModal.classList.remove('active');
    });
    studentProfileModal.addEventListener('click', (e) => {
        if (e.target === studentProfileModal) {
            studentProfileModal.classList.remove('active');
        }
    });
}

async function showStudentProfileModal(studentId) {
    if (!studentProfileModal) {
        createStudentProfileModal();
    }

    try {
        const studentData = await fetchData(`/students/${studentId}`, 'GET', null, true);

        if (studentData) {
            document.getElementById('studentModalName').textContent = studentData.student_name || 'N/A';
            document.getElementById('studentModalEmail').textContent = studentData.email || 'N/A';
            document.getElementById('studentModalMajor').textContent = studentData.major || 'N/A';
            document.getElementById('studentModalUniversity').textContent = studentData.university || 'N/A';
            document.getElementById('studentModalSkills').textContent = studentData.skills || 'No skills listed.';
            document.getElementById('studentModalMemberSince').textContent = new Date(studentData.created_at).toLocaleDateString();

            studentProfileModal.classList.add('active');
        } else {
            showAlert('Failed to load student profile details.');
        }
    } catch (error) {
        console.error('Error fetching student profile for modal:', error);
        showAlert('Failed to load student profile for display.');
    }
}

function setupViewStudentProfileListeners() {
    document.querySelectorAll('.view-student-profile-btn').forEach(button => {
        button.addEventListener('click', function() {
            const studentId = parseInt(this.getAttribute('data-student-id')); // Ensure ID is parsed
            if (!isNaN(studentId)) { // Basic validation
                showStudentProfileModal(studentId);
            } else {
                console.error('Invalid student ID for profile view:', this.getAttribute('data-student-id'));
                showAlert('Error: Could not retrieve student ID for profile.');
            }
        });
    });
}


// ===== COMPANY PROFILE FUNCTIONS =====
async function loadCompanyProfile() {
    const companyNameElem = document.getElementById('companyName');
    if (!companyNameElem) return;

    try {
        const profile = await fetchData('/admin/profile', 'GET', null, true);
        if (profile) {
            document.getElementById('companyName').textContent = profile.company_name || 'Your Company';
            document.getElementById('companyEmail').textContent = profile.email || 'N/A';
            document.getElementById('inputCompanyName').value = profile.company_name || '';
            document.getElementById('inputIndustry').value = profile.industry || '';
            document.getElementById('inputEmail').value = profile.email || '';
            document.getElementById('inputPhone').value = profile.contact_person || '';
            document.getElementById('inputAbout').value = profile.company_description || '';
            const inputWebsite = document.getElementById('inputCompanyWebsite');
            if (inputWebsite) inputWebsite.value = profile.company_website || '';

        }
    } catch (error) {
        console.error('Error loading company profile:', error);
        showAlert('Failed to load company profile.');
    }
}

function setupProfileEdit() {
    const editBtn = document.getElementById('editProfileBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');
    const saveBtn = document.getElementById('saveProfileBtn');
    const formInputs = document.querySelectorAll('#profileForm input, #profileForm textarea');
    let originalValues = {};

    editBtn?.addEventListener('click', function() {
        formInputs.forEach(input => {
            originalValues[input.id] = input.value;
            input.removeAttribute('readonly');
        });
        editBtn.style.display = 'none';
        cancelBtn.style.display = 'inline-block';
        saveBtn.style.display = 'inline-block';
    });

    cancelBtn?.addEventListener('click', function() {
        formInputs.forEach(input => {
            input.value = originalValues[input.id];
            input.setAttribute('readonly', true);
        });
        editBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'none';
        saveBtn.style.display = 'none';
    });

    saveBtn?.addEventListener('click', async function(e) {
        e.preventDefault();

        const payload = {
            companyName: document.getElementById('inputCompanyName').value,
            industry: document.getElementById('inputIndustry').value,
            contactPerson: document.getElementById('inputPhone').value,
            companyDescription: document.getElementById('inputAbout').value,
            companyWebsite: document.getElementById('inputCompanyWebsite')?.value
        };

        const result = await fetchData('/admin/profile', 'PUT', payload, true);

        if (result) {
            showAlert('✅ Profile updated successfully!');
            formInputs.forEach(input => input.setAttribute('readonly', true));
            editBtn.style.display = 'inline-block';
            cancelBtn.style.display = 'none';
            saveBtn.style.display = 'none';
            loadCompanyProfile();
        } else {
        }
    });

    const changePasswordBtn = document.getElementById('changePasswordBtn');
    changePasswordBtn?.addEventListener('click', () => {
        showAlert('Change password functionality would go here. For security, this would typically involve current password verification and a separate API endpoint.');
    });
}


// ===== INITIALIZATION & ROUTING =====
document.addEventListener('DOMContentLoaded', () => {
    createMessageModal();

    const path = window.location.pathname;

    // Admin Pages
    if (path.includes('/admin/login.html')) {
        handleCompanyLogin();
    } else if (path.includes('/admin/signup.html')) {
        handleCompanySignup();
    } else if (path.includes('/admin/dashboard.html')) {
        setupLogout();
        loadDashboardStats();
    } else if (path.includes('/admin/internships.html')) {
        setupLogout();
        handleInternshipPost();
        loadCompanyInternships();
    } else if (path.includes('/admin/applications.html')) {
        setupLogout();
        loadApplications();
    } else if (path.includes('/admin/profile.html')) {
        setupLogout();
        loadCompanyProfile();
        setupProfileEdit();
    }
});