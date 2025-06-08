/**
 * Appointment Summary Component
 * Handles the appointment summary sidebar, mobile summary bar, and bottom sheet
 */

// Initialize appointment summary functionality
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the staff page
  var staffForm = document.querySelector('form[id="staff-form"]');
  var servicesForm = document.querySelector('form[id="services-form"]');
  
  if (staffForm) {
    initStaffPageSummary();
  } else if (servicesForm) {
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
  }
  
  // Set up form handlers for appointment summary buttons
  setupFormHandlers();
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
  
  checked.forEach(function(cb) {
    var label = cb.closest('.service-label');
    var name = label ? label.querySelector('h4')?.textContent?.trim() : '';
    var qtyInput = document.getElementById('quantity-' + cb.value);
    var qty = qtyInput && !qtyInput.disabled ? parseInt(qtyInput.value, 10) || 1 : 1;
    var priceSpan = label ? label.querySelector('span[style*="color:#0070f3"]') : null;
    var price = priceSpan ? priceSpan.textContent.trim() : '';
    var durationSpan = label ? label.querySelector('span[style*="color:#888"]') : null;
    var duration = durationSpan ? durationSpan.textContent.trim().replace(/^•\s*/, '') : '';
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
  
  // Update summary visibility
  summaryItems.style.display = hasItems ? 'block' : 'none';
  summaryEmpty.style.display = hasItems ? 'none' : 'block';  // Update all next buttons with enhanced styling for inline button
  const nextButtons = [continueBtn, summaryBarNext, summarySheetNext];
  nextButtons.forEach(btn => {
    if (btn) {
      if (hasItems) {
        btn.style.display = btn === continueBtn ? 'block' : '';
        btn.disabled = false;
        // Enhanced styling for inline continue button
        if (btn === continueBtn) {
          btn.style.opacity = '1';
          btn.style.cursor = 'pointer';
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
      var durationText = durationSpan.textContent.trim().replace(/^•\s*/, '');
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
  
  if (!summaryList || !summaryItems || !summaryEmpty) return;
  
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
  
  if (hasItems) {
    summaryList.style.display = 'block';
    summaryEmpty.style.display = 'none';
    
    summaryItems.innerHTML = '';
    
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
      if (service.quantity > 1) {
        serviceName.textContent += ' (x' + service.quantity + ')';
      }
      
      var serviceDetails = document.createElement('div');
      serviceDetails.style.fontSize = '0.85rem';
      serviceDetails.style.color = '#666';
      serviceDetails.style.marginTop = '2px';
      
      var duration = '';
      if (service.duration) {
        var minutes = typeof service.duration === 'bigint' ? Number(service.duration) : service.duration;
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
    
    // Add staff selection info if staff is selected
    if (staffName) {
      var staffLi = document.createElement('li');
      staffLi.style.display = 'flex';
      staffLi.style.alignItems = 'center';
      staffLi.style.marginTop = '12px';
      staffLi.style.padding = '8px 0';
      staffLi.style.borderTop = '1px solid #e9ecef';
      staffLi.style.fontWeight = '500';
      staffLi.style.color = '#667eea';
      
      staffLi.innerHTML = '<i class="fas fa-user me-2"></i>- by ' + staffName;
      summaryItems.appendChild(staffLi);
    }
    
  } else {
    summaryList.style.display = 'none';
    summaryEmpty.style.display = 'block';
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
        var duration = typeof service.duration === 'bigint' ? Number(service.duration) : service.duration;
        totalDuration += duration * (service.quantity || 1);
      }
    });
    
    if (barCount) {
      barCount.textContent = totalItems + ' service' + (totalItems !== 1 ? 's' : '');
      if (selectedStaff) {
        var staffName = selectedStaff.value === 'anyStaffMember' ? 'Any Staff' : 'Staff Selected';
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

// Update staff bottom sheet content
function updateStaffBottomSheetContent() {
  var sheetItems = document.getElementById('summary-sheet-items');
  var sheetEmpty = document.getElementById('summary-sheet-empty');
  
  if (!sheetItems || !sheetEmpty) return;
  
  var hasItems = typeof window.serviceDetails !== 'undefined' && window.serviceDetails && window.serviceDetails.length > 0;
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
  
  // Clear sheet items
  sheetItems.innerHTML = '';
  
  if (hasItems) {
    sheetItems.style.display = 'block';
    sheetEmpty.style.display = 'none';
    
    // Add service items
    window.serviceDetails.forEach(function(service) {
      var li = document.createElement('li');
      li.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #eee;';
      
      var serviceInfo = document.createElement('div');
      serviceInfo.style.flex = '1';
      
      var serviceName = document.createElement('div');
      serviceName.style.fontWeight = '600';
      serviceName.style.color = '#333';
      serviceName.textContent = service.name;
      if (service.quantity > 1) {
        serviceName.textContent += ' (x' + service.quantity + ')';
      }
      
      var serviceDetails = document.createElement('div');
      serviceDetails.style.fontSize = '0.92em';
      serviceDetails.style.color = '#666';
      serviceDetails.style.marginTop = '4px';
      
      var duration = '';
      if (service.duration) {
        var minutes = typeof service.duration === 'bigint' ? Number(service.duration) : service.duration;
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
      sheetItems.appendChild(li);
    });
    
    // Add staff selection info if staff is selected
    if (staffName) {
      var staffLi = document.createElement('li');
      staffLi.style.cssText = 'display:flex;align-items:center;padding:12px 0;margin-top:8px;border-top:1px solid #e9ecef;font-weight:500;color:#667eea;';
      staffLi.innerHTML = '<i class="fas fa-user" style="margin-right:8px;"></i>- by ' + staffName;
      sheetItems.appendChild(staffLi);
    }
    
  } else {
    sheetItems.style.display = 'none';
    sheetEmpty.style.display = 'block';
  }
}
