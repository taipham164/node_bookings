/**
 * Appointment Summary Component
 * Handles the appointment summary sidebar, mobile summary bar, and bottom sheet
 */

// Initialize appointment summary functionality
document.addEventListener('DOMContentLoaded', function() {
  console.log('DEBUG: DOMContentLoaded - starting initialization');
  
  // Check which page we're on
  var staffForm = document.querySelector('form[id="staff-form"]');
  var servicesForm = document.querySelector('form[id="services-form"]');
  var availabilityPage = document.querySelector('.availability-container');
  
  console.log('DEBUG: Page detection:', {
    staffForm: !!staffForm,
    servicesForm: !!servicesForm,
    availabilityPage: !!availabilityPage
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
    totalsTitle.style.fontSize = '1.1em';
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
        // Convert duration from milliseconds to minutes
        var durationMs = typeof service.duration === 'bigint' ? Number(service.duration) : service.duration;
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
        var amount = typeof service.price.amount === 'bigint' ? Number(service.price.amount) : service.price.amount;
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
        var durationMs = typeof service.duration === 'bigint' ? Number(service.duration) : service.duration;
        var durationMinutes = Math.round(durationMs / 60000);
        totalDuration += durationMinutes * (service.quantity || 1);
      }
      
      // Calculate total price
      if (service.price && service.price.amount) {
        var amount = typeof service.price.amount === 'bigint' ? Number(service.price.amount) : service.price.amount;
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
      totalsInfo.style.flex = '1';
      
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
      
      totalsDetails.innerHTML = '<i class="fas fa-clock me-1"></i>' + totalDurationText;
      if (totalPriceText) {
        totalsDetails.innerHTML += ' • <span style="color: #28a745; font-weight: 600;">' + totalPriceText + '</span>';
      }
      
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
        var amount = typeof service.price.amount === 'bigint' ? Number(service.price.amount) : service.price.amount;
        totalPrice += amount * (service.quantity || 1);
      }
      if (service.duration) {
        // Convert duration from milliseconds to minutes
        var durationMs = typeof service.duration === 'bigint' ? Number(service.duration) : service.duration;
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
        barCount.textContent += ' • with ' + staffName;
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

// Update staff bottom sheet content
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
        serviceName.textContent += ' - with ' + staffName;
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
        var durationMs = typeof service.duration === 'bigint' ? Number(service.duration) : service.duration;
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
        var amount = typeof service.price.amount === 'bigint' ? Number(service.price.amount) : service.price.amount;
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
    
    // Add totals section if 2 or more services OR 1 service with qty >= 2
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

// Availability page specific functionality
function initAvailabilityPageSummary() {
  console.log('DEBUG: initAvailabilityPageSummary called');
  var availabilityPage = document.querySelector('.availability-container');
  console.log('DEBUG: availabilityPage found:', !!availabilityPage);
  console.log('DEBUG: window.serviceDetails at init:', window.serviceDetails);
  console.log('DEBUG: window.selectedStaff at init:', window.selectedStaff);
  
  if (!availabilityPage) {
    console.log('DEBUG: No availability page found, returning');
    return; // Not on availability page
  }
  
  // Wait a bit for window variables to be set
  setTimeout(function() {
    console.log('DEBUG: After timeout - window.serviceDetails:', window.serviceDetails);
    console.log('DEBUG: After timeout - window.selectedStaff:', window.selectedStaff);
    updateAvailabilityPageSummary();
  }, 200);
  
  // Initial load - populate with session data
  updateAvailabilityPageSummary();
  
  // Initialize mobile bottom sheet for availability page
  initAvailabilityBottomSheet();
  
  // Handle mobile bottom bar for availability page
  updateAvailabilityBarAndSheet();
  
  // Update on window resize
  window.addEventListener('resize', function() {
    updateAvailabilityBarAndSheet();
  });
}

// Update appointment summary for availability page
function updateAvailabilityPageSummary() {
  console.log('DEBUG: updateAvailabilityPageSummary called');
  console.log('DEBUG: window.serviceDetails:', window.serviceDetails);
  console.log('DEBUG: window.selectedStaff:', window.selectedStaff);
  console.log('DEBUG: typeof window.serviceDetails:', typeof window.serviceDetails);
  console.log('DEBUG: Array.isArray(window.serviceDetails):', Array.isArray(window.serviceDetails));
  if (window.serviceDetails) {
    console.log('DEBUG: window.serviceDetails.length:', window.serviceDetails.length);
  }
  
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
  
  // Clear items
  summaryItems.innerHTML = '';
  var hasItems = typeof window.serviceDetails !== 'undefined' && window.serviceDetails && window.serviceDetails.length > 0;
  console.log('DEBUG: hasItems calculation:', hasItems);
  console.log('DEBUG: window.serviceDetails in detail:', window.serviceDetails);
  
  // Always show summary list when we have service details
  summaryList.style.display = 'block';
  
  if (hasItems) {
    console.log('DEBUG: Processing services...');
    summaryEmpty.style.display = 'none';
    summaryItems.style.display = 'block';
    
    var totalPrice = 0;
    var totalDuration = 0;
    
    // Add service items
    window.serviceDetails.forEach(function(service) {
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
      
      // Add staff info inline if available
      if (window.selectedStaff && window.selectedStaff.name) {
        serviceName.innerHTML = service.name + 
          ' <span style="color: #667eea; font-weight: 500;">- by ' + window.selectedStaff.name + '</span>';
      }
      
      // Quantity
      if (service.quantity && service.quantity > 1) {
        if (window.selectedStaff && window.selectedStaff.name) {
          serviceName.innerHTML = service.name + 
            ' (x' + service.quantity + ')' +
            ' <span style="color: #667eea; font-weight: 500;">- by ' + window.selectedStaff.name + '</span>';
        } else {
          serviceName.textContent += ' (x' + service.quantity + ')';
        }
      }
      
      var serviceDetails = document.createElement('div');
      serviceDetails.style.fontSize = '0.85rem';
      serviceDetails.style.color = '#666';
      serviceDetails.style.marginTop = '2px';
      
      var duration = '';
      if (service.duration) {
        // Convert duration from milliseconds to minutes
        var durationMs = typeof service.duration === 'bigint' ? Number(service.duration) : service.duration;
        var minutes = Math.round(durationMs / 60000); // Convert milliseconds to minutes
        var hours = Math.floor(minutes / 60);
        var mins = minutes % 60;
        if (hours > 0) {
          duration = hours + 'h';
          if (mins > 0) duration += ' ' + mins + 'm';
        } else {
          duration = mins + 'm';
        }
        totalDuration += minutes * (service.quantity || 1);
      }
      
      var price = '';
      if (service.price && service.price.amount) {
        var amount = typeof service.price.amount === 'bigint' ? Number(service.price.amount) : service.price.amount;
        price = '$' + (amount / 100).toFixed(2);
        totalPrice += amount * (service.quantity || 1);
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
      totalsInfo.style.flex = '1';
      
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
      
      totalsDetails.innerHTML = '<i class="fas fa-clock me-1"></i>' + totalDurationText;
      if (totalPriceText) {
        totalsDetails.innerHTML += ' • <span style="color: #28a745; font-weight: 600;">' + totalPriceText + '</span>';
      }
      
      totalsInfo.appendChild(totalsTitle);
      totalsInfo.appendChild(totalsDetails);
      
      totalsLi.appendChild(totalsInfo);
      summaryItems.appendChild(totalsLi);
    }
    
    summaryItems.style.display = 'block';
    summaryEmpty.style.display = 'none';
    
    // Always enable continue button on availability page (time slot selection will handle validation)
    if (continueBtn) {
      continueBtn.style.opacity = '1';
      continueBtn.removeAttribute('disabled');
    }
    if (summaryBarNext) {
      summaryBarNext.style.opacity = '1';
      summaryBarNext.removeAttribute('disabled');
    }
    if (summarySheetNext) {
      summarySheetNext.style.opacity = '1';
      summarySheetNext.removeAttribute('disabled');
    }
  } else {
    console.log('DEBUG: No items found, showing empty state');
    console.log('DEBUG: window.serviceDetails value:', window.serviceDetails);
    summaryItems.style.display = 'none';
    summaryEmpty.style.display = 'block';
    
    // Force enable continue button for testing
    if (continueBtn) {
      continueBtn.style.opacity = '1';
      continueBtn.removeAttribute('disabled');
    }
    if (summaryBarNext) {
      summaryBarNext.style.opacity = '1';
      summaryBarNext.removeAttribute('disabled');
    }
    if (summarySheetNext) {
      summarySheetNext.style.opacity = '1';
      summarySheetNext.removeAttribute('disabled');
    }
  }
}

// Update mobile bar and bottom sheet for availability page
function updateAvailabilityBarAndSheet() {
  var bar = document.getElementById('summary-bottom-bar');
  var barCount = document.getElementById('summary-bar-count');
  var barTotal = document.getElementById('summary-bar-total');
  var barDuration = document.getElementById('summary-bar-duration');
  
  if (!bar) return;
  
  var hasItems = typeof window.serviceDetails !== 'undefined' && window.serviceDetails && window.serviceDetails.length > 0;
  
  if (hasItems) {
    var totalItems = 0;
    var totalPrice = 0;
    var totalDuration = 0;
    
    window.serviceDetails.forEach(function(service) {
      totalItems += service.quantity || 1;
      if (service.price && service.price.amount) {
        var amount = typeof service.price.amount === 'bigint' ? Number(service.price.amount) : service.price.amount;
        totalPrice += amount * (service.quantity || 1);
      }
      if (service.duration) {
        var durationMs = typeof service.duration === 'bigint' ? Number(service.duration) : service.duration;
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
    
    bar.style.display = 'block';
  } else {
    bar.style.display = 'none';
  }
}

// Initialize availability bottom sheet
function initAvailabilityBottomSheet() {
  var sheet = document.getElementById('summary-bottom-sheet');
  var overlay = document.getElementById('summary-sheet-overlay');
  var barExpand = document.getElementById('summary-bar-expand');
  var sheetClose = document.getElementById('summary-sheet-close');
  
  if (!sheet) return;
  
  function openBottomSheet() {
    updateAvailabilityBottomSheetContent();
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

  if (barExpand) barExpand.addEventListener('click', openBottomSheet);
  if (sheetClose) sheetClose.addEventListener('click', closeBottomSheet);
  if (overlay) overlay.addEventListener('click', closeBottomSheet);
}

// Update availability bottom sheet content
function updateAvailabilityBottomSheetContent() {
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
        var durationMs = typeof service.duration === 'bigint' ? Number(service.duration) : service.duration;
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
        var amount = typeof service.price.amount === 'bigint' ? Number(service.price.amount) : service.price.amount;
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
    
    // Add totals section if 2 or more services OR 1 service with qty >= 2
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
