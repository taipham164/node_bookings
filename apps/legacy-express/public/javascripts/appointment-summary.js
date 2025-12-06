/**
 * Appointment Summary Component
 * Handles the appointment summary sidebar, mobile summary bar, and bottom sheet
 * Now with Firebase session persistence integration
 */

// Helper function to safely convert BigInt to Number
function safeBigIntToNumber(value) {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'string') {
    // Try to parse as BigInt first, then convert to Number
    try {
      return Number(BigInt(value));
    } catch (e) {
      // If that fails, try direct Number conversion
      return Number(value);
    }
  }
  return Number(value) || 0;
}

// Initialize appointment summary functionality with session persistence
document.addEventListener('DOMContentLoaded', function() {
  console.log('DEBUG: DOMContentLoaded - starting initialization with session persistence');
  
  // Initialize session persistence first
  if (window.sessionPersistence) {
    console.log('DEBUG: Session persistence available, restoring data...');
    // Restore data for current page after a short delay to allow DOM to settle
    setTimeout(() => {
      window.sessionPersistence.restoreCurrentPageData();
    }, 300);
  } else {
    console.log('DEBUG: Session persistence not available yet, will retry...');
    // Retry after session persistence loads
    setTimeout(() => {
      if (window.sessionPersistence) {
        window.sessionPersistence.restoreCurrentPageData();
      }
    }, 500);
  }

  // Check which page we're on
  var staffForm = document.querySelector('form[id="staff-form"]');
  var servicesForm = document.querySelector('form[id="services-form"]');
  var availabilityPage = document.querySelector('.availability-container');
  var contactPage = document.querySelector('.contact-container') || document.querySelector('form[action="/contact"]');
  
  console.log('DEBUG: Page detection:', {
    staffForm: !!staffForm,
    servicesForm: !!servicesForm,
    availabilityPage: !!availabilityPage,
    contactPage: !!contactPage
  });
  
  // Update button text based on current page
  updateButtonText();
  
  if (staffForm) {
    console.log('DEBUG: Initializing staff page');
    initStaffPageSummary();
  } else if (servicesForm) {
    console.log('DEBUG: Initializing services page');
    // Original service page functionality
    initAppointmentSummary();
    initMobileBottomBar();
    initBottomSheet();
    initFloatingButton();

    // Initial state update
    if (typeof enforceLimits === 'function') {
      enforceLimits();
    }
    updateAppointmentSummary();
    updateBarAndSheet();
  } else if (availabilityPage) {
    console.log('DEBUG: Initializing availability page');
    console.log('DEBUG: window.serviceDetails at main init:', window.serviceDetails);
    // Availability page functionality
    initAvailabilityPageSummary();
  } else if (contactPage) {
    console.log('DEBUG: Initializing contact page');
    initContactPageSummary();
  } else {
    console.log('DEBUG: No matching page type found');
  }
  
  // Set up form handlers for appointment summary buttons
  setupFormHandlers();
});

// Listen for quantity changes from the template's changeQty function
document.addEventListener('quantityChanged', function(e) {
  console.log('Quantity changed event received:', e.detail);
  updateAppointmentSummary();
  updateBarAndSheet();
  
  // Save service selections when quantities change
  if (window.sessionPersistence) {
    setTimeout(() => window.sessionPersistence.saveServiceSelections(), 100);
  }
});

// Listen for service limits changes from the services page
document.addEventListener('serviceLimitsChanged', function(e) {
  console.log('Service limits changed event received:', e.detail);
  const { hasSelections, overLimits } = e.detail;
  
  // Update all appointment summary buttons based on limits
  const buttonIds = ['continue-btn', 'summary-bar-next', 'summary-sheet-next'];
  buttonIds.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      if (hasSelections) {
        btn.style.display = '';
        btn.disabled = overLimits;
        if (overLimits) {
          btn.setAttribute('disabled', 'disabled');
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
        } else {
          btn.removeAttribute('disabled');
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
        }
      } else {
        btn.style.display = 'none';
      }
    }
  });

  // Save service selections when limits change
  if (window.sessionPersistence && hasSelections) {
    setTimeout(() => window.sessionPersistence.saveServiceSelections(), 100);
  }
});

// Set up form submission handlers for appointment summary buttons
function setupFormHandlers() {
  var staffForm = document.querySelector('form[id="staff-form"]');
  var servicesForm = document.querySelector('form[id="services-form"]');
  var targetForm = staffForm || servicesForm;
  
  if (!targetForm) return;
  
  var continueBtn = document.getElementById('continue-btn');
  var summaryBarNext = document.getElementById('summary-bar-next');
  var summarySheetNext = document.getElementById('summary-sheet-next');
  
  // Set up click handlers for all summary buttons
  [continueBtn, summaryBarNext, summarySheetNext].forEach(function(btn) {
    if (btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        targetForm.submit();
      };
    }
  });
}

// Function to update button text based on current page
function updateButtonText(page) {
  var staffForm = document.querySelector('form[id="staff-form"]');
  var servicesForm = document.querySelector('form[id="services-form"]');
  var availabilityPage = document.querySelector('.availability-container');
  var contactPage = document.querySelector('.contact-container') || document.querySelector('form[action="/contact"]');
  
  // Skip button text update on contact page since buttons are hidden
  if (contactPage) {
    return;
  }
  
  var buttonText = 'Next';
  if (page === 'availability' || availabilityPage) {
    buttonText = 'Continue to Contact Details';
  } else if (servicesForm) {
    buttonText = 'Continue to Staff Select';
  } else if (staffForm) {
    buttonText = 'Continue to Date & Time';
  }
  
  // Update all Next buttons
  const buttons = [
    { id: 'continue-btn', selector: 'span' },
    { id: 'summary-bar-next', selector: 'span' },
    { id: 'summary-sheet-next', selector: 'span' }
  ];
  
  buttons.forEach(button => {
    const btn = document.getElementById(button.id);
    if (btn) {
      const span = btn.querySelector(button.selector);
      if (span) {
        span.textContent = buttonText;
      }
    }
  });
}

