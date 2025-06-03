/**
 * Global Form Handler
 * Handles common form functionality across all pages
 */

document.addEventListener('DOMContentLoaded', function() {
  initGlobalFormHandlers();
});

function initGlobalFormHandlers() {
  // Set page data attribute for CSS targeting
  setPageDataAttribute();
  
  // Initialize bottom bar visibility on page load
  if (typeof updateBottomBarVisibility === 'function') {
    updateBottomBarVisibility();
  }
  
  // Handle form submissions
  initFormSubmissions();
  
  // Handle navigation
  initNavigationHandlers();
}

function setPageDataAttribute() {
  var body = document.body;
  var path = window.location.pathname;
  
  if (path.includes('/services')) {
    body.setAttribute('data-page', 'services');
  } else if (path.includes('/staff')) {
    body.setAttribute('data-page', 'staff');
  } else if (path.includes('/availability')) {
    body.setAttribute('data-page', 'availability');
  } else if (path.includes('/contact')) {
    body.setAttribute('data-page', 'contact');
  } else {
    body.setAttribute('data-page', 'other');
  }
}

function initFormSubmissions() {
  // Handle service form submissions
  var serviceForm = document.querySelector('form[id="services-form"]');
  if (serviceForm) {
    serviceForm.addEventListener('submit', function(e) {
      var checkedServices = this.querySelectorAll('input[type="checkbox"][name="services[]"]:checked');
      if (checkedServices.length === 0) {
        e.preventDefault();
        alert('Please select at least one service before continuing.');
        return false;
      }
    });
  }
  
  // Handle contact form submissions
  var contactForm = document.querySelector('form[action*="contact"]');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      var requiredFields = this.querySelectorAll('input[required], select[required], textarea[required]');
      var hasErrors = false;
      
      requiredFields.forEach(function(field) {
        if (!field.value.trim()) {
          field.style.borderColor = '#d00';
          hasErrors = true;
        } else {
          field.style.borderColor = '';
        }
      });
      
      if (hasErrors) {
        e.preventDefault();
        alert('Please fill in all required fields.');
        return false;
      }
    });
  }
}

function initNavigationHandlers() {
  // Handle back button navigation
  var backButtons = document.querySelectorAll('[data-action="back"]');
  backButtons.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    });
  });
}

// Global utility functions
function saveStaffSelection(staffName, staffId) {
  // Save staff selection to sessionStorage
  sessionStorage.setItem('selectedStaff', JSON.stringify({
    name: staffName,
    id: staffId,
    timestamp: Date.now()
  }));
  
  console.log('Staff selection saved:', { name: staffName, id: staffId });
}

function getSelectedStaff() {
  try {
    var stored = sessionStorage.getItem('selectedStaff');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error('Error getting selected staff:', e);
    return null;
  }
}

// Make functions globally available
window.saveStaffSelection = saveStaffSelection;
window.getSelectedStaff = getSelectedStaff;
window.initGlobalFormHandlers = initGlobalFormHandlers;
