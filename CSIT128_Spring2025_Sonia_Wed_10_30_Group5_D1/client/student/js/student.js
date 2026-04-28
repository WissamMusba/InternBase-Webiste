// client/js/student.js
// ===== GLOBAL CONFIG =====
const API_BASE_URL = 'http://localhost:3000/api';

// ===== CUSTOM ALERT MODAL =====
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
    messageModalContent.style.maxWidth = '600px';
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
async function fetchData(endpoint, options = {}, needsAuth = false) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (needsAuth) {
        const token = localStorage.getItem('studentToken');
        if (!token) {
            console.error('Authentication token not found for student.');
            showAlert('Session expired. Please log in again.');
            window.location.href = '/student/login.html';
            return null;
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers,
            ...options
        });

        if (needsAuth && (response.status === 401 || response.status === 403)) {
            localStorage.removeItem('studentToken');
            localStorage.removeItem('loggedInStudentName');
            localStorage.removeItem('loggedInStudentEmail');
            localStorage.removeItem('loggedInStudentId');

            showAlert('Session expired or unauthorized. Please log in again.');
            window.location.href = '/student/login.html';
            return null;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error.message);
        showAlert(`Error: ${error.message}`);
        return null;
    }
}

// ===== AUTH FUNCTIONS =====
function handleLogin() {
    const loginForm = document.getElementById('studentLoginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = loginForm.querySelector('#email').value;
        const password = loginForm.querySelector('#password').value;

        const formData = { email, password, role: 'student' };

        const data = await fetchData('/auth/login', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (data && data.token) {
            localStorage.setItem('studentToken', data.token);
            localStorage.setItem('loggedInStudentName', data.name || 'Student');
            localStorage.setItem('loggedInStudentEmail', data.email);
            localStorage.setItem('loggedInStudentId', data.userId);

            showAlert('✅ Login successful!');
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 500);
        } else {
        }
    });
}

function handleSignup() {
    const signupForm = document.getElementById('studentSignupForm');
    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = signupForm.querySelector('#fullName').value;
        const email = signupForm.querySelector('#email').value;
        const password = signupForm.querySelector('#password').value;
        const confirmPassword = signupForm.querySelector('#confirmPassword').value;

        if (password !== confirmPassword) {
            showAlert('❌ Passwords do not match!');
            return;
        }

        const formData = { name: fullName, email, password, role: 'student' };

        const data = await fetchData('/auth/register', {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (data && data.token) {
            localStorage.setItem('studentToken', data.token);
            localStorage.setItem('loggedInStudentName', data.name || 'Student');
            localStorage.setItem('loggedInStudentEmail', data.email);
            localStorage.setItem('loggedInStudentId', data.userId);

            showAlert('✅ Registration successful! You are now logged in.');
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1000);
        } else if (data) {
             showAlert('✅ Registration successful! Please log in.');
             setTimeout(() => {
                window.location.href = 'login.html';
             }, 1000);
        } else {
        }
    });
}

function setupLogout() {
    const logoutBtns = document.querySelectorAll('#logoutBtn');
    logoutBtns.forEach(logoutBtn => {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('studentToken');
            localStorage.removeItem('loggedInStudentName');
            localStorage.removeItem('loggedInStudentEmail');
            localStorage.removeItem('loggedInStudentId');

            showAlert('Logged out successfully.');
            setTimeout(() => {
                window.location.href = '/student/login.html';
            }, 500);
        });
    });
}

