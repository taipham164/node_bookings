/**
 * Enhanced Firebase Authentication with Session Persistence
 * 
 * This module extends Firebase authentication to work seamlessly with
 * the session persistence system, ensuring all form data is maintained
 * across the booking flow and during phone verification.
 */

class FirebaseSessionManager {
  constructor() {
    this.auth = null;
    this.recaptchaVerifier = null;
    this.confirmationResult = null;
    this.currentPhoneNumber = '';
    this.isInitialized = false;
    
    console.log('FirebaseSessionManager initialized');
  }

  /**
   * Initialize Firebase authentication
   */
  async initialize(firebaseConfig) {
    try {
      if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded');
      }

      // Initialize Firebase app if not already initialized
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      
      this.auth = firebase.auth();
      this.isInitialized = true;

      // Set up authentication state listener
      this.auth.onAuthStateChanged((user) => {
        this.handleAuthStateChange(user);
      });

      console.log('Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      return false;
    }
  }

  /**
   * Handle authentication state changes
   */
  handleAuthStateChange(user) {
    if (user) {
      console.log('User authenticated:', user.phoneNumber);
      
      // Save authentication state
      if (window.sessionPersistence) {
        window.sessionPersistence.saveAuthState(user);
      }

      // Restore any saved form data
      this.restoreUserData();
    } else {
      console.log('User signed out');
      
      // Clear authentication state but preserve form data
      if (window.sessionPersistence) {
        window.sessionPersistence.clearAuthState();
      }
    }
  }

  /**
   * Setup reCAPTCHA verifier
   */
  setupRecaptcha(containerId = 'recaptcha-container') {
    try {
      if (!this.recaptchaVerifier) {
        this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId, {
          'size': 'invisible',
          'callback': (response) => {
            console.log('reCAPTCHA verified');
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
          }
        });
      }
      return true;
    } catch (error) {
      console.error('Failed to setup reCAPTCHA:', error);
      return false;
    }
  }

  /**
   * Send SMS verification code
   */
  async sendVerificationCode(phoneNumber) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase not initialized');
      }

      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      if (!normalizedPhone) {
        throw new Error('Invalid phone number format');
      }

      // Setup reCAPTCHA if not already done
      if (!this.setupRecaptcha()) {
        throw new Error('Failed to setup reCAPTCHA');
      }

      // Save current form data before verification
      this.saveCurrentFormData();

      // Send verification code
      this.confirmationResult = await this.auth.signInWithPhoneNumber(
        normalizedPhone, 
        this.recaptchaVerifier
      );

      this.currentPhoneNumber = normalizedPhone;
      console.log('SMS verification code sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send verification code:', error);
      throw error;
    }
  }

  /**
   * Verify SMS code
   */
  async verifyCode(code) {
    try {
      if (!this.confirmationResult) {
        throw new Error('No verification in progress');
      }

      const result = await this.confirmationResult.confirm(code);
      console.log('Phone verification successful:', result.user.phoneNumber);

      // Restore form data after verification
      this.restoreUserData();

      return result.user;
    } catch (error) {
      console.error('Code verification failed:', error);
      throw error;
    }
  }

  /**
   * Save current form data before phone verification
   */
  saveCurrentFormData() {
    if (!window.sessionPersistence) return;

    console.log('Saving form data before phone verification...');

    // Save all current page data
    window.sessionPersistence.saveCurrentPageData();

    // Save contact form data specifically
    const form = document.querySelector('form[action="/booking/create"]');
    if (form) {
      const formData = this.extractFormData(form);
      window.sessionPersistence.setCookie('contact_backup', formData);
    }

    // Save phone number for verification
    if (this.currentPhoneNumber) {
      window.sessionPersistence.setCookie('verification_phone', {
        phoneNumber: this.currentPhoneNumber,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Restore user data after authentication
   */
  restoreUserData() {
    if (!window.sessionPersistence) return;

    console.log('Restoring user data after authentication...');

    // Restore all page data
    setTimeout(() => {
      window.sessionPersistence.restoreCurrentPageData();
    }, 100);

    // Restore contact form backup if available
    const contactBackup = window.sessionPersistence.getCookie('contact_backup');
    if (contactBackup) {
      setTimeout(() => {
        this.restoreFormData(contactBackup);
      }, 200);
    }
  }

  /**
   * Extract form data from a form element
   */
  extractFormData(form) {
    const formData = {};
    const inputs = form.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      if (input.name && !this.isSensitiveField(input.name)) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          formData[input.name] = input.checked;
        } else {
          formData[input.name] = input.value;
        }
      }
    });

    return formData;
  }

  /**
   * Restore form data to a form
   */
  restoreFormData(formData) {
    const form = document.querySelector('form[action="/booking/create"]');
    if (!form) return;

    Object.keys(formData).forEach(name => {
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
  }

  /**
   * Check if a field contains sensitive information
   */
  isSensitiveField(fieldName) {
    const sensitiveFields = [
      'password', 'cardNumber', 'cvv', 'cardNonce', 
      'socialSecurityNumber', 'ssn', 'creditCard'
    ];
    
    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }

  /**
   * Normalize phone number to E.164 format
   */
  normalizePhoneNumber(phone) {
    if (!phone) return null;
    
    const digits = phone.replace(/\D/g, '');
    
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    } else if (digits.length >= 10) {
      return `+${digits}`;
    }
    
    return null;
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated() {
    return this.auth && this.auth.currentUser !== null;
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser() {
    return this.auth ? this.auth.currentUser : null;
  }

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      if (this.auth) {
        await this.auth.signOut();
        console.log('User signed out successfully');
      }
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error) {
    const errorMessages = {
      'auth/invalid-phone-number': 'Invalid phone number. Please check your number and try again.',
      'auth/too-many-requests': 'Too many requests. Please try again later.',
      'auth/captcha-check-failed': 'reCAPTCHA verification failed. Please refresh the page and try again.',
      'auth/invalid-verification-code': 'Invalid verification code. Please check and try again.',
      'auth/code-expired': 'Verification code expired. Please request a new code.',
      'auth/billing-not-enabled': 'Phone authentication requires Firebase billing to be enabled.',
      'auth/quota-exceeded': 'SMS quota exceeded. Please try again later.'
    };

    return errorMessages[error.code] || `Authentication error: ${error.message}`;
  }

  /**
   * Auto-restore session on page load
   */
  autoRestoreSession() {
    if (!window.sessionPersistence) return;

    // Check if we have stored authentication state
    const authState = window.sessionPersistence.getAuthState();
    if (authState && authState.isAuthenticated) {
      console.log('Found stored auth state, checking Firebase auth...');
      
      // Wait for Firebase auth state to be determined
      setTimeout(() => {
        if (!this.isAuthenticated()) {
          console.log('Firebase auth state lost, clearing stored auth');
          window.sessionPersistence.clearAuthState();
        }
      }, 1000);
    }

    // Restore form data regardless of auth state
    this.restoreUserData();
  }
}

// Initialize global Firebase session manager
window.firebaseSessionManager = new FirebaseSessionManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Auto-restore session data
  if (window.firebaseSessionManager) {
    setTimeout(() => {
      window.firebaseSessionManager.autoRestoreSession();
    }, 200);
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FirebaseSessionManager;
}
