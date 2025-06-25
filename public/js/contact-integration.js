/**
 * Enhanced Contact Page Integration with Firebase Session Persistence
 * 
 * This script integrates Firebase authentication with comprehensive session
 * persistence for the contact/checkout page, ensuring all form data is
 * maintained during phone verification and across navigation.
 */

// Wait for DOM and dependencies to load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 [Contact] Enhanced contact page loading...');
    
    // Wait for dependencies to be available
    let initAttempts = 0;
    const maxAttempts = 20;
    
    function initializeContactIntegration() {
        initAttempts++;
        
        if (typeof firebase === 'undefined' || 
            typeof window.sessionPersistence === 'undefined' || 
            typeof window.firebaseSessionManager === 'undefined') {
            
            if (initAttempts < maxAttempts) {
                console.log(`⏳ [Contact] Waiting for dependencies... (${initAttempts}/${maxAttempts})`);
                setTimeout(initializeContactIntegration, 250);
                return;
            } else {
                console.error('❌ [Contact] Failed to load dependencies after maximum attempts');
                return;
            }
        }
        
        console.log('✅ [Contact] All dependencies loaded, initializing...');
        initContactPageEnhancements();
    }
    
    // Start initialization
    setTimeout(initializeContactIntegration, 100);
});

function initContactPageEnhancements() {
    console.log('🔧 [Contact] Starting contact page enhancements...');
    
    // Initialize Firebase session manager with config
    const firebaseConfig = {
        apiKey: window.firebaseConfig?.apiKey || document.querySelector('script')?.textContent?.match(/apiKey:\s*"([^"]+)"/)?.[1],
        authDomain: window.firebaseConfig?.authDomain || document.querySelector('script')?.textContent?.match(/authDomain:\s*"([^"]+)"/)?.[1],
        projectId: window.firebaseConfig?.projectId || document.querySelector('script')?.textContent?.match(/projectId:\s*"([^"]+)"/)?.[1],
        storageBucket: window.firebaseConfig?.storageBucket || document.querySelector('script')?.textContent?.match(/storageBucket:\s*"([^"]+)"/)?.[1],
        messagingSenderId: window.firebaseConfig?.messagingSenderId || document.querySelector('script')?.textContent?.match(/messagingSenderId:\s*"([^"]+)"/)?.[1],
        appId: window.firebaseConfig?.appId || document.querySelector('script')?.textContent?.match(/appId:\s*"([^"]+)"/)?.[1]
    };
    
    // Initialize Firebase session manager
    window.firebaseSessionManager.initialize(firebaseConfig);
    
    // Enhance phone verification functionality
    enhancePhoneVerification();
    
    // Setup form auto-save
    setupFormAutoSave();
    
    // Setup navigation preservation
    setupNavigationPreservation();
    
    // Restore saved data
    restoreContactPageData();
    
    console.log('✅ [Contact] Contact page enhancements complete');
}

function enhancePhoneVerification() {
    console.log('📱 [Contact] Enhancing phone verification...');
    
    // Override existing phone verification functions
    const originalCheckPhone = window.checkPhone;
    const originalShowSMSModal = window.showSMSModal;
    const originalVerifySMSCode = window.verifySMSCode;
    
    // Enhanced phone checking with session preservation
    window.checkPhone = async function() {
        console.log('📱 [Contact] Starting enhanced phone check...');
        
        // Save current form state before verification
        saveCurrentFormState();
        
        if (originalCheckPhone) {
            return await originalCheckPhone.apply(this, arguments);
        }
    };
    
    // Enhanced SMS modal with session preservation
    window.showSMSModal = async function() {
        console.log('📱 [Contact] Starting enhanced SMS verification...');
        
        // Save form state before SMS verification
        saveCurrentFormState();
        
        const phoneInput = document.getElementById('phoneNumber');
        if (phoneInput && phoneInput.value) {
            try {
                // Use Firebase session manager for SMS sending
                await window.firebaseSessionManager.sendVerificationCode(phoneInput.value);
                
                if (originalShowSMSModal) {
                    return await originalShowSMSModal.apply(this, arguments);
                }
            } catch (error) {
                console.error('📱 [Contact] SMS sending failed:', error);
                showErrorMessage(window.firebaseSessionManager.handleAuthError(error));
            }
        }
    };
    
    // Enhanced SMS code verification
    window.verifySMSCode = async function(code) {
        console.log('📱 [Contact] Starting enhanced SMS code verification...');
        
        try {
            // Use Firebase session manager for code verification
            const user = await window.firebaseSessionManager.verifyCode(code);
            
            // Restore form state after successful verification
            setTimeout(() => {
                restoreFormState();
            }, 500);
            
            if (originalVerifySMSCode) {
                return await originalVerifySMSCode.apply(this, arguments);
            }
            
            return user;
        } catch (error) {
            console.error('📱 [Contact] SMS verification failed:', error);
            showErrorMessage(window.firebaseSessionManager.handleAuthError(error));
            throw error;
        }
    };
}