// ===== PROFILE PAGE FUNCTIONS =====
async function loadProfileData() {
    const studentProfileForm = document.getElementById('studentProfileForm');
    if (!studentProfileForm) return; // Only run if on profile page

    try {
        const data = await fetchData('/student/profile', {}, true); // Needs authentication
        if (data) {
            // Update the profile header section
            document.getElementById('studentName').textContent = data.student_name || 'Student';
            document.getElementById('studentEmail').textContent = data.email || 'Loading Email...';
            
            // Update the form fields
            document.getElementById('inputStudentName').value = data.student_name || '';
            document.getElementById('inputEmail').value = data.email || '';
            document.getElementById('inputMajor').value = data.major || '';
            document.getElementById('inputUniversity').value = data.university || '';
            document.getElementById('inputSkills').value = data.skills || '';
            document.getElementById('joinDate').value = new Date(data.created_at).toLocaleDateString();

            // Update stats
            document.getElementById('applicationCount').textContent = data.applicationCount || 0;
            document.getElementById('savedCount').textContent = data.savedCount || 0;

        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showAlert('Failed to load profile data.');
    }
}

function setupProfilePage() {
    const editProfileBtn = document.getElementById('editProfileBtn');
    const studentProfileForm = document.getElementById('studentProfileForm');
    const profileFormActions = document.getElementById('profileFormActions');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const formInputs = studentProfileForm ? studentProfileForm.querySelectorAll('input, textarea') : [];

    let originalValues = {}; // Store original values to revert on cancel

    if (editProfileBtn && studentProfileForm) {
        editProfileBtn.addEventListener('click', function() {
            formInputs.forEach(input => {
                // Skip the joinDate field - it should always remain readonly
                if (input.id === 'joinDate') return;
                
                originalValues[input.name] = input.value; // Store by input name
                input.removeAttribute('readonly');
            });
            editProfileBtn.style.display = 'none';
            profileFormActions.style.display = 'flex'; // Show save/cancel buttons
        });

        cancelEditBtn?.addEventListener('click', function() {
            formInputs.forEach(input => {
                // Skip the joinDate field
                if (input.id === 'joinDate') return;
                
                input.value = originalValues[input.name]; // Revert to original value
                input.setAttribute('readonly', true);
            });
            editProfileBtn.style.display = 'flex';
            profileFormActions.style.display = 'none'; // Hide save/cancel buttons
            showAlert('Profile edit cancelled.');
        });

        studentProfileForm.addEventListener('submit', async function(e) {
            e.preventDefault(); // Prevent default form submission

            const payload = {
                student_name: document.getElementById('inputStudentName').value,
                email: document.getElementById('inputEmail').value,
                major: document.getElementById('inputMajor').value,
                university: document.getElementById('inputUniversity').value,
                skills: document.getElementById('inputSkills').value
            };

            const result = await fetchData('/student/profile', {
                method: 'PUT',
                body: JSON.stringify(payload)
            }, true);

            if (result) {
                showAlert('✅ Profile updated successfully!');
                formInputs.forEach(input => {
                    // Skip the joinDate field - it should always remain readonly
                    if (input.id === 'joinDate') return;
                    input.setAttribute('readonly', true);
                });
                editProfileBtn.style.display = 'flex';
                profileFormActions.style.display = 'none'; // Hide save/cancel buttons
                loadProfileData(); // Reload data to ensure displayed values are updated
            } else {
                // Error handled by fetchData (will show an alert)
                // If update failed, keep fields editable so user can correct
                editProfileBtn.style.display = 'flex';
                profileFormActions.style.display = 'flex';
            }
        });
    }
}


// ===== BROWSE PAGE FUNCTIONS =====
let allInternshipsData = []; // Stores all internships for filtering

async function loadInternships() {
    const container = document.getElementById('internshipsList');
    if (!container) return;

    try {
        const internships = await fetchData('/student/internships', {}, true);

        container.innerHTML = '';

        if (internships && internships.length > 0) {
            allInternshipsData = internships; // Store the fetched data globally for filtering
            renderInternshipCards(allInternshipsData); // Initial render of all cards
            setupApplyButtons();
            setupViewDetailsButtons();
            setupFilters(); // Setup filters after data is loaded and stored
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No internships available at the moment.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading internships:', error);
        container.innerHTML = `
            <div class="empty-state error">
                <p>Failed to load internships. Please try again later.</p>
            </div>
        `;
    }
}

function renderInternshipCards(internshipsToRender) {
    const container = document.getElementById('internshipsList');
    container.innerHTML = '';

    if (internshipsToRender.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No internships matching your filters.</p>
            </div>
        `;
        return;
    }

    internshipsToRender.forEach(internship => {
        const internshipCard = document.createElement('div');
        internshipCard.className = 'internship-card';
        internshipCard.innerHTML = `
            <div class="card-header">
                <h3>${internship.title}</h3>
                <span class="location"><i class="fas fa-map-marker-alt"></i> ${internship.location} (${internship.type})</span>
            </div>
            <div class="card-body">
                <p><strong>Company:</strong> ${internship.company_name}</p>
                <p><strong>Stipend:</strong> ${internship.stipend || 'Unpaid'}</p>
                <p><strong>Duration:</strong> ${internship.duration}</p>
                <p><strong>Deadline:</strong> ${new Date(internship.deadline).toLocaleDateString()}</p>
                <p>${internship.description.substring(0, 150)}...</p>
                <!-- Removed Required Skills preview from card -->
            </div>
            <div class="card-footer">
                <button class="btn btn-primary apply-btn" data-id="${internship.internship_id}">Apply Now</button>
                <button class="btn btn-secondary view-details-btn" data-id="${internship.internship_id}">View Details</button>
            </div>
        `;
        container.appendChild(internshipCard);
    });
    setupViewDetailsButtons();
}

function setupApplyButtons() {
    document.querySelectorAll('.apply-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const internshipId = this.getAttribute('data-id');
            if (confirm('Are you sure you want to apply for this internship?')) { // Using browser confirm, consider custom modal
                const result = await fetchData(`/student/apply/${internshipId}`, {
                    method: 'POST'
                }, true);

                if (result) {
                    showAlert('✅ Application submitted successfully! You can view your applications in "My Applications".');
                    this.textContent = 'Applied';
                    this.disabled = true;
                    this.classList.remove('btn-primary');
                    this.classList.add('btn-secondary');
                } else {
                }
            }
        });
    });
}

let internshipDetailsModal;
let internshipDetailsModalContent;

function createInternshipDetailsModal() {
    internshipDetailsModal = document.createElement('div');
    internshipDetailsModal.className = 'modal-overlay';
    internshipDetailsModal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-btn">&times;</button>
            <h2 id="modalTitle"></h2>
            <p><strong>Company:</strong> <span id="modalCompany"></span></p>
            <p><strong>Location:</strong> <span id="modalLocation"></span> (<span id="modalType"></span>)</p>
            <p><strong>Stipend:</strong> <span id="modalStipend"></span></p>
            <p><strong>Duration:</strong> <span id="modalDuration"></span></p>
            <p><strong>Deadline:</strong> <span id="modalDeadline"></span></p>
            <h3>Description:</h3>
            <p id="modalDescription"></p>
            <!-- Removed Required Skills section from modal HTML -->
            <p style="margin-top: 15px;"><strong>Company Website:</strong> <a id="modalCompanyWebsite" href="#" target="_blank"></a></p>
            <div class="modal-actions">
                <button class="btn btn-primary modal-apply-btn">Apply Now</button>
            </div>
        </div>
    `;
    document.body.appendChild(internshipDetailsModal);

    internshipDetailsModalContent = internshipDetailsModal.querySelector('.modal-content');

    internshipDetailsModal.querySelector('.modal-close-btn').addEventListener('click', () => {
        internshipDetailsModal.classList.remove('active');
    });
    internshipDetailsModal.addEventListener('click', (e) => {
        if (e.target === internshipDetailsModal) {
            internshipDetailsModal.classList.remove('active');
        }
    });
}


async function showInternshipDetails(internshipId) {
    if (!internshipDetailsModal) {
        createInternshipDetailsModal();
    }

    try {
        const internship = await fetchData(`/internships/${internshipId}`, 'GET', null, false); // needsAuth: false for public view

        if (internship) {
            document.getElementById('modalTitle').textContent = internship.title;
            document.getElementById('modalCompany').textContent = internship.company_name;
            document.getElementById('modalLocation').textContent = internship.location;
            document.getElementById('modalType').textContent = internship.type;
            document.getElementById('modalStipend').textContent = internship.stipend || 'Unpaid';
            document.getElementById('modalDuration').textContent = internship.duration;
            document.getElementById('modalDeadline').textContent = new Date(internship.deadline).toLocaleDateString();
            document.getElementById('modalDescription').textContent = internship.description;
            // Removed required_skills display logic

            const companyWebsiteLink = document.getElementById('modalCompanyWebsite');
            if (internship.company_website) {
                companyWebsiteLink.href = internship.company_website.startsWith('http') ? internship.company_website : `https://${internship.company_website}`;
                companyWebsiteLink.textContent = internship.company_website;
                companyWebsiteLink.style.display = 'inline';
            } else {
                companyWebsiteLink.style.display = 'none';
            }

            const modalApplyBtn = internshipDetailsModal.querySelector('.modal-apply-btn');
            modalApplyBtn.onclick = async () => {
                if (confirm('Are you sure you want to apply for this internship?')) {
                    const result = await fetchData(`/student/apply/${internship.internship_id}`, { method: 'POST' }, true);
                    if (result) {
                        showAlert('✅ Application submitted successfully! Check "My Applications".');
                        internshipDetailsModal.classList.remove('active');
                        const originalCardBtn = document.querySelector(`.apply-btn[data-id="${internship.internship_id}"]`);
                        if (originalCardBtn) {
                            originalCardBtn.textContent = 'Applied';
                            originalCardBtn.disabled = true;
                            originalCardBtn.classList.remove('btn-primary');
                            originalCardBtn.classList.add('btn-secondary');
                        }
                    }
                }
            };

            internshipDetailsModal.classList.add('active');
        } else {
            showAlert('Internship details not found.');
        }
    } catch (error) {
        console.error('Error fetching internship details for modal:', error);
        showAlert('Failed to load internship details for display.');
    }
}


function setupViewDetailsButtons() {
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const internshipId = this.getAttribute('data-id');
            showInternshipDetails(internshipId);
        });
    });
}


