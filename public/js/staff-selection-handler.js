/**
 * Staff Selection Handler
 * Handles staff selection specific functionality
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Staff selection handler loaded');
  
  // Initialize staff selection functionality
  initStaffSelection();
  
  // Initialize staff page specific bottom bar logic
  initStaffPageBottomBar();
});

function initStaffSelection() {
  // Get all staff cards
  var staffCards = document.querySelectorAll('.staff__card');
  
  staffCards.forEach(function(card) {
    card.addEventListener('click', function(e) {
      // Get staff name from the card
      var staffNameElement = this.querySelector('.staff__card-name');
      var staffName = staffNameElement ? staffNameElement.textContent.trim() : '';
      
      // Get staff ID from the parent link if possible
      var parentLink = this.closest('a');
      var staffId = '';
      
      if (parentLink) {
        var href = parentLink.getAttribute('href') || '';
        // Extract staff ID from URL pattern like /availability/[staffId]/[serviceId]
        var staffIdMatch = href.match(/\/availability\/([^\/]+)\//);
        if (staffIdMatch) {
          staffId = staffIdMatch[1];
        }
      }
      
      console.log('Staff selected:', {
        name: staffName,
        id: staffId,
        href: parentLink ? parentLink.getAttribute('href') : null
      });
      
      // Save staff selection if the global function is available
      if (typeof window.saveStaffSelection === 'function' && staffName) {
        window.saveStaffSelection(staffName, staffId);
      }
    });
  });
}

function initStaffPageBottomBar() {
  // On staff page, check if we have selected services from previous page
  var hasSelectedServices = checkForSelectedServices();
  
  // Update bottom bar visibility for staff page
  if (typeof updateBottomBarVisibility === 'function') {
    updateBottomBarVisibility();
  }
  
  // If we have services but no form, create a mock form state for the bottom bar
  if (hasSelectedServices && !document.querySelector('form[id="services-form"]')) {
    updateStaffPageBottomBar();
  }
}

function checkForSelectedServices() {
  // Check if we have services stored in sessionStorage or from URL parameters
  var urlParams = new URLSearchParams(window.location.search);
  var hasServices = false;
  
  // Check sessionStorage for selected services
  try {
    var storedServices = sessionStorage.getItem('selectedServices');
    if (storedServices) {
      var services = JSON.parse(storedServices);
      hasServices = services && services.length > 0;
    }
  } catch (e) {
    console.log('No stored services found');
  }
  
  // Check URL parameters
  if (!hasServices && (urlParams.has('services') || urlParams.has('serviceId'))) {
    hasServices = true;
  }
  
  return hasServices;
}

function updateStaffPageBottomBar() {
  var bottomBar = document.getElementById('summary-bottom-bar');
  var barCount = document.getElementById('summary-bar-count');
  var barNext = document.getElementById('summary-bar-next');
  
  if (!bottomBar) return;
  
  // Get stored services if available
  var serviceCount = 0;
  var serviceText = '';
  
  try {
    var storedServices = sessionStorage.getItem('selectedServices');
    if (storedServices) {
      var services = JSON.parse(storedServices);
      serviceCount = services.length;
      serviceText = serviceCount === 1 ? '1 service selected' : serviceCount + ' services selected';
    }
  } catch (e) {
    // Fallback text
    serviceText = 'Services selected';
    serviceCount = 1;
  }
  
  // Update bottom bar content
  if (barCount) {
    barCount.textContent = serviceText || 'Services selected';
  }
  
  // Update next button
  if (barNext) {
    barNext.disabled = false;
    // Remove form attribute since there's no services form on staff page
    barNext.removeAttribute('form');
    // Instead, make it navigate to the availability page when clicked
    barNext.addEventListener('click', function(e) {
      e.preventDefault();
      // The staff card clicks will handle navigation
      console.log('Next button clicked on staff page');
    });
  }
  
  // Show bottom bar if we have services and are in mobile view
  if (serviceCount > 0 && window.innerWidth <= 900) {
    bottomBar.classList.add('show');
  }
}

// Make functions globally available
window.initStaffSelection = initStaffSelection;
window.checkForSelectedServices = checkForSelectedServices;
