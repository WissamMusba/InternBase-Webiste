// client/index_script.js

/* ==================== HERO SECTION TOGGLE FUNCTIONALITY ==================== */

// DOM elements for hero section toggle
const heroStudentToggle = document.getElementById('hero-student-toggle');
const heroCompanyToggle = document.getElementById('hero-company-toggle');
const heroStudentContent = document.getElementById('student-content');
const heroCompanyContent = document.getElementById('company-content');
const heroStudentButtons = document.getElementById('hero-student-buttons');
const heroCompanyButtons = document.getElementById('hero-company-buttons');

// Show student view in hero section
function showHeroStudentView() {
    heroStudentToggle.classList.add('active');
    heroCompanyToggle.classList.remove('active');
    heroStudentContent.classList.remove('hidden');
    heroCompanyContent.classList.add('hidden');
    heroStudentButtons.classList.remove('hidden');
    heroCompanyButtons.classList.add('hidden');
}

// Show company view in hero section
function showHeroCompanyView() {
    heroCompanyToggle.classList.add('active');
    heroStudentToggle.classList.remove('active');
    heroCompanyContent.classList.remove('hidden');
    heroStudentContent.classList.add('hidden');
    heroCompanyButtons.classList.remove('hidden');
    heroStudentButtons.classList.add('hidden');
}

// Event listeners for hero toggle buttons
heroStudentToggle.addEventListener('click', showHeroStudentView);
heroCompanyToggle.addEventListener('click', showHeroCompanyView);

/* ==================== HOW IT WORKS SECTION TOGGLE FUNCTIONALITY ==================== */

// Initialize toggle functionality when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    const howItWorksSection = document.getElementById('how-it-works');
    const toggleButtons = howItWorksSection?.querySelectorAll(".toggle-btn");
    const stepsContents = document.querySelectorAll(".steps-content");

    // Add click event listeners to toggle buttons
    toggleButtons?.forEach((btn) => {
        btn.addEventListener("click", () => {
            // Remove active class from all toggle buttons
            toggleButtons.forEach((b) => b.classList.remove("active"));
            // Add active class to clicked button
            btn.classList.add("active");

            // Get the type (student/company) from button data attribute
            const type = btn.getAttribute("data-type");

            // Hide all steps content
            stepsContents.forEach((content) => {
                content.classList.remove("active");
            });

            // Show the corresponding steps content
            document.getElementById(`${type}-steps`)?.classList.add("active");
        });
    });
});