function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const locationFilter = document.getElementById('locationFilter');
    const typeFilter = document.getElementById('typeFilter');

    if (!searchInput || !locationFilter || !typeFilter) {
        console.warn('Filter elements not found on this page.');
        return;
    }

    const applyFilters = () => {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedLocation = locationFilter.value.toLowerCase();
        const selectedType = typeFilter.value.toLowerCase();

        const filteredInternships = allInternshipsData.filter(internship => {
            const matchesSearch = internship.title.toLowerCase().includes(searchTerm) ||
                                  internship.company_name.toLowerCase().includes(searchTerm) ||
                                  internship.description.toLowerCase().includes(searchTerm); // Search description for skills

            const matchesLocation = selectedLocation === 'all' || internship.location.toLowerCase().includes(selectedLocation);
            const matchesType = selectedType === 'all' || internship.type.toLowerCase() === selectedType;

            return matchesSearch && matchesLocation && matchesType;
        });

        renderInternshipCards(filteredInternships);
    };

    searchInput.addEventListener('input', applyFilters);
    locationFilter.addEventListener('change', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
}


// ===== APPLICATIONS PAGE (STUDENT VIEW) FUNCTIONS =====
async function loadMyApplications() {
    const applicationsListContainer = document.querySelector('.applications-list');
    if (!applicationsListContainer) return;

    try {
        const applications = await fetchData('/student/applications/my', {}, true);

        applicationsListContainer.innerHTML = '';

        if (applications && applications.length > 0) {
            applications.forEach(app => {
                const appCard = document.createElement('div');
                appCard.className = `application-card`;
                appCard.setAttribute('data-status', app.status);
                appCard.innerHTML = `
                    <div class="application-header">
                        <h3>${app.internship_title}</h3>
                        <span class="status-badge ${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
                    </div>
                    <div class="application-details">
                        <p><strong>Company:</strong> ${app.company_name}</p>
                        <p><strong>Applied:</strong> ${new Date(app.applied_at).toLocaleDateString()}</p>
                        <p><strong>Location:</strong> ${app.internship_location}</p>
                    </div>
                    <button class="btn view-btn" data-internship-id="${app.internship_id}">View Internship Details</button>
                `;
                applicationsListContainer.appendChild(appCard);
            });
            setupApplicationTabs(applications);
            setupViewApplicationDetailsButtons();
        } else {
            applicationsListContainer.innerHTML = `
                <div class="empty-state">
                    <p>You haven't applied to any internships yet.</p>
                    <a href="browse.html" class="btn btn-primary">Browse Internships</a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading my applications:', error);
        showAlert('Failed to load your applications.');
    }
}

function setupApplicationTabs(allApplications) {
    const tabButtons = document.querySelectorAll('.status-tabs .tab-btn');
    const applicationsListContainer = document.querySelector('.applications-list');

    const filterApplications = (status) => {
        applicationsListContainer.innerHTML = '';

        const filtered = allApplications.filter(app => status === 'all' || app.status === status);

        if (filtered.length > 0) {
            filtered.forEach(app => {
                const appCard = document.createElement('div');
                appCard.className = `application-card`;
                appCard.setAttribute('data-status', app.status);
                appCard.innerHTML = `
                    <div class="application-header">
                        <h3>${app.internship_title}</h3>
                        <span class="status-badge ${app.status}">${app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
                    </div>
                    <div class="application-details">
                        <p><strong>Company:</strong> ${app.company_name}</p>
                        <p><strong>Applied:</strong> ${new Date(app.applied_at).toLocaleDateString()}</p>
                        <p><strong>Location:</strong> ${app.internship_location}</p>
                    </div>
                    <button class="btn view-btn" data-internship-id="${app.internship_id}">View Internship Details</button>
                `;
                applicationsListContainer.appendChild(appCard);
            });
            setupViewApplicationDetailsButtons();
        } else {
            applicationsListContainer.innerHTML = `
                <div class="empty-state">
                    <p>No applications found with status: ${status.charAt(0).toUpperCase() + status.slice(1)}.</p>
                </div>
            `;
        }
    };

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            filterApplications(this.getAttribute('data-status'));
        });
    });

    filterApplications('all');
}

async function setupViewApplicationDetailsButtons() {
    document.querySelectorAll('.applications-list .view-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const internshipId = parseInt(this.getAttribute('data-internship-id'));
            showInternshipDetails(internshipId);
        });
    });
}


// ===== INITIALIZATION & ROUTING =====
document.addEventListener('DOMContentLoaded', () => {
    createMessageModal();

    const path = window.location.pathname;

    // Student Pages
    if (path.includes('/student/login.html')) {
        handleLogin();
    } else if (path.includes('/student/signup.html')) {
        handleSignup();
    } else if (path.includes('/student/profile.html')) {
        setupLogout();
        loadProfileData();
        setupProfilePage();
    } else if (path.includes('/student/browse.html')) {
        setupLogout();
        loadInternships();
    } else if (path.includes('/student/applications.html')) {
        setupLogout();
        loadMyApplications();
    }
});
