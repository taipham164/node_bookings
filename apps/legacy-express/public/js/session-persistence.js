/**
 * Session Persistence Manager - Firebase Cookie-based Session Management
 * 
 * Handles saving and restoring all form sections using cookies with Firebase authentication
 * to maintain user selections when navigating back through the booking flow.
 * 
 * Features:
 * - Service selections with quantities
 * - Staff member selection
 * - Date and time slot selection
 * - Contact form data
 * - Firebase authentication state
 * - Automatic cleanup and session management
 */

class SessionPersistenceManager {
  constructor() {
    this.cookiePrefix = 'booking_session_';
    this.cookieOptions = {
      expires: 1, // 1 day
      path: '/',
      secure: window.location.protocol === 'https:',
      sameSite: 'Lax'
    };
    
    // Initialize Firebase if available
    this.initializeFirebase();
    
    console.log('SessionPersistenceManager initialized');
  }

  /**
   * Initialize Firebase authentication monitoring
   */
  initializeFirebase() {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          console.log('Firebase user authenticated:', user.phoneNumber);
          this.saveAuthState(user);
        } else {
          console.log('Firebase user signed out');
          this.clearAuthState();
        }
      });
    }
  }

  /**
   * Set a cookie with proper options
   */
  setCookie(name, value, options = {}) {
    const opts = { ...this.cookieOptions, ...options };
    let cookieString = `${this.cookiePrefix}${name}=${encodeURIComponent(JSON.stringify(value))}`;
    
    if (opts.expires) {
      const date = new Date();
      date.setTime(date.getTime() + (opts.expires * 24 * 60 * 60 * 1000));
      cookieString += `; expires=${date.toUTCString()}`;
    }
    
    cookieString += `; path=${opts.path}`;
    if (opts.secure) cookieString += '; secure';
    if (opts.sameSite) cookieString += `; samesite=${opts.sameSite}`;
    
    document.cookie = cookieString;
    console.log(`Saved cookie: ${this.cookiePrefix}${name}`);
  }

  /**
   * Get a cookie value
   */
  getCookie(name) {
    const cookieName = `${this.cookiePrefix}${name}=`;
    const cookies = document.cookie.split(';');
    
    for (let i = 0; i < cookies.length; i++) {
      let c = cookies[i].trim();
      if (c.indexOf(cookieName) === 0) {
        try {
          return JSON.parse(decodeURIComponent(c.substring(cookieName.length)));
        } catch (e) {
          console.warn(`Failed to parse cookie ${name}:`, e);
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Delete a cookie
   */
  deleteCookie(name) {
    document.cookie = `${this.cookiePrefix}${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    console.log(`Deleted cookie: ${this.cookiePrefix}${name}`);
  }

  /**
   * Save service selections with quantities
   */
  saveServiceSelections() {
    const form = document.querySelector('form[action="/services/select"]');
    if (!form) return;

    const selections = {
      services: [],
      quantities: {},
      timestamp: Date.now()
    };

    // Get selected services
    const checkboxes = form.querySelectorAll('input[type="checkbox"][name="services[]"]:checked');
    checkboxes.forEach(checkbox => {
      selections.services.push(checkbox.value);
      
      // Get quantity for this service
      const qtyInput = document.getElementById(`quantity-${checkbox.value}`);
      if (qtyInput) {
        selections.quantities[checkbox.value] = parseInt(qtyInput.value) || 1;
      } else {
        selections.quantities[checkbox.value] = 1;
      }
    });

    // Also store service details if available
    if (typeof window.serviceDetails !== 'undefined' && window.serviceDetails) {
      selections.serviceDetails = window.serviceDetails;
    }

    this.setCookie('services', selections);
    console.log('Saved service selections:', selections);
  }

  /**
   * Restore service selections
   */
  restoreServiceSelections() {
    const selections = this.getCookie('services');
    if (!selections) return false;

    const form = document.querySelector('form[action="/services/select"]');
    if (!form) return false;

    console.log('Restoring service selections:', selections);

    // Restore selected services and quantities
    selections.services.forEach(serviceId => {
      const checkbox = form.querySelector(`input[type="checkbox"][name="services[]"][value="${serviceId}"]`);
      if (checkbox) {
        checkbox.checked = true;
        
        // Restore quantity
        const quantity = selections.quantities[serviceId] || 1;
        const qtyInput = document.getElementById(`quantity-${serviceId}`);
        if (qtyInput) {
          qtyInput.value = quantity;
        }

        // Trigger change events
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        if (qtyInput) {
          qtyInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });

    // Restore service details to global scope
    if (selections.serviceDetails) {
      window.serviceDetails = selections.serviceDetails;
    }

    return true;
  }

  /**
   * Save staff selection
   */
  saveStaffSelection() {
    const form = document.querySelector('form[action="/staff/select"]');
    if (!form) return;

    const selectedRadio = form.querySelector('input[name="staffId"]:checked');
    if (!selectedRadio) return;

    const staffData = {
      staffId: selectedRadio.value,
      timestamp: Date.now()
    };

    // Get staff details if available
    if (selectedRadio.value === 'anyStaffMember') {
      staffData.staffInfo = {
        id: 'anyStaffMember',
        name: 'Any Available Staff',
        description: 'Looking for the earliest available appointment'
      };
    } else {
      const staffCard = selectedRadio.closest('.staff-card');
      if (staffCard) {
        const nameElement = staffCard.querySelector('.staff-info h4');
        const descElement = staffCard.querySelector('.staff-description');
        const imageElement = staffCard.querySelector('img');
        
        staffData.staffInfo = {
          id: selectedRadio.value,
          name: nameElement ? nameElement.textContent.trim() : 'Selected Staff',
          description: descElement ? descElement.textContent.trim() : '',
          profileImageUrl: imageElement ? imageElement.src : ''
        };
      }
    }

    // Store global staff data if available
    if (typeof window.selectedStaff !== 'undefined') {
      staffData.selectedStaff = window.selectedStaff;
    }

    this.setCookie('staff', staffData);
    console.log('Saved staff selection:', staffData);
  }

  /**
   * Restore staff selection
   */
  restoreStaffSelection() {
    const staffData = this.getCookie('staff');
    if (!staffData) return false;

    const form = document.querySelector('form[action="/staff/select"]');
    if (!form) return false;

    console.log('Restoring staff selection:', staffData);

    const radio = form.querySelector(`input[name="staffId"][value="${staffData.staffId}"]`);
    if (radio) {
      radio.checked = true;
      
      // Update visual selection
      const staffCards = form.querySelectorAll('.staff-card');
      staffCards.forEach(card => card.classList.remove('selected'));
      
      const selectedCard = radio.closest('.staff-card');
      if (selectedCard) {
        selectedCard.classList.add('selected');
      }

      // Trigger change event
      radio.dispatchEvent(new Event('change', { bubbles: true }));

      // Restore global staff data
      if (staffData.selectedStaff) {
        window.selectedStaff = staffData.selectedStaff;
      } else if (staffData.staffInfo) {
        window.selectedStaff = staffData.staffInfo;
      }

      return true;
    }

    return false;
  }

  /**
   * Save availability selection (date and time)
   */
  saveAvailabilitySelection() {
    const urlParams = new URLSearchParams(window.location.search);
    const startAt = urlParams.get('startAt');
    
    if (!startAt) return;

    const availabilityData = {
      startAt: startAt,
      timestamp: Date.now()
    };

    // Try to get selected date from various sources
    const selectedDateElement = document.getElementById('selected-date-text');
    if (selectedDateElement) {
      availabilityData.selectedDate = selectedDateElement.textContent.trim();
    }

    // Get selected time slot information
    const selectedTimeSlot = document.querySelector('.time-slot.selected, .time-option.selected');
    if (selectedTimeSlot) {
      availabilityData.selectedTime = selectedTimeSlot.textContent.trim();
    }

    // Store staff information from URL if available
    const urlStaffId = window.location.pathname.split('/')[2]; // /availability/:staffId/:serviceId
    if (urlStaffId) {
      availabilityData.staffId = urlStaffId;
    }

    this.setCookie('availability', availabilityData);
    console.log('Saved availability selection:', availabilityData);
  }

  /**
   * Restore availability selection
   */
  restoreAvailabilitySelection() {
    const availabilityData = this.getCookie('availability');
    if (!availabilityData) return false;

    console.log('Restoring availability selection:', availabilityData);

    // Restore date selection
    if (availabilityData.selectedDate) {
      // Try to find and click the date if it exists
      setTimeout(() => {
        const dateStr = availabilityData.startAt.split('T')[0]; // Get just the date part
        const dateElements = document.querySelectorAll('.date-option[data-date]');
        dateElements.forEach(el => {
          if (el.getAttribute('data-date') === dateStr) {
            el.click();
          }
        });
      }, 500);
    }

    // Restore time slot selection
    if (availabilityData.selectedTime) {
      setTimeout(() => {
        const timeButtons = document.querySelectorAll('.time-option, .time-slot');
        timeButtons.forEach(btn => {
          if (btn.textContent.trim().includes(availabilityData.selectedTime.replace(/\s+/g, ' '))) {
            btn.click();
          }
        });
      }, 1000);
    }

    return true;
  }

  /**
   * Save contact form data
   */
  saveContactFormData() {
    const form = document.querySelector('form[action="/booking/create"]');
    if (!form) return;

    const formData = {
      timestamp: Date.now()
    };

    // Collect form data
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      if (input.name && !input.name.includes('password') && !input.name.includes('cardNonce')) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          formData[input.name] = input.checked;
        } else {
          formData[input.name] = input.value;
        }
      }
    });

    // Don't save sensitive payment information
    delete formData.cardNonce;
    delete formData.cvv;
    delete formData.cardNumber;

    this.setCookie('contact', formData);
    console.log('Saved contact form data:', formData);
  }

  /**
   * Restore contact form data
   */
  restoreContactFormData() {
    const formData = this.getCookie('contact');
    if (!formData) return false;

    const form = document.querySelector('form[action="/booking/create"]');
    if (!form) return false;

    console.log('Restoring contact form data:', formData);

    // Restore form fields
    Object.keys(formData).forEach(name => {
      if (name === 'timestamp') return;

      const input = form.querySelector(`[name="${name}"]`);
      if (input) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = formData[name];
        } else {
          input.value = formData[name];
        }

        // Trigger change event
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    return true;
  }

  /**
   * Save Firebase authentication state
   */
  saveAuthState(user) {
    const authData = {
      phoneNumber: user.phoneNumber,
      uid: user.uid,
      timestamp: Date.now(),
      isAuthenticated: true
    };

    this.setCookie('auth', authData);
    console.log('Saved auth state:', authData);
  }

  /**
   * Clear Firebase authentication state
   */
  clearAuthState() {
    this.deleteCookie('auth');
    console.log('Cleared auth state');
  }

  /**
   * Get authentication state
   */
  getAuthState() {
    return this.getCookie('auth');
  }

  /**
   * Save all current form data based on current page
   */
  saveCurrentPageData() {
    const pathname = window.location.pathname;

    if (pathname === '/services' || pathname.startsWith('/services')) {
      this.saveServiceSelections();
    } else if (pathname.startsWith('/staff')) {
      this.saveStaffSelection();
    } else if (pathname.startsWith('/availability')) {
      this.saveAvailabilitySelection();
    } else if (pathname === '/contact' || pathname.startsWith('/contact')) {
      this.saveContactFormData();
    }
  }

  /**
   * Restore data for current page
   */
  restoreCurrentPageData() {
    const pathname = window.location.pathname;

    if (pathname === '/services' || pathname.startsWith('/services')) {
      return this.restoreServiceSelections();
    } else if (pathname.startsWith('/staff')) {
      return this.restoreStaffSelection();
    } else if (pathname.startsWith('/availability')) {
      return this.restoreAvailabilitySelection();
    } else if (pathname === '/contact' || pathname.startsWith('/contact')) {
      return this.restoreContactFormData();
    }

    return false;
  }

  /**
   * Clear all session data
   */
  clearAllData() {
    ['services', 'staff', 'availability', 'contact', 'auth'].forEach(key => {
      this.deleteCookie(key);
    });
    console.log('Cleared all session data');
  }

  /**
   * Get all stored session data for debugging
   */
  getAllStoredData() {
    return {
      services: this.getCookie('services'),
      staff: this.getCookie('staff'),
      availability: this.getCookie('availability'),
      contact: this.getCookie('contact'),
      auth: this.getCookie('auth')
    };
  }

  /**
   * Check if user has any stored session data
   */
  hasStoredData() {
    const data = this.getAllStoredData();
    return Object.values(data).some(value => value !== null);
  }

  /**
   * Initialize auto-save listeners for current page
   */
  initializeAutoSave() {
    const pathname = window.location.pathname;

    if (pathname === '/services' || pathname.startsWith('/services')) {
      this.initializeServiceAutoSave();
    } else if (pathname.startsWith('/staff')) {
      this.initializeStaffAutoSave();
    } else if (pathname.startsWith('/availability')) {
      this.initializeAvailabilityAutoSave();
    } else if (pathname === '/contact' || pathname.startsWith('/contact')) {
      this.initializeContactAutoSave();
    }
  }

  /**
   * Initialize auto-save for service selection page
   */
  initializeServiceAutoSave() {
    const form = document.querySelector('form[action="/services/select"]');
    if (!form) return;

    // Save on checkbox changes
    const checkboxes = form.querySelectorAll('input[type="checkbox"][name="services[]"]');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        setTimeout(() => this.saveServiceSelections(), 100);
      });
    });

    // Save on quantity changes
    const qtyInputs = form.querySelectorAll('input[type="number"]');
    qtyInputs.forEach(input => {
      input.addEventListener('input', () => {
        setTimeout(() => this.saveServiceSelections(), 100);
      });
    });

    console.log('Initialized service auto-save');
  }

  /**
   * Initialize auto-save for staff selection page
   */
  initializeStaffAutoSave() {
    const form = document.querySelector('form[action="/staff/select"]');
    if (!form) return;

    const radios = form.querySelectorAll('input[name="staffId"]');
    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        setTimeout(() => this.saveStaffSelection(), 100);
      });
    });

    console.log('Initialized staff auto-save');
  }

  /**
   * Initialize auto-save for availability page
   */
  initializeAvailabilityAutoSave() {
    // Save when time slots are clicked
    document.addEventListener('click', (e) => {
      if (e.target.closest('.time-slot, .time-option')) {
        setTimeout(() => this.saveAvailabilitySelection(), 100);
      }
    });

    console.log('Initialized availability auto-save');
  }

  /**
   * Initialize auto-save for contact page
   */
  initializeContactAutoSave() {
    const form = document.querySelector('form[action="/booking/create"]');
    if (!form) return;

    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      if (!input.name || input.name.includes('password') || input.name.includes('cardNonce')) {
        return; // Skip sensitive fields
      }

      input.addEventListener('input', () => {
        setTimeout(() => this.saveContactFormData(), 500);
      });

      input.addEventListener('change', () => {
        setTimeout(() => this.saveContactFormData(), 100);
      });
    });

    console.log('Initialized contact auto-save');
  }
}

// Global instance
window.sessionPersistence = new SessionPersistenceManager();

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing session persistence...');
  
  // Restore data for current page
  setTimeout(() => {
    window.sessionPersistence.restoreCurrentPageData();
  }, 200);

  // Initialize auto-save
  setTimeout(() => {
    window.sessionPersistence.initializeAutoSave();
  }, 500);
});

// Save data before page unload
window.addEventListener('beforeunload', function() {
  window.sessionPersistence.saveCurrentPageData();
});

// Handle back/forward navigation
window.addEventListener('popstate', function() {
  setTimeout(() => {
    window.sessionPersistence.restoreCurrentPageData();
  }, 100);
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SessionPersistenceManager;
}
