/**
 * Square Payment Form Debugger
 * Check browser console and DOM state
 */

console.log('🔍 Square Payment Form Debug Utility');

// Check if we're in browser
if (typeof window !== 'undefined') {
    console.log('='.repeat(50));
    console.log('📄 Browser Environment Detected');
    
    // Check Square SDK
    console.log('\n🔧 Square SDK Status:');
    console.log('Square available:', typeof window.Square !== 'undefined');
    console.log('Square object:', window.Square);
    
    // Check DOM elements
    console.log('\n📋 DOM Elements Check:');
    const elements = [
        'existing-card-element',
        'card-element', 
        'existingPostalCode',
        'postalCode',
        'existingCardNonce',
        'cardNonce'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}:`, element ? '✅ Found' : '❌ Not found');
        if (element) {
            console.log(`  - Tag: ${element.tagName}`);
            console.log(`  - Style: ${element.style.display || 'default'}`);
            console.log(`  - Parent visible:`, element.offsetParent !== null);
        }
    });
    
    // Check environment variables (if available)
    console.log('\n🔧 Configuration:');
    // These would be rendered by EJS in the actual page
    console.log('Check page source for APP_ID and LOCATION_ID values');
    
    // Test function to manually initialize Square
    window.testSquareInit = async function() {
        console.log('\n🧪 Manual Square Initialization Test');
        
        if (!window.Square) {
            console.error('❌ Square SDK not available');
            return;
        }
        
        // You would need to replace these with actual values
        const APP_ID = 'YOUR_APP_ID_HERE';
        const LOCATION_ID = 'YOUR_LOCATION_ID_HERE';
        
        try {
            console.log('🔧 Creating payments instance...');
            const payments = window.Square.payments(APP_ID, LOCATION_ID);
            console.log('✅ Payments instance created');
            
            console.log('🔧 Creating card...');
            const card = await payments.card();
            console.log('✅ Card created');
            
            console.log('🔧 Attaching to existing-card-element...');
            await card.attach('#existing-card-element');
            console.log('✅ Successfully attached!');
            
        } catch (error) {
            console.error('❌ Error:', error);
        }
    };
    
    console.log('\n📝 To test manually, run: testSquareInit()');
    
} else {
    console.log('📄 Node.js Environment - Run this in browser console');
}