// Main appointment summary update function
function updateAppointmentSummary() {
  var form = document.querySelector('form[id="services-form"]');
  var summaryList = document.getElementById('summary-list');
  var summaryItems = document.getElementById('summary-items');
  var summaryEmpty = document.getElementById('summary-empty');
  
  if (!form || !summaryList || !summaryItems || !summaryEmpty) return;

  var checked = form.querySelectorAll('input[type="checkbox"][name="services[]"]:checked');
  var continueBtn = document.getElementById('continue-btn');
  var summaryBarNext = document.getElementById('summary-bar-next');
  var summarySheetNext = document.getElementById('summary-sheet-next');
  
  summaryItems.innerHTML = '';
  let hasItems = false;
  
  // Check service limits
  let checkedCount = 0;
  let totalQty = 0;
  const MAX_DIFFERENT_SERVICES = 3;
  const MAX_TOTAL_AMOUNT = 3;
  
  checked.forEach(function(cb) {
    checkedCount++;
    var qtyInput = document.getElementById('quantity-' + cb.value);
    var qty = qtyInput && !qtyInput.disabled ? parseInt(qtyInput.value, 10) || 1 : 1;
    totalQty += qty;
  });
  
  const overLimits = checkedCount > MAX_DIFFERENT_SERVICES || totalQty > MAX_TOTAL_AMOUNT;
  console.log('DEBUG: updateAppointmentSummary limits check:', {
    checkedCount, totalQty, overLimits, MAX_DIFFERENT_SERVICES, MAX_TOTAL_AMOUNT
  });
  
  checked.forEach(function(cb) {
    var label = cb.closest('.service-label');
    var name = label ? label.querySelector('h4')?.textContent?.trim() : '';
    var qtyInput = document.getElementById('quantity-' + cb.value);
    var qty = qtyInput && !qtyInput.disabled ? parseInt(qtyInput.value, 10) || 1 : 1;
    var priceSpan = label ? label.querySelector('span[style*="color:#0070f3"]') : null;
    var price = priceSpan ? priceSpan.textContent.trim() : '';
    var durationSpan = label ? label.querySelector('span[style*="color:#888"]') : null;
    var duration = durationSpan ? durationSpan.textContent.trim().replace(/^[\u2022]\s*/, '') : '';
    var li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';
    li.style.padding = '8px 0';
    li.innerHTML =
      '<div>' +
        '<div style="font-weight:600;">' + name + (qty > 1 ? ' <span style="color:#0070f3;font-weight:500;">x' + qty + '</span>' : '') + '</div>' +
        '<div style="font-size:0.97em;color:#666;">' +
          (price ? '<span>' + price + '</span>' : '') +
          (duration ? '<span style="margin-left:8px;">' + duration + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<button type="button" class="remove-summary-item" data-id="' + cb.value + '" style="background:none;border:none;color:#d00;font-size:1.2em;cursor:pointer;padding:0 8px;">&times;</button>';
    summaryItems.appendChild(li);
    hasItems = true;
  });
  
  // Calculate and display totals for services page
  if (hasItems) {
    var totalDuration = 0;
    var totalPrice = 0;
    
    // Calculate totals from checked services (using same logic as updateBarAndSheet)
    checked.forEach(function(cb) {
      var label = cb.closest('.service-label');
      if (!label) return;

      var qtyInput = document.getElementById('quantity-' + cb.value);
      var qty = qtyInput && !qtyInput.disabled ? parseInt(qtyInput.value, 10) || 1 : 1;

      // Get price and duration using the same selectors as updateBarAndSheet
      var priceSpan = label.querySelector('span[style*="color:#0070f3"]');
      var durationSpan = label.querySelector('span[style*="color:#888"]');
      
      // Calculate duration
      if (durationSpan) {
        var durationText = durationSpan.textContent.trim().replace(/^[\u2022]\s*/, '');
        var minutes = 0;
        if (durationText.includes('hr')) {
          var parts = durationText.split('hr');
          minutes = parseInt(parts[0].trim()) * 60;
          if (parts[1] && parts[1].includes('min')) {
            minutes += parseInt(parts[1].replace(/[^0-9]/g, ''));
          }
        } else if (durationText.includes('min')) {
          minutes = parseInt(durationText);
        }
        totalDuration += minutes * qty;
      }

      // Calculate price
      if (priceSpan) {
        var price = parseFloat(priceSpan.textContent.replace(/[^0-9.]/g, ''));
        if (!isNaN(price)) {
          totalPrice += price * qty;
        }
      }
    });
    
    // Add totals section to services page (only if 2 or more services OR 1 service with qty >= 2)
    var shouldShowTotals = checked.length >= 2;
    if (!shouldShowTotals && checked.length === 1) {
      // Check if single service has quantity >= 2
      var cb = checked[0];
      var qtyInput = document.getElementById('quantity-' + cb.value);
      var qty = qtyInput && !qtyInput.disabled ? parseInt(qtyInput.value, 10) || 1 : 1;
      shouldShowTotals = qty >= 2;
    }
    
    if (shouldShowTotals && (totalDuration > 0 || totalPrice > 0)) {
      var totalsLi = document.createElement('li');
      totalsLi.style.display = 'flex';
      totalsLi.style.alignItems = 'center';
      totalsLi.style.justifyContent = 'space-between';
      totalsLi.style.marginTop = '16px';
      totalsLi.style.padding = '12px 0';
      totalsLi.style.borderTop = '2px solid #e9ecef';
      totalsLi.style.fontWeight = '600';
      totalsLi.style.fontSize = '1rem';
      
      var totalsInfo = document.createElement('div');
      
      var totalsTitle = document.createElement('div');
      totalsTitle.style.fontWeight = '700';
      totalsTitle.style.color = '#333';
      totalsTitle.textContent = 'Total';
      
      var totalsDetails = document.createElement('div');
      totalsDetails.style.fontSize = '0.9rem';
      totalsDetails.style.color = '#666';
      totalsDetails.style.marginTop = '4px';
      
      // Format total duration
      var totalDurationText = '';
      if (totalDuration > 0) {
        var hours = Math.floor(totalDuration / 60);
        var mins = totalDuration % 60;
        if (hours > 0) {
          totalDurationText = hours + 'h';
          if (mins > 0) totalDurationText += ' ' + mins + 'min';
        } else {
          totalDurationText = mins + 'min';
        }
      }
      
      // Format total price
      var totalPriceText = '';
      if (totalPrice > 0) {
        totalPriceText = '$' + totalPrice.toFixed(2);
      }
      
      var detailsContent = '';
      if (totalDurationText) {
        detailsContent += totalDurationText;
      }
      if (totalPriceText) {
        detailsContent += (detailsContent ? ' • ' : '') + '<span style="color: #28a745; font-weight: 600;">' + totalPriceText + '</span>';
      }
      
      totalsDetails.innerHTML = detailsContent;
      
      totalsInfo.appendChild(totalsTitle);
      totalsInfo.appendChild(totalsDetails);
      
      totalsLi.appendChild(totalsInfo);
      summaryItems.appendChild(totalsLi);
    }
  }
  
  // Update summary visibility
  summaryItems.style.display = hasItems ? 'block' : 'none';
  summaryEmpty.style.display = hasItems ? 'none' : 'block';  // Update all next buttons with enhanced styling for inline button
  const nextButtons = [continueBtn, summaryBarNext, summarySheetNext];
  nextButtons.forEach(btn => {
    if (btn) {
      if (hasItems) {
        btn.style.display = btn === continueBtn ? 'block' : '';
        // Disable button if over limits, otherwise enable based on hasItems
        btn.disabled = overLimits;
        if (overLimits) {
          btn.setAttribute('disabled', 'disabled');
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
          console.log('DEBUG: Button disabled due to limits:', btn.id || 'unknown');
        } else {
          btn.removeAttribute('disabled');
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
          console.log('DEBUG: Button enabled:', btn.id || 'unknown');
        }
        // Enhanced styling for inline continue button
        if (btn === continueBtn) {
          btn.style.opacity = overLimits ? '0.5' : '1';
          btn.style.cursor = overLimits ? 'not-allowed' : 'pointer';
        }
      } else {
        btn.style.display = 'none'; // Hide the button completely when no items
        if (btn === continueBtn) {
          btn.style.opacity = '0.5';
          btn.style.cursor = 'not-allowed';
        }
      }
    }
  });
}

// Initialize the appointment summary component
function initAppointmentSummary() {
  var form = document.querySelector('form[id="services-form"]');
  var summaryItems = document.getElementById('summary-items');
  
  if (!form || !summaryItems) return;

  // Handle remove item from summary
  summaryItems.addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-summary-item')) {
      var id = e.target.getAttribute('data-id');
      var cb = form.querySelector('input[type="checkbox"][name="services[]"][value="' + id + '"]');
      if (cb) {
        cb.checked = false;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  // Update summary on checkbox/qty change
  form.addEventListener('change', updateAppointmentSummary);
  form.addEventListener('input', function(e) {
    if (e.target.name && e.target.name.startsWith('quantities[')) {
      updateAppointmentSummary();
    }
  });
}

// Mobile summary toggle functionality
function initMobileBottomBar() {
  var summary = document.getElementById('appointment-summary');
  var toggleBtn = document.getElementById('summary-toggle-btn');
  var overlay = document.getElementById('summary-mobile-overlay');
  var closeBtn = document.getElementById('summary-close-btn');
  
  if (!summary || !closeBtn) return;
  
  function openSummary() {
    summary.classList.add('mobile-open');
    if (overlay) overlay.style.display = 'block';
    closeBtn.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
  
  function closeSummary() {
    summary.classList.remove('mobile-open');
    if (overlay) overlay.style.display = 'none';
    closeBtn.style.display = 'none';
    document.body.style.overflow = '';
  }
  
  if (toggleBtn && overlay) {
    toggleBtn.addEventListener('click', openSummary);
    closeBtn.addEventListener('click', closeSummary);
    overlay.addEventListener('click', closeSummary);
  }
  
  // Mobile/desktop responsive adjustments
  function handleResize() {
    if (window.innerWidth <= 900) {
      if (toggleBtn) toggleBtn.style.display = 'flex';
      summary.classList.remove('mobile-open');
      if (overlay) overlay.style.display = 'none';
      closeBtn.style.display = 'none';
    } else {
      if (toggleBtn) toggleBtn.style.display = 'none';
      summary.classList.remove('mobile-open');
      if (overlay) overlay.style.display = 'none';
      closeBtn.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
  
  window.addEventListener('resize', handleResize);
  handleResize();
}

// Bottom sheet functionality
function initBottomSheet() {
  var form = document.querySelector('form[id="services-form"]');
  var bar = document.getElementById('summary-bottom-bar');
  var sheet = document.getElementById('summary-bottom-sheet');
  var barExpand = document.getElementById('summary-bar-expand');
  var sheetClose = document.getElementById('summary-sheet-close');
  var overlay = document.getElementById('summary-sheet-overlay');
  var sheetItems = document.getElementById('summary-sheet-items');
  
  if (!form || !bar || !sheet) return;

  // Bottom sheet toggle functions
  function openBottomSheet() {
    sheet.style.display = 'block';
    sheet.classList.add('open');
    if (overlay) {
      overlay.style.display = 'block';
      setTimeout(function() {
        overlay.classList.add('open');
      }, 10);
    }
    if (barExpand) barExpand.classList.add('sheet-open');
    document.body.style.overflow = 'hidden';
  }

  function closeBottomSheet() {
    sheet.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    if (barExpand) barExpand.classList.remove('sheet-open');
    document.body.style.overflow = '';
    
    // Wait for animation to complete before hiding
    setTimeout(function() {
      sheet.style.display = 'none';
      if (overlay) overlay.style.display = 'none';
    }, 300);
  }

  // Event listeners for bottom sheet
  if (barExpand) barExpand.addEventListener('click', openBottomSheet);
  if (sheetClose) sheetClose.addEventListener('click', closeBottomSheet);
  if (overlay) overlay.addEventListener('click', closeBottomSheet);

  // Remove items from sheet
  if (sheetItems) {
    sheetItems.addEventListener('click', function(e) {
      var removeBtn = e.target.closest('button');
      if (removeBtn) {
        var id = removeBtn.getAttribute('data-id');
        var checkbox = form.querySelector(`input[type="checkbox"][value="${id}"]`);
        if (checkbox) {
          checkbox.checked = false;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
  }
}

// Update mobile bar and bottom sheet
function updateBarAndSheet() {
  var form = document.querySelector('form[id="services-form"]');
  var bar = document.getElementById('summary-bottom-bar');
  var barCount = document.getElementById('summary-bar-count');
  var barTotal = document.getElementById('summary-bar-total');
  var barDuration = document.getElementById('summary-bar-duration');
  var barNext = document.getElementById('summary-bar-next');
  var sheetItems = document.getElementById('summary-sheet-items');
  var sheetEmpty = document.getElementById('summary-sheet-empty');
  
  if (!form || !bar) return;
  
  var checked = form.querySelectorAll('input[type="checkbox"][name="services[]"]:checked');
  var totalItems = 0;
  var serviceCount = 0;
  var totalDuration = 0;
  var totalPrice = 0;

  // Clear sheet items
  if (sheetItems) sheetItems.innerHTML = '';

  checked.forEach(function(cb) {
    var label = cb.closest('.service-label');
    if (!label) return;

    var qtyInput = document.getElementById('quantity-' + cb.value);
    var qty = qtyInput && !qtyInput.disabled ? parseInt(qtyInput.value, 10) || 1 : 1;
    totalItems += qty;
    serviceCount++;

    // Get name, price and duration
    var name = label.querySelector('h4')?.textContent?.trim() || '';
    var priceSpan = label.querySelector('span[style*="color:#0070f3"]');
    var durationSpan = label.querySelector('span[style*="color:#888"]');
    
    // Calculate duration
    if (durationSpan) {
      var durationText = durationSpan.textContent.trim().replace(/^[\u2022]\s*/, '');
      var minutes = 0;
      if (durationText.includes('hr')) {
        var parts = durationText.split('hr');
        minutes = parseInt(parts[0].trim()) * 60;
        if (parts[1] && parts[1].includes('min')) {
          minutes += parseInt(parts[1].replace(/[^0-9]/g, ''));
        }
      } else if (durationText.includes('min')) {
        minutes = parseInt(durationText);
      }
      totalDuration += minutes * qty;
    }

    // Calculate price
    if (priceSpan) {
      var price = parseFloat(priceSpan.textContent.replace(/[^0-9.]/g, ''));
      if (!isNaN(price)) {
        totalPrice += price * qty;
      }
    }

    // Add to sheet items
    if (sheetItems) {
      var li = document.createElement('li');
      li.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee;';
      li.innerHTML = `
        <div>
          <div style="font-weight:600;">${name}${qty > 1 ? ` <span style="color:#0070f3;font-weight:500;">x${qty}</span>` : ''}</div>
          <div style="font-size:0.92em;color:#666;margin-top:4px;">
            ${durationSpan ? `<span>${durationText}</span>` : ''}
            ${priceSpan ? `<span style="margin-left:8px;color:#0070f3;">${priceSpan.textContent.trim()}</span>` : ''}
          </div>
        </div>
        <button type="button" data-id="${cb.value}" 
          style="background:none;border:none;color:#d00;font-size:1.2em;cursor:pointer;padding:0 8px;">&times;</button>
      `;
      sheetItems.appendChild(li);
    }
  });

  // Add totals section to mobile bottom sheet for services page (only if 2 or more services OR 1 service with qty >= 2)
  var shouldShowTotals = checked.length >= 2;
  if (!shouldShowTotals && checked.length === 1) {
    // Check if single service has quantity >= 2
    var cb = checked[0];
    var qtyInput = document.getElementById('quantity-' + cb.value);
    var qty = qtyInput && !qtyInput.disabled ? parseInt(qtyInput.value, 10) || 1 : 1;
    shouldShowTotals = qty >= 2;
  }
  
  if (sheetItems && totalItems > 0 && shouldShowTotals && (totalDuration > 0 || totalPrice > 0)) {
    var totalsLi = document.createElement('li');
    totalsLi.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px 0;margin-top:12px;border-top:2px solid #e9ecef;font-weight:600;';
    
    var totalsInfo = document.createElement('div');
    
    var totalsTitle = document.createElement('div');
    totalsTitle.style.fontWeight = '700';
    totalsTitle.style.color = '#333';
    totalsTitle.textContent = 'Total';
    
    var totalsDetails = document.createElement('div');
    totalsDetails.style.fontSize = '0.95em';
    totalsDetails.style.color = '#666';
    totalsDetails.style.marginTop = '4px';
    
    // Format total duration
    var totalDurationText = '';
    if (totalDuration > 0) {
      var hours = Math.floor(totalDuration / 60);
      var mins = totalDuration % 60;
      if (hours > 0) {
        totalDurationText = hours + 'h';
        if (mins > 0) totalDurationText += ' ' + mins + 'min';
      } else {
        totalDurationText = mins + 'min';
      }
    }
    
    // Format total price
    var totalPriceText = '';
    if (totalPrice > 0) {
      totalPriceText = '$' + (totalPrice / 100).toFixed(2);
    }
    
    var detailsContent = '';
    if (totalDurationText) {
      detailsContent += totalDurationText;
    }
    if (totalPriceText) {
      detailsContent += (detailsContent ? ' • ' : '') + '<span style="color: #28a745; font-weight: 600;">' + totalPriceText + '</span>';
    }
    
    totalsDetails.innerHTML = detailsContent;
    
    totalsInfo.appendChild(totalsTitle);
    totalsInfo.appendChild(totalsDetails);
    
    totalsLi.appendChild(totalsInfo);
    sheetItems.appendChild(totalsLi);
  }

  // Update bottom sheet visibility
  if (sheetItems && sheetEmpty) {
    sheetItems.style.display = totalItems > 0 ? 'block' : 'none';
    sheetEmpty.style.display = totalItems > 0 ? 'none' : 'block';
  }

  // Update bar display - Modified for better mobile display
  if (totalItems > 0) {
    var description = totalItems === 1 ? '1 service selected' : totalItems + ' services selected';
    if (barCount) barCount.textContent = description;
    if (barTotal) barTotal.textContent = totalPrice > 0 ? '$' + totalPrice.toFixed(2) : '';
    
    // Format duration
    var hours = Math.floor(totalDuration / 60);
    var mins = totalDuration % 60;
    var durationText = '';
    if (hours > 0) {
      durationText += hours + (hours === 1 ? ' hr ' : ' hrs ');
    }
    if (mins > 0 || hours === 0) {
      durationText += mins + ' min';
    }
    if (barDuration) barDuration.textContent = durationText;
    
    // Only show bar on mobile
    if (window.innerWidth <= 900) {
      bar.classList.add('show');
    } else {
      bar.classList.remove('show');
    }
    
    if (barNext) barNext.disabled = false;
  } else {
    bar.classList.remove('show');
    if (barNext) barNext.disabled = true;
  }
}

// Add resize handler to show/hide bottom bar based on screen width
window.addEventListener('resize', function() {
  // Only show the bottom bar on mobile if there are items
  var form = document.querySelector('form[id="services-form"]');
  if (!form) return;
  
  var hasItems = form.querySelectorAll('input[type="checkbox"][name="services[]"]:checked').length > 0;
  var bottomBar = document.getElementById('summary-bottom-bar');
  
  if (bottomBar) {
    if (window.innerWidth <= 900 && hasItems) {
      bottomBar.classList.add('show');
    } else {
      bottomBar.classList.remove('show');
    }
  }
});

// Initialize floating button functionality
function initFloatingButton() {
  var continueBtn = document.getElementById('continue-btn');
  var form = document.querySelector('form[id="services-form"]');
  
  if (!continueBtn || !form) return;

  // Handle form submission
  form.addEventListener('submit', function(e) {
    var hasItems = form.querySelectorAll('input[type="checkbox"][name="services[]"]:checked').length > 0;
    if (!hasItems) {
      e.preventDefault();
      return;
    }

    // Show loading state
    continueBtn.disabled = true;
    continueBtn.style.opacity = '0.7';
    continueBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Loading...';
  });
}

// Staff page specific functionality
function initStaffPageSummary() {
  console.log('DEBUG: initStaffPageSummary called');
  var staffForm = document.querySelector('form[id="staff-form"]');
  console.log('DEBUG: staffForm found:', !!staffForm);
  if (!staffForm) return; // Not on staff page
  
  // Initial load - populate with session data
  updateStaffPageSummary();
  
  // Listen for staff selection changes
  var staffRadios = staffForm.querySelectorAll('input[name="staffId"]');
  console.log('DEBUG: staffRadios found:', staffRadios.length);
  staffRadios.forEach(function(radio, index) {
    console.log('DEBUG: Setting up listener for radio', index, 'value:', radio.value);
    radio.addEventListener('change', function() {
      console.log('DEBUG: Radio change event fired for:', radio.value);
      updateStaffPageSummary();
      
      // Save staff selection when changed
      if (window.sessionPersistence) {
        setTimeout(() => window.sessionPersistence.saveStaffSelection(), 100);
      }
    });
  });
  
  // Initialize mobile bottom sheet for staff page
  initStaffBottomSheet();
  
  // Handle mobile bottom bar for staff page
  updateStaffBarAndSheet();
  
  // Update on window resize
  window.addEventListener('resize', function() {
    updateStaffBarAndSheet();
  });
}

// Update appointment summary for staff page
function updateStaffPageSummary() {
  console.log('DEBUG: updateStaffPageSummary called');
  console.log('DEBUG: window.serviceDetails at function start:', window.serviceDetails);
  
  var summaryList = document.getElementById('summary-list');
  var summaryItems = document.getElementById('summary-items');
  var summaryEmpty = document.getElementById('summary-empty');
  var continueBtn = document.getElementById('continue-btn');
  var summaryBarNext = document.getElementById('summary-bar-next');
  var summarySheetNext = document.getElementById('summary-sheet-next');
  
  console.log('DEBUG: Elements found:', {
    summaryList: !!summaryList,
    summaryItems: !!summaryItems,
    summaryEmpty: !!summaryEmpty,
    continueBtn: !!continueBtn,
    summaryBarNext: !!summaryBarNext,
    summarySheetNext: !!summarySheetNext
  });
  
  if (!summaryList || !summaryItems || !summaryEmpty) {
    console.log('DEBUG: Missing required elements, returning early');
    return;
  }
  
  // Get selected staff
  var selectedStaff = document.querySelector('input[name="staffId"]:checked');
  console.log('DEBUG: selectedStaff:', selectedStaff);
  console.log('DEBUG: selectedStaff value:', selectedStaff ? selectedStaff.value : 'none');
  
  var staffName = '';
  if (selectedStaff) {
    if (selectedStaff.value === 'anyStaffMember') {
      staffName = 'Any Available Staff';
    } else {
      var staffCard = selectedStaff.closest('.staff-card');
      var staffNameElement = staffCard ? staffCard.querySelector('.staff-info h4') : null;
      if (staffNameElement) {
        staffName = staffNameElement.textContent.trim();
      }
    }
  }
  
  console.log('DEBUG: staffName:', staffName);
  
  // Show services in summary (this data comes from the server)
  var hasItems = typeof window.serviceDetails !== 'undefined' && window.serviceDetails && window.serviceDetails.length > 0;
  console.log('DEBUG: hasItems:', hasItems);
  console.log('DEBUG: window.serviceDetails:', window.serviceDetails);
  console.log('DEBUG: window.serviceDetails JSON:', JSON.stringify(window.serviceDetails, null, 2));
  
  if (hasItems) {
    summaryList.style.display = 'block';
    summaryEmpty.style.display = 'none';
    summaryItems.style.display = 'block'; // Make sure the items list is visible
    
    summaryItems.innerHTML = '';
    
    window.serviceDetails.forEach(function(service, index) {
      console.log('DEBUG: Processing service', index, ':', JSON.stringify(service, null, 2));
      var li = document.createElement('li');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.justifyContent = 'space-between';
      li.style.marginBottom = '12px';
      li.style.padding = '8px 0';
      li.style.borderBottom = '1px solid #f0f0f0';
      
      var serviceInfo = document.createElement('div');
      serviceInfo.style.flex = '1';
      
      var serviceName = document.createElement('div');
      serviceName.style.fontWeight = '600';
      serviceName.style.color = '#333';
      serviceName.textContent = service.name;
      if (service.quantity > 1) {
        serviceName.textContent += ' (x' + service.quantity + ')';
      }
      // Add staff name inline with service name
      if (staffName) {
        serviceName.innerHTML = service.name + 
          (service.quantity > 1 ? ' (x' + service.quantity + ')' : '') + 
          ' <span style="color: #667eea; font-weight: 500;">- with ' + staffName + '</span>';
      }
      
      var serviceDetails = document.createElement('div');
      serviceDetails.style.fontSize = '0.85rem';
      serviceDetails.style.color = '#666';
      serviceDetails.style.marginTop = '2px';
      
      var duration = '';
      if (service.duration) {
        // Convert duration from milliseconds to minutes using safe conversion
        var durationMs = safeBigIntToNumber(service.duration);
        var minutes = Math.round(durationMs / 60000); // Convert milliseconds to minutes
        var hours = Math.floor(minutes / 60);
        var mins = minutes % 60;
        if (hours > 0) {
          duration = hours + 'h';
          if (mins > 0) duration += ' ' + mins + 'm';
        } else {
          duration = mins + 'm';
        }
      }
      
      var price = '';
      if (service.price && service.price.amount) {
        var amount = safeBigIntToNumber(service.price.amount);
        price = '$' + (amount / 100).toFixed(2);
      }
      
      serviceDetails.innerHTML = '<i class="fas fa-clock me-1"></i>' + duration;
      if (price) {
        serviceDetails.innerHTML += ' • <span style="color: #28a745;">' + price + '</span>';
      }
      
      serviceInfo.appendChild(serviceName);
      serviceInfo.appendChild(serviceDetails);
      
      li.appendChild(serviceInfo);
      summaryItems.appendChild(li);
    });
    
    // Calculate and display totals
    var totalDuration = 0;
    var totalPrice = 0;
    
    window.serviceDetails.forEach(function(service) {
      // Calculate total duration
      if (service.duration) {
        var durationMs = safeBigIntToNumber(service.duration);
        var durationMinutes = Math.round(durationMs / 60000);
        totalDuration += durationMinutes * (service.quantity || 1);
      }
      
      // Calculate total price
      if (service.price && service.price.amount) {
        var amount = safeBigIntToNumber(service.price.amount);
        totalPrice += amount * (service.quantity || 1);
      }
    });
    
    // Add totals section (only if 2 or more services OR 1 service with qty >= 2)
    var shouldShowTotals = window.serviceDetails.length >= 2;
    if (!shouldShowTotals && window.serviceDetails.length === 1) {
      // Check if single service has quantity >= 2
      shouldShowTotals = (window.serviceDetails[0].quantity || 1) >= 2;
    }
    
    if (shouldShowTotals) {
      var totalsLi = document.createElement('li');
      totalsLi.style.display = 'flex';
      totalsLi.style.alignItems = 'center';
      totalsLi.style.justifyContent = 'space-between';
      totalsLi.style.marginTop = '16px';
      totalsLi.style.padding = '12px 0';
      totalsLi.style.borderTop = '2px solid #e9ecef';
      totalsLi.style.fontWeight = '600';
      totalsLi.style.fontSize = '1rem';
      
      var totalsInfo = document.createElement('div');
      
      var totalsTitle = document.createElement('div');
      totalsTitle.style.fontWeight = '700';
      totalsTitle.style.color = '#333';
      totalsTitle.textContent = 'Total';
      
      var totalsDetails = document.createElement('div');
      totalsDetails.style.fontSize = '0.9rem';
      totalsDetails.style.color = '#666';
      totalsDetails.style.marginTop = '4px';
      
      // Format total duration
      var totalDurationText = '';
      if (totalDuration > 0) {
        var hours = Math.floor(totalDuration / 60);
        var mins = totalDuration % 60;
        if (hours > 0) {
          totalDurationText = hours + 'h';
          if (mins > 0) totalDurationText += ' ' + mins + 'm';
        } else {
          totalDurationText = mins + 'm';
        }
      }
      
      // Format total price
      var totalPriceText = '';
      if (totalPrice > 0) {
        totalPriceText = '$' + (totalPrice / 100).toFixed(2);
      }
      
      totalsDetails.innerHTML = '<i class="fas fa-clock me-1"></i>' + totalDurationText + ' • <span style="color: #28a745; font-weight: 600;">' + totalPriceText + '</span>';
      
      totalsInfo.appendChild(totalsTitle);
      totalsInfo.appendChild(totalsDetails);
      
      totalsLi.appendChild(totalsInfo);
      summaryItems.appendChild(totalsLi);
    }
    
    // Remove the separate staff section since it's now inline
    
  } else {
    summaryList.style.display = 'none';
    summaryEmpty.style.display = 'block';
    summaryItems.style.display = 'none'; // Hide the items list when no items
  }
  
  // Enable/disable continue buttons based on staff selection
  var hasStaffSelected = selectedStaff !== null;
  console.log('DEBUG: hasStaffSelected:', hasStaffSelected);
  
  if (continueBtn) {
    continueBtn.disabled = !hasStaffSelected;
    if (hasStaffSelected) {
      continueBtn.style.opacity = '1';
      continueBtn.style.cursor = 'pointer';
      continueBtn.removeAttribute('disabled');
    } else {
      continueBtn.style.opacity = '0.5';
      continueBtn.style.cursor = 'not-allowed';
      continueBtn.setAttribute('disabled', 'disabled');
    }
    console.log('DEBUG: continueBtn updated - disabled:', continueBtn.disabled, 'opacity:', continueBtn.style.opacity);
  }
  if (summaryBarNext) {
    summaryBarNext.disabled = !hasStaffSelected;
    if (hasStaffSelected) {
      summaryBarNext.style.opacity = '1';
      summaryBarNext.removeAttribute('disabled');
    } else {
      summaryBarNext.style.opacity = '0.5';
      summaryBarNext.setAttribute('disabled', 'disabled');
    }
    console.log('DEBUG: summaryBarNext updated - disabled:', summaryBarNext.disabled);
  }
  if (summarySheetNext) {
    summarySheetNext.disabled = !hasStaffSelected;
    if (hasStaffSelected) {
      summarySheetNext.style.opacity = '1';
      summarySheetNext.removeAttribute('disabled');
    } else {
      summarySheetNext.style.opacity = '0.5';
      summarySheetNext.setAttribute('disabled', 'disabled');
    }
    console.log('DEBUG: summarySheetNext updated - disabled:', summarySheetNext.disabled);
  }
}

// Update mobile bar and bottom sheet for staff page
function updateStaffBarAndSheet() {
  var bar = document.getElementById('summary-bottom-bar');
  var barCount = document.getElementById('summary-bar-count');
  var barTotal = document.getElementById('summary-bar-total');
  var barDuration = document.getElementById('summary-bar-duration');
  
  if (!bar) return;
  
  var hasItems = typeof window.serviceDetails !== 'undefined' && window.serviceDetails && window.serviceDetails.length > 0;
  var selectedStaff = document.querySelector('input[name="staffId"]:checked');
  
  if (hasItems) {
    var totalItems = 0;
    var totalPrice = 0;
    var totalDuration = 0;
    
    window.serviceDetails.forEach(function(service) {
      totalItems += service.quantity || 1;
      if (service.price && service.price.amount) {
        var amount = safeBigIntToNumber(service.price.amount);
        totalPrice += amount * (service.quantity || 1);
      }
      if (service.duration) {
        // Convert duration from milliseconds to minutes using safe conversion
        var durationMs = safeBigIntToNumber(service.duration);
        var durationMinutes = Math.round(durationMs / 60000); // Convert milliseconds to minutes
        totalDuration += durationMinutes * (service.quantity || 1);
      }
    });
    
    if (barCount) {
      barCount.textContent = totalItems + ' service' + (totalItems !== 1 ? 's' : '');
      if (selectedStaff) {
        var staffName = '';
        if (selectedStaff.value === 'anyStaffMember') {
          staffName = 'Any Staff';
        } else {
          var staffCard = selectedStaff.closest('.staff-card');
          var staffNameElement = staffCard ? staffCard.querySelector('.staff-info h4') : null;
          if (staffNameElement) {
            staffName = staffNameElement.textContent.trim();
          } else {
            staffName = 'Staff Selected'; // fallback
          }
        }
        barCount.textContent += ' • ' + staffName;
      }
    }
    
    if (barTotal && totalPrice > 0) {
      barTotal.textContent = '$' + (totalPrice / 100).toFixed(2);
    }
    
    if (barDuration && totalDuration > 0) {
      var hours = Math.floor(totalDuration / 60);
      var mins = totalDuration % 60;
      var durationText = '';
      if (hours > 0) {
        durationText = hours + 'h';
        if (mins > 0) durationText += ' ' + mins + 'm';
      } else {
        durationText = mins + 'm';
      }
      barDuration.textContent = durationText;
    }
  }
  
  // Show/hide bottom bar on mobile
  if (window.innerWidth <= 900 && hasItems) {
    bar.classList.add('show');
  } else {
    bar.classList.remove('show');
  }
}

// Staff page bottom sheet functionality
function initStaffBottomSheet() {
  var staffForm = document.querySelector('form[id="staff-form"]');
  var bar = document.getElementById('summary-bottom-bar');
  var sheet = document.getElementById('summary-bottom-sheet');
  var barExpand = document.getElementById('summary-bar-expand');
  var sheetClose = document.getElementById('summary-sheet-close');
  var overlay = document.getElementById('summary-sheet-overlay');
  var sheetItems = document.getElementById('summary-sheet-items');
  var sheetEmpty = document.getElementById('summary-sheet-empty');
  
  if (!staffForm || !bar || !sheet) return;

  // Bottom sheet toggle functions
  function openBottomSheet() {
    // Update sheet content before opening
    updateStaffBottomSheetContent();
    
    sheet.style.display = 'block';
    sheet.classList.add('open');
    if (overlay) {
      overlay.style.display = 'block';
      setTimeout(function() {
        overlay.classList.add('open');
      }, 10);
    }
    if (barExpand) barExpand.classList.add('sheet-open');
    document.body.style.overflow = 'hidden';
  }

  function closeBottomSheet() {
    sheet.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    if (barExpand) barExpand.classList.remove('sheet-open');
    document.body.style.overflow = '';
    
    // Wait for animation to complete before hiding
    setTimeout(function() {
      sheet.style.display = 'none';
      if (overlay) overlay.style.display = 'none';
    }, 300);
  }

  // Event listeners for bottom sheet
  if (barExpand) barExpand.addEventListener('click', openBottomSheet);
  if (sheetClose) sheetClose.addEventListener('click', closeBottomSheet);
  if (overlay) overlay.addEventListener('click', closeBottomSheet);
}

// Update appointment summary for staff page
function updateStaffBottomSheetContent() {
  var sheetItems = document.getElementById('summary-sheet-items');
  var sheetEmpty = document.getElementById('summary-sheet-empty');
  
  if (!sheetItems || !sheetEmpty) return;
  
  var hasItems = typeof window.serviceDetails !== 'undefined' && window.serviceDetails && window.serviceDetails.length > 0;
  
  sheetItems.innerHTML = '';
  
  if (hasItems) {
    var totalPrice = 0;
    var totalDuration = 0;
    
    // Add service items
    window.serviceDetails.forEach(function(service) {
      var li = document.createElement('li');
      li.style.padding = '12px 0';
      li.style.borderBottom = '1px solid #f0f0f0';
      
      var serviceInfo = document.createElement('div');
      serviceInfo.style.display = 'flex';
      serviceInfo.style.justifyContent = 'space-between';
      serviceInfo.style.alignItems = 'flex-start';
      
      var leftInfo = document.createElement('div');
      leftInfo.style.flex = '1';
      
      var serviceName = document.createElement('div');
      serviceName.style.fontWeight = '600';
      serviceName.style.fontSize = '15px';
      serviceName.style.color = '#333';
      serviceName.style.marginBottom = '4px';
      serviceName.textContent = service.name;
      
      // Add staff info inline if available
      var selectedStaff = document.querySelector('input[name="staffId"]:checked');
      var staffName = '';
      if (selectedStaff) {
        if (selectedStaff.value === 'anyStaffMember') {
          staffName = 'Any Available Staff';
        } else {
          var staffCard = selectedStaff.closest('.staff-card');
          var staffNameElement = staffCard ? staffCard.querySelector('.staff-info h4') : null;
          if (staffNameElement) {
            staffName = staffNameElement.textContent.trim();
          }
        }
      }
      
      if (staffName) {
        serviceName.textContent += ' - by ' + staffName;
      }
      
      // Quantity
      if (service.quantity && service.quantity > 1) {
        serviceName.textContent += ' (x' + service.quantity + ')';
      }
      
      var serviceDetails = document.createElement('div');
      serviceDetails.style.fontSize = '13px';
      serviceDetails.style.color = '#666';
      
      // Duration
      if (service.duration) {
        var durationMs = safeBigIntToNumber(service.duration);
        var durationMinutes = Math.round(durationMs / 60000);
        var durationText = durationMinutes + 'm';
        serviceDetails.textContent = durationText;
        totalDuration += durationMinutes * (service.quantity || 1);
      }
      
      leftInfo.appendChild(serviceName);
      leftInfo.appendChild(serviceDetails);
      
      var rightInfo = document.createElement('div');
      rightInfo.style.textAlign = 'right';
      rightInfo.style.marginLeft = '12px';
      
      // Price
      if (service.price && service.price.amount) {
        var amount = safeBigIntToNumber(service.price.amount);
        var price = amount / 100;
        var priceDiv = document.createElement('div');
        priceDiv.style.fontWeight = '600';
        priceDiv.style.fontSize = '15px';
        priceDiv.style.color = '#28a745';
        priceDiv.textContent = '$' + price.toFixed(2);
        rightInfo.appendChild(priceDiv);
        totalPrice += amount * (service.quantity || 1);
      }
      
      serviceInfo.appendChild(leftInfo);
      serviceInfo.appendChild(rightInfo);
      li.appendChild(serviceInfo);
      sheetItems.appendChild(li);
    });
    
    // Add totals section if multiple services OR single service with qty >= 2
    var shouldShowTotals = window.serviceDetails.length >= 2;
    if (!shouldShowTotals && window.serviceDetails.length === 1) {
      // Check if single service has quantity >= 2
      shouldShowTotals = (window.serviceDetails[0].quantity || 1) >= 2;
    }
    
    if (shouldShowTotals) {
      var totalsLi = document.createElement('li');
      totalsLi.style.padding = '16px 0 8px 0';
      totalsLi.style.borderTop = '2px solid #eee';
      totalsLi.style.marginTop = '8px';
      
      var totalsInfo = document.createElement('div');
      totalsInfo.style.display = 'flex';
      totalsInfo.style.justifyContent = 'space-between';
      totalsInfo.style.alignItems = 'center';
      
      var totalsTitle = document.createElement('div');
      totalsTitle.style.fontWeight = '700';
      totalsTitle.style.fontSize = '16px';
      totalsTitle.style.color = '#333';
      totalsTitle.textContent = 'Total';
      
      var totalsDetails = document.createElement('div');
      totalsDetails.style.textAlign = 'right';
      
      // Format total duration and price
      var totalDurationText = '';
      if (totalDuration > 0) {
        var hours = Math.floor(totalDuration / 60);
        var mins = totalDuration % 60;
        if (hours > 0) {
          totalDurationText = hours + 'h';
          if (mins > 0) totalDurationText += ' ' + mins + 'm';
        } else {
          totalDurationText = mins + 'm';
        }
      }
      
      var totalPriceText = '';
      if (totalPrice > 0) {
        totalPriceText = '$' + (totalPrice / 100).toFixed(2);
      }
      
      var durationDiv = document.createElement('div');
      durationDiv.style.fontSize = '13px';
      durationDiv.style.color = '#666';
      durationDiv.style.marginBottom = '4px';
      durationDiv.innerHTML = '<i class="fas fa-clock me-1"></i>' + totalDurationText;
      
      var priceDiv = document.createElement('div');
      priceDiv.style.fontWeight = '600';
      priceDiv.style.fontSize = '16px';
      priceDiv.style.color = '#28a745';
      priceDiv.textContent = totalPriceText;
      
      totalsDetails.appendChild(durationDiv);
      totalsDetails.appendChild(priceDiv);
      
      totalsInfo.appendChild(totalsTitle);
      totalsInfo.appendChild(totalsDetails);
      
      totalsLi.appendChild(totalsInfo);
      sheetItems.appendChild(totalsLi);
    }
    
    sheetItems.style.display = 'block';
    sheetEmpty.style.display = 'none';
  } else {
    sheetItems.style.display = 'none';
    sheetEmpty.style.display = 'block';
  }
}

// Contact page specific functionality
function initContactPageSummary() {
  console.log('DEBUG: initContactPageSummary called');
  var contactPage = document.querySelector('.contact-container') || document.querySelector('form[action="/contact"]');
  console.log('DEBUG: contactPage found:', !!contactPage);
  
  if (!contactPage) return; // Not on contact page
  
  // Wait a bit for window variables to be set before updating
  setTimeout(function() {
    console.log('DEBUG: Delayed execution - updating contact page summary');
    updateContactPageSummary();
  }, 100);
  
  // Also try updating immediately
  updateContactPageSummary();
  
  // Retry mechanism in case data loads later
  var retryCount = 0;
  var maxRetries = 10;
  var retryInterval = setInterval(function() {
    if (typeof window.serviceDetails !== 'undefined' && window.serviceDetails && window.serviceDetails.length > 0) {
      console.log('DEBUG: Service details found on retry', retryCount);
      updateContactPageSummary();
      clearInterval(retryInterval);
    } else {
      retryCount++;
      console.log('DEBUG: Retry', retryCount, 'serviceDetails still not available');
      if (retryCount >= maxRetries) {
        console.log('DEBUG: Max retries reached, stopping');
        clearInterval(retryInterval);
      }
    }
  }, 200);
  
  // Initialize mobile bottom sheet for contact page
  initContactBottomSheet();
  
  // Handle mobile bottom bar for contact page
  updateContactBarAndSheet();
  
  // Update on window resize
  window.addEventListener('resize', function() {
    updateContactBarAndSheet();
  });
}

// Update appointment summary for contact page
function updateContactPageSummary() {
  console.log('DEBUG: updateContactPageSummary called');
  console.log('DEBUG: window.serviceDetails:', window.serviceDetails);
  console.log('DEBUG: window.selectedStaff:', window.selectedStaff);
  
  var summaryList = document.getElementById('summary-list');
  var summaryItems = document.getElementById('summary-items');
  var summaryEmpty = document.getElementById('summary-empty');
  var continueBtn = document.getElementById('continue-btn');
  var summaryBarNext = document.getElementById('summary-bar-next');
  var summarySheetNext = document.getElementById('summary-sheet-next');
  
  console.log('DEBUG: Contact page elements found:', {
    summaryList: !!summaryList,
    summaryItems: !!summaryItems,
    summaryEmpty: !!summaryEmpty,
    continueBtn: !!continueBtn,
    summaryBarNext: !!summaryBarNext,
    summarySheetNext: !!summarySheetNext
  });
  
  if (!summaryList || !summaryItems || !summaryEmpty) {
    console.log('DEBUG: Missing required elements, returning early');
    return;
  }
  
  // Clear items
  summaryItems.innerHTML = '';
  var hasItems = typeof window.serviceDetails !== 'undefined' && window.serviceDetails && window.serviceDetails.length > 0;
  console.log('DEBUG: hasItems calculation:', hasItems);
  console.log('DEBUG: typeof window.serviceDetails:', typeof window.serviceDetails);
  console.log('DEBUG: window.serviceDetails value:', window.serviceDetails);
  console.log('DEBUG: window.serviceDetails length:', window.serviceDetails ? window.serviceDetails.length : 'N/A');
  
  // Always show summary list when we have service details
  if (hasItems) {
    summaryList.style.display = 'block';
  } else {
    summaryList.style.display = 'block'; // Still show list even if empty for debugging
  }
  
  if (hasItems) {
    console.log('DEBUG: Processing services...');
    summaryEmpty.style.display = 'none';
    summaryItems.style.display = 'block';
    
    var totalPrice = 0;
    var totalDuration = 0;
    
    // Add appointment date/time section first if available
    if (window.selectedDateTime) {
      var dateTimeLi = document.createElement('li');
      dateTimeLi.style.padding = '16px 0';
      dateTimeLi.style.borderBottom = '2px solid #f0f0f0';
      dateTimeLi.style.marginBottom = '12px';
      
      var dateTimeHeader = document.createElement('div');
      dateTimeHeader.style.fontWeight = '700';
      dateTimeHeader.style.fontSize = '16px';
      dateTimeHeader.style.color = '#333';
      dateTimeHeader.style.marginBottom = '8px';
      dateTimeHeader.innerHTML = '<i class="fas fa-calendar-alt" style="margin-right: 8px; color: #667eea;"></i>Appointment Time';
      
      var dateTimeInfo = document.createElement('div');
      dateTimeInfo.style.fontSize = '14px';
      dateTimeInfo.style.color = '#666';
      dateTimeInfo.style.fontWeight = '500';
      
      if (window.selectedDateTime.formattedDate && window.selectedDateTime.formattedTime) {
        dateTimeInfo.textContent = window.selectedDateTime.formattedDate + ', ' + window.selectedDateTime.formattedTime;
      } else {
        dateTimeInfo.textContent = 'Appointment scheduled';
      }
      
      dateTimeLi.appendChild(dateTimeHeader);
      dateTimeLi.appendChild(dateTimeInfo);
      summaryItems.appendChild(dateTimeLi);
    }
    
    window.serviceDetails.forEach(function(service) {
      var li = document.createElement('li');
      li.style.padding = '12px 0';
      li.style.borderBottom = '1px solid #f0f0f0';
      
      var serviceInfo = document.createElement('div');
      serviceInfo.style.display = 'flex';
      serviceInfo.style.justifyContent = 'space-between';
      serviceInfo.style.alignItems = 'flex-start';
      
      var leftInfo = document.createElement('div');
      leftInfo.style.flex = '1';
      
      var serviceName = document.createElement('div');
      serviceName.style.fontWeight = '600';
      serviceName.style.color = '#333';
      serviceName.style.fontSize = '15px';
      serviceName.textContent = service.name;
      
      // Add staff info on separate line for better readability
      var staffInfo = document.createElement('div');
      staffInfo.style.fontSize = '13px';
      staffInfo.style.color = '#667eea';
      staffInfo.style.marginTop = '4px';
      staffInfo.style.fontWeight = '500';
      
      if (window.selectedStaff && window.selectedStaff.name) {
        if (window.selectedStaff.name === 'Any Available Staff') {
          staffInfo.textContent = 'with Any Available Staff';
        } else {
          staffInfo.textContent = 'with ' + window.selectedStaff.name;
        }
      }
      
      // Quantity
      if (service.quantity && service.quantity > 1) {
        serviceName.textContent += ' (x' + service.quantity + ')';
      }
      
      var serviceDetails = document.createElement('div');
      serviceDetails.style.fontSize = '13px';
      serviceDetails.style.color = '#666';
      serviceDetails.style.marginTop = '4px';
      
      // Duration
      if (service.duration) {
        var durationMs = safeBigIntToNumber(service.duration);
        var durationMinutes = Math.round(durationMs / 60000);
        var hours = Math.floor(durationMinutes / 60);
        var mins = durationMinutes % 60;
        var durationText = '';
        
        if (hours > 0) {
          durationText = hours + 'h';
          if (mins > 0) durationText += ' ' + mins + 'm';
        } else {
          durationText = mins + 'm';
        }
        
        serviceDetails.innerHTML = '<i class="fas fa-clock" style="margin-right: 4px;"></i>' + durationText;
        totalDuration += durationMinutes * (service.quantity || 1);
      }
      
      leftInfo.appendChild(serviceName);
      if (staffInfo.textContent) {
        leftInfo.appendChild(staffInfo);
      }
      leftInfo.appendChild(serviceDetails);
      
      var rightInfo = document.createElement('div');
      rightInfo.style.textAlign = 'right';
      rightInfo.style.marginLeft = '12px';
      
      // Price
      if (service.price && service.price.amount) {
        var amount = safeBigIntToNumber(service.price.amount);
        var price = amount / 100;
        var priceDiv = document.createElement('div');
        priceDiv.style.fontWeight = '600';
        priceDiv.style.fontSize = '15px';
        priceDiv.style.color = '#28a745';
        priceDiv.textContent = '$' + price.toFixed(2);
        rightInfo.appendChild(priceDiv);
        totalPrice += amount * (service.quantity || 1);
      }
      
      serviceInfo.appendChild(leftInfo);
      serviceInfo.appendChild(rightInfo);
      li.appendChild(serviceInfo);
      summaryItems.appendChild(li);
    });
    
    // Enhanced totals section with pricing breakdown
    if (totalPrice > 0) {
      // Add spacing before totals
      var spacerLi = document.createElement('li');
      spacerLi.style.padding = '8px 0';
      summaryItems.appendChild(spacerLi);
      
      // Subtotal
      var subtotalLi = document.createElement('li');
      subtotalLi.style.padding = '8px 0';
      subtotalLi.style.display = 'flex';
      subtotalLi.style.justifyContent = 'space-between';
      subtotalLi.style.alignItems = 'center';
      
      var subtotalLabel = document.createElement('span');
      subtotalLabel.style.fontSize = '14px';
      subtotalLabel.style.color = '#666';
      subtotalLabel.textContent = 'Subtotal';
      
      var subtotalAmount = document.createElement('span');
      subtotalAmount.style.fontSize = '14px';
      subtotalAmount.style.color = '#333';
      subtotalAmount.textContent = '$' + (totalPrice / 100).toFixed(2);
      
      subtotalLi.appendChild(subtotalLabel);
      subtotalLi.appendChild(subtotalAmount);
      summaryItems.appendChild(subtotalLi);
      
      // Taxes (calculate dynamically based on each service's tax data from Square API)
      var totalTaxAmount = 0;
      var taxBreakdown = {};
      
      console.log('DEBUG: Calculating taxes from serviceDetails:', window.serviceDetails);
      
      // Calculate taxes for each service individually
      if (window.serviceDetails && window.serviceDetails.length > 0) {
        window.serviceDetails.forEach(function(service) {
          console.log('DEBUG: Processing service for tax calculation:', service);
          if (service.taxes && Object.keys(service.taxes).length > 0) {
            var servicePrice = (service.price && service.price.amount) ? service.price.amount : 0;
            var serviceQuantity = service.quantity || 1;
            var serviceTotalPrice = servicePrice * serviceQuantity;
            
            console.log('DEBUG: Service price calculation:', {
              servicePrice: servicePrice,
              serviceQuantity: serviceQuantity,
              serviceTotalPrice: serviceTotalPrice,
              taxes: service.taxes
            });
            
            // Calculate tax for this service based on its specific tax rates
            Object.values(service.taxes).forEach(function(tax) {
              console.log('DEBUG: Processing tax:', tax);
              if (tax.enabled && tax.percentage > 0) {
                var serviceTaxAmount = serviceTotalPrice * tax.percentage;
                totalTaxAmount += serviceTaxAmount;
                
                console.log('DEBUG: Tax calculation:', {
                  taxName: tax.name,
                  taxPercentage: tax.percentage,
                  serviceTaxAmount: serviceTaxAmount,
                  totalTaxAmount: totalTaxAmount
                });
                
                // Track tax breakdown by tax name for display
                if (!taxBreakdown[tax.name]) {
                  taxBreakdown[tax.name] = 0;
                }
                taxBreakdown[tax.name] += serviceTaxAmount;
              }
            });
          }
        });
      }
      
      console.log('DEBUG: Final tax calculation:', {
        totalTaxAmount: totalTaxAmount,
        taxBreakdown: taxBreakdown
      });
      
      // Display tax breakdown if there are any taxes
      if (totalTaxAmount > 0) {
        // Show individual tax lines if there are multiple tax types
        var taxNames = Object.keys(taxBreakdown);
        if (taxNames.length === 1) {
          // Single tax type - show as "Tax"
          var taxLi = document.createElement('li');
          taxLi.style.padding = '8px 0';
          taxLi.style.display = 'flex';
          taxLi.style.justifyContent = 'space-between';
          taxLi.style.alignItems = 'center';
          
          var taxLabel = document.createElement('span');
          taxLabel.style.fontSize = '14px';
          taxLabel.style.color = '#666';
          taxLabel.textContent = taxNames[0];
          
          var taxAmountSpan = document.createElement('span');
          taxAmountSpan.style.fontSize = '14px';
          taxAmountSpan.style.color = '#333';
          taxAmountSpan.textContent = '$' + (totalTaxAmount / 100).toFixed(2);
          
          taxLi.appendChild(taxLabel);
          taxLi.appendChild(taxAmountSpan);
          summaryItems.appendChild(taxLi);
        } else if (taxNames.length > 1) {
          // Multiple tax types - show each separately
          taxNames.forEach(function(taxName) {
            var taxLi = document.createElement('li');
            taxLi.style.padding = '8px 0';
            taxLi.style.display = 'flex';
            taxLi.style.justifyContent = 'space-between';
            taxLi.style.alignItems = 'center';
            
            var taxLabel = document.createElement('span');
            taxLabel.style.fontSize = '14px';
            taxLabel.style.color = '#666';
            taxLabel.textContent = taxName;
            
            var taxAmountSpan = document.createElement('span');
            taxAmountSpan.style.fontSize = '14px';
            taxAmountSpan.style.color = '#333';
            taxAmountSpan.textContent = '$' + (taxBreakdown[taxName] / 100).toFixed(2);
            
            taxLi.appendChild(taxLabel);
            taxLi.appendChild(taxAmountSpan);
            summaryItems.appendChild(taxLi);
          });
        }
      }
      
      // Total section with border
      var totalLi = document.createElement('li');
      totalLi.style.padding = '16px 0 12px 0';
      totalLi.style.borderTop = '2px solid #eee';
      totalLi.style.marginTop = '8px';
      totalLi.style.display = 'flex';
      totalLi.style.justifyContent = 'space-between';
      totalLi.style.alignItems = 'center';
      
      var totalLabel = document.createElement('span');
      totalLabel.style.fontWeight = '700';
      totalLabel.style.fontSize = '16px';
      totalLabel.style.color = '#333';
      totalLabel.textContent = 'Total';
      
      var totalAmountSpan = document.createElement('span');
      totalAmountSpan.style.fontWeight = '700';
      totalAmountSpan.style.fontSize = '18px';
      totalAmountSpan.style.color = '#28a745';
      var finalTotal = totalTaxAmount > 0 ? totalPrice + totalTaxAmount : totalPrice;
      totalAmountSpan.textContent = '$' + (finalTotal / 100).toFixed(2);
      
      totalLi.appendChild(totalLabel);
      totalLi.appendChild(totalAmountSpan);
      summaryItems.appendChild(totalLi);
      
      // Payment due information
      var paymentInfoLi = document.createElement('li');
      paymentInfoLi.style.padding = '12px 0 8px 0';
      paymentInfoLi.style.fontSize = '13px';
      paymentInfoLi.style.color = '#666';
      paymentInfoLi.style.textAlign = 'center';
      paymentInfoLi.style.fontStyle = 'italic';
      
      // Show duration info if available
      if (totalDuration > 0) {
        var hours = Math.floor(totalDuration / 60);
        var mins = totalDuration % 60;
        var durationText = '';
        
        if (hours > 0) {
          durationText = hours + 'h';
          if (mins > 0) durationText += ' ' + mins + 'm';
        } else {
          durationText = mins + 'm';
        }
        
        paymentInfoLi.innerHTML = '<i class="fas fa-clock" style="margin-right: 4px;"></i>Total duration: ' + durationText + '<br><small style="color: #999;">Payment will be processed upon completion</small>';
      } else {
        paymentInfoLi.innerHTML = '<small style="color: #999;">Payment will be processed upon completion</small>';
      }
      
      summaryItems.appendChild(paymentInfoLi);
    }
    
    // Hide buttons on contact page (show only service details)
    if (continueBtn) {
      continueBtn.style.display = 'none';
    }
    if (summaryBarNext) {
      summaryBarNext.style.display = 'none';
    }
    if (summarySheetNext) {
      summarySheetNext.style.display = 'none';
    }
  } else {
    console.log('DEBUG: No items found, showing empty state');
    summaryItems.style.display = 'none';
    summaryEmpty.style.display = 'block';
    
    // Hide buttons on contact page (show only service details)
    if (continueBtn) {
      continueBtn.style.display = 'none';
    }
    if (summaryBarNext) {
      summaryBarNext.style.display = 'none';
    }
    if (summarySheetNext) {
      summarySheetNext.style.display = 'none';
    }
  }
}

// Update mobile bar and bottom sheet for contact page
function updateContactBarAndSheet() {
  var bar = document.getElementById('summary-bottom-bar');
  var barCount = document.getElementById('summary-bar-count');
  var barTotal = document.getElementById('summary-bar-total');
  var barDuration = document.getElementById('summary-bar-duration');
  var barNext = document.getElementById('summary-bar-next');
  
  if (!bar) return;
  
  var hasItems = typeof window.serviceDetails !== 'undefined' && window.serviceDetails && window.serviceDetails.length > 0;
  
  if (hasItems) {
    var totalItems = 0;
    var totalPrice = 0;
    var totalDuration = 0;
    
    window.serviceDetails.forEach(function(service) {
      totalItems += service.quantity || 1;
      if (service.price && service.price.amount) {
        var amount = safeBigIntToNumber(service.price.amount);
        totalPrice += amount * (service.quantity || 1);
      }
      if (service.duration) {
        var durationMs = safeBigIntToNumber(service.duration);
        var durationMinutes = Math.round(durationMs / 60000);
        totalDuration += durationMinutes * (service.quantity || 1);
      }
    });
    
    if (barCount) {
      barCount.textContent = totalItems + ' service' + (totalItems !== 1 ? 's' : '');
      if (window.selectedStaff && window.selectedStaff.name) {
        barCount.textContent += ' • ' + window.selectedStaff.name;
      }
    }
    
    if (barTotal && totalPrice > 0) {
      barTotal.textContent = '$' + (totalPrice / 100).toFixed(2);
    }
    
    if (barDuration && totalDuration > 0) {
      var hours = Math.floor(totalDuration / 60);
      var mins = totalDuration % 60;
      var durationText = '';
      if (hours > 0) {
        durationText = hours + 'h';
        if (mins > 0) durationText += ' ' + mins + 'm';
      } else {
        durationText = mins + 'm';
      }
      barDuration.textContent = durationText;
    }
    
    // Hide the Next button on contact page (show only service details)
    if (barNext) {
      barNext.style.display = 'none';
    }
    
    bar.style.display = 'block';
  } else {
    bar.style.display = 'none';
  }
}

// Contact page bottom sheet functionality
function initContactBottomSheet() {
  var contactPage = document.querySelector('.contact-container') || document.querySelector('form[action="/contact"]');
  var bar = document.getElementById('summary-bottom-bar');
  var sheet = document.getElementById('summary-bottom-sheet');
  var barExpand = document.getElementById('summary-bar-expand');
  var sheetClose = document.getElementById('summary-sheet-close');
  var overlay = document.getElementById('summary-sheet-overlay');
  
  if (!contactPage || !bar || !sheet) return;

  // Bottom sheet toggle functions
  function openBottomSheet() {
    updateContactBottomSheetContent();
    sheet.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
    
    setTimeout(function() {
      sheet.classList.add('open');
      if (overlay) overlay.classList.add('open');
    }, 10);
    if (barExpand) barExpand.classList.add('sheet-open');
    document.body.style.overflow = 'hidden';
  }

  function closeBottomSheet() {
    sheet.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    if (barExpand) barExpand.classList.remove('sheet-open');
    document.body.style.overflow = '';
    
    setTimeout(function() {
      sheet.style.display = 'none';
      if (overlay) overlay.style.display = 'none';
    }, 300);
  }

  // Event listeners for bottom sheet
  if (barExpand) barExpand.addEventListener('click', openBottomSheet);
  if (sheetClose) sheetClose.addEventListener('click', closeBottomSheet);
  if (overlay) overlay.addEventListener('click', closeBottomSheet);
}

// Update contact bottom sheet content
function updateContactBottomSheetContent() {
  var sheetItems = document.getElementById('summary-sheet-items');
  var sheetEmpty = document.getElementById('summary-sheet-empty');
  
  if (!sheetItems || !sheetEmpty) return;
  
  var hasItems = typeof window.serviceDetails !== 'undefined' && window.serviceDetails && window.serviceDetails.length > 0;
  
  sheetItems.innerHTML = '';
  
  if (hasItems) {
    var totalPrice = 0;
    var totalDuration = 0;
    
    // Add service items
    window.serviceDetails.forEach(function(service) {
      var li = document.createElement('li');
      li.style.padding = '12px 0';
      li.style.borderBottom = '1px solid #f0f0f0';
      
      var serviceInfo = document.createElement('div');
      serviceInfo.style.display = 'flex';
      serviceInfo.style.justifyContent = 'space-between';
      serviceInfo.style.alignItems = 'flex-start';
      
      var leftInfo = document.createElement('div');
      leftInfo.style.flex = '1';
      
      var serviceName = document.createElement('div');
      serviceName.style.fontWeight = '600';
      serviceName.style.fontSize = '15px';
      serviceName.style.color = '#333';
      serviceName.style.marginBottom = '4px';
      serviceName.textContent = service.name;
      
      // Add staff info inline if available
      var selectedStaff = document.querySelector('input[name="staffId"]:checked');
      var staffName = '';
      if (selectedStaff) {
        if (selectedStaff.value === 'anyStaffMember') {
          staffName = 'Any Available Staff';
        } else {
          var staffCard = selectedStaff.closest('.staff-card');
          var staffNameElement = staffCard ? staffCard.querySelector('.staff-info h4') : null;
          if (staffNameElement) {
            staffName = staffNameElement.textContent.trim();
          }
        }
      }
      
      if (staffName) {
        serviceName.textContent += ' - by ' + staffName;
      }
      
      // Quantity
      if (service.quantity && service.quantity > 1) {
        serviceName.textContent += ' (x' + service.quantity + ')';
      }
      
      var serviceDetails = document.createElement('div');
      serviceDetails.style.fontSize = '13px';
      serviceDetails.style.color = '#666';
      
      // Duration
      if (service.duration) {
        var durationMs = safeBigIntToNumber(service.duration);
        var durationMinutes = Math.round(durationMs / 60000);
        var durationText = durationMinutes + 'm';
        serviceDetails.textContent = durationText;
        totalDuration += durationMinutes * (service.quantity || 1);
      }
      
      leftInfo.appendChild(serviceName);
      leftInfo.appendChild(serviceDetails);
      
      var rightInfo = document.createElement('div');
      rightInfo.style.textAlign = 'right';
      rightInfo.style.marginLeft = '12px';
      
      // Price
      if (service.price && service.price.amount) {
        var amount = safeBigIntToNumber(service.price.amount);
        var price = amount / 100;
        var priceDiv = document.createElement('div');
        priceDiv.style.fontWeight = '600';
        priceDiv.style.fontSize = '15px';
        priceDiv.style.color = '#28a745';
        priceDiv.textContent = '$' + price.toFixed(2);
        rightInfo.appendChild(priceDiv);
        totalPrice += amount * (service.quantity || 1);
      }
      
      serviceInfo.appendChild(leftInfo);
      serviceInfo.appendChild(rightInfo);
      li.appendChild(serviceInfo);
      sheetItems.appendChild(li);
       });
    
    // Add totals section if multiple services OR single service with qty >= 2
    var shouldShowTotals = window.serviceDetails.length >= 2;
    if (!shouldShowTotals && window.serviceDetails.length === 1) {
      // Check if single service has quantity >= 2
      shouldShowTotals = (window.serviceDetails[0].quantity || 1) >= 2;
    }
    
    if (shouldShowTotals) {
      var totalsLi = document.createElement('li');
      totalsLi.style.padding = '16px 0 8px 0';
      totalsLi.style.borderTop = '2px solid #eee';
      totalsLi.style.marginTop = '8px';
      
      var totalsInfo = document.createElement('div');
      totalsInfo.style.display = 'flex';
      totalsInfo.style.justifyContent = 'space-between';
      totalsInfo.style.alignItems = 'center';
      
      var totalsTitle = document.createElement('div');
      totalsTitle.style.fontWeight = '700';
      totalsTitle.style.fontSize = '16px';
      totalsTitle.style.color = '#333';
      totalsTitle.textContent = 'Total';
      
      var totalsDetails = document.createElement('div');
      totalsDetails.style.textAlign = 'right';
      
      // Format total duration and price
      var totalDurationText = '';
      if (totalDuration > 0) {
        var hours = Math.floor(totalDuration / 60);
        var mins = totalDuration % 60;
        if (hours > 0) {
          totalDurationText = hours + 'h';
          if (mins > 0) totalDurationText += ' ' + mins + 'm';
        } else {
          totalDurationText = mins + 'm';
        }
      }
      
      var totalPriceText = '';
      if (totalPrice > 0) {
        totalPriceText = '$' + (totalPrice / 100).toFixed(2);
      }
      
      var durationDiv = document.createElement('div');
      durationDiv.style.fontSize = '13px';
      durationDiv.style.color = '#666';
      durationDiv.style.marginBottom = '4px';
      durationDiv.innerHTML = '<i class="fas fa-clock me-1"></i>' + totalDurationText;
      
      var priceDiv = document.createElement('div');
      priceDiv.style.fontWeight = '600';
      priceDiv.style.fontSize = '16px';
      priceDiv.style.color = '#28a745';
      priceDiv.textContent = totalPriceText;
      
      totalsDetails.appendChild(durationDiv);
      totalsDetails.appendChild(priceDiv);
      
      totalsInfo.appendChild(totalsTitle);
      totalsInfo.appendChild(totalsDetails);
      
      totalsLi.appendChild(totalsInfo);
      sheetItems.appendChild(totalsLi);
    }
    
    sheetItems.style.display = 'block';
    sheetEmpty.style.display = 'none';
  } else {
    sheetItems.style.display = 'none';
    sheetEmpty.style.display = 'block';
  }
}