function setupFormAutoSave() {
    console.log('💾 [Contact] Setting up form auto-save...');
    
    const form = document.querySelector('form[action="/booking/create"]');
    if (!form) return;
    
    // Save form data on input changes
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        // Skip sensitive fields
        if (input.name && !isSensitiveField(input.name)) {
            input.addEventListener('input', () => {
                debounce(() => saveCurrentFormState(), 500)();
            });
            
            input.addEventListener('change', () => {
                saveCurrentFormState();
            });
        }
    });
    
    console.log(`💾 [Contact] Auto-save setup for ${inputs.length} form fields`);
}

function setupNavigationPreservation() {
    console.log('🔄 [Contact] Setting up navigation preservation...');
    
    // Save state before page unload
    window.addEventListener('beforeunload', () => {
        saveCurrentFormState();
        window.sessionPersistence.saveCurrentPageData();
    });
    
    // Handle back/forward navigation
    window.addEventListener('popstate', () => {
        setTimeout(() => {
            restoreContactPageData();
        }, 100);
    });
    
    // Override form submission to save state
    const form = document.querySelector('form[action="/booking/create"]');
    if (form) {
        form.addEventListener('submit', (e) => {
            // Save state before submission
            saveCurrentFormState();
            console.log('📤 [Contact] Form submitted, state saved');
        });
    }
}

function saveCurrentFormState() {
    if (!window.sessionPersistence) return;
    
    console.log('💾 [Contact] Saving current form state...');
    
    const form = document.querySelector('form[action="/booking/create"]');
    if (!form) return;
    
    const formData = {
        timestamp: Date.now(),
        formSection: 'contact'
    };
    
    // Collect all form data
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        if (input.name && !isSensitiveField(input.name)) {
            if (input.type === 'checkbox' || input.type === 'radio') {
                formData[input.name] = input.checked;
            } else {
                formData[input.name] = input.value;
            }
        }
    });
    
    // Save to session persistence
    window.sessionPersistence.setCookie('contact_form', formData);
    
    // Also save via the standard contact save method
    window.sessionPersistence.saveContactFormData();
    
    console.log('💾 [Contact] Form state saved:', Object.keys(formData).length, 'fields');
}

function restoreContactPageData() {
    if (!window.sessionPersistence) return;
    
    console.log('🔄 [Contact] Restoring contact page data...');
    
    // Restore standard contact form data
    window.sessionPersistence.restoreContactFormData();
    
    // Restore additional form state
    const contactForm = window.sessionPersistence.getCookie('contact_form');
    if (contactForm) {
        setTimeout(() => {
            restoreFormState(contactForm);
        }, 200);
    }
    
    // Restore phone number if available
    const verificationPhone = window.sessionPersistence.getCookie('verification_phone');
    if (verificationPhone && verificationPhone.phoneNumber) {
        const phoneInput = document.getElementById('phoneNumber');
        if (phoneInput && !phoneInput.value) {
            phoneInput.value = verificationPhone.phoneNumber;
            console.log('📱 [Contact] Restored phone number from verification');
        }
    }
}

function restoreFormState(formData) {
    if (!formData) return;
    
    console.log('🔄 [Contact] Restoring form state...');
    
    const form = document.querySelector('form[action="/booking/create"]');
    if (!form) return;
    
    let restoredFields = 0;
    
    Object.keys(formData).forEach(name => {
        if (name === 'timestamp' || name === 'formSection') return;
        
        const input = form.querySelector(`[name="${name}"]`);
        if (input) {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = formData[name];
            } else {
                input.value = formData[name];
            }
            
            // Trigger change event to update UI
            input.dispatchEvent(new Event('change', { bubbles: true }));
            restoredFields++;
        }
    });
    
    console.log(`🔄 [Contact] Restored ${restoredFields} form fields`);
}

function isSensitiveField(fieldName) {
    const sensitiveFields = [
        'password', 'cardNumber', 'cvv', 'cardNonce', 
        'socialSecurityNumber', 'ssn', 'creditCard', 'card'
    ];
    
    return sensitiveFields.some(field => 
        fieldName.toLowerCase().includes(field.toLowerCase())
    );
}

function showErrorMessage(message) {
    // Try to find existing error display elements
    const errorElements = [
        document.getElementById('error-alert'),
        document.querySelector('.alert-danger'),
        document.querySelector('.error-message')
    ];
    
    const errorElement = errorElements.find(el => el !== null);
    
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        // Create temporary error display
        const tempError = document.createElement('div');
        tempError.className = 'alert alert-danger';
        tempError.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 15px; background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 5px; max-width: 400px;';
        tempError.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>${message}`;
        
        document.body.appendChild(tempError);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (tempError.parentNode) {
                tempError.parentNode.removeChild(tempError);
            }
        }, 5000);
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export for debugging
window.contactPageIntegration = {
    saveCurrentFormState,
    restoreContactPageData,
    restoreFormState,
    isSensitiveField,
    showErrorMessage
};

console.log('📱 [Contact] Enhanced contact page integration loaded');
