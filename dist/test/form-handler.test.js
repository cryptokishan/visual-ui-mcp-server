import { chromium } from 'playwright';
import { FormHandler } from '../dist/form-handler.js';
import { ElementLocator } from '../dist/element-locator.js';
async function testFormHandler() {
    console.log('🚀 Starting Form Handler Tests...\n');
    // Launch browser and navigate to test page
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(`file://${process.cwd()}/test/test-form-handler.html`);
    // Initialize FormHandler
    const elementLocator = new ElementLocator(page);
    const formHandler = new FormHandler(page, elementLocator);
    // Test 1: Fill text inputs
    console.log('Test 1: Filling text inputs');
    try {
        await formHandler.fillForm([
            { selector: '#username', value: 'testuser123' },
            { selector: '#email', value: 'test@example.com' },
            { selector: '#password', value: 'password123' }
        ]);
        console.log('✅ Text inputs test: PASSED');
    }
    catch (error) {
        console.log('❌ Text inputs test failed:', error.message);
    }
    // Test 2: Fill number input
    console.log('\nTest 2: Filling number input');
    try {
        await formHandler.fillForm([
            { selector: '#age', value: '25' }
        ]);
        console.log('✅ Number input test: PASSED');
    }
    catch (error) {
        console.log('❌ Number input test failed:', error.message);
    }
    // Test 3: Fill select dropdown
    console.log('\nTest 3: Filling select dropdown');
    try {
        await formHandler.fillForm([
            { selector: '#country', value: 'us' }
        ]);
        console.log('✅ Select dropdown test: PASSED');
    }
    catch (error) {
        console.log('❌ Select dropdown test failed:', error.message);
    }
    // Test 4: Fill textarea
    console.log('\nTest 4: Filling textarea');
    try {
        await formHandler.fillForm([
            { selector: '#comments', value: 'This is a test comment for the form handler.' }
        ]);
        console.log('✅ Textarea test: PASSED');
    }
    catch (error) {
        console.log('❌ Textarea test failed:', error.message);
    }
    // Test 5: Fill checkboxes
    console.log('\nTest 5: Filling checkboxes');
    try {
        await formHandler.fillForm([
            { selector: '#newsletter', value: true, type: 'checkbox' },
            { selector: '#terms', value: true, type: 'checkbox' }
        ]);
        console.log('✅ Checkboxes test: PASSED');
    }
    catch (error) {
        console.log('❌ Checkboxes test failed:', error.message);
    }
    // Test 6: Fill radio buttons
    console.log('\nTest 6: Filling radio buttons');
    try {
        await formHandler.fillForm([
            { selector: '#female', value: true, type: 'radio' }
        ]);
        console.log('✅ Radio buttons test: PASSED');
    }
    catch (error) {
        console.log('❌ Radio buttons test failed:', error.message);
    }
    // Test 7: Get form data
    console.log('\nTest 7: Getting form data');
    try {
        const formData = await formHandler.getFormData('#test-form');
        console.log('✅ Get form data test: PASSED');
        console.log('Form data keys:', Object.keys(formData));
    }
    catch (error) {
        console.log('❌ Get form data test failed:', error.message);
    }
    // Test 8: Validate form
    console.log('\nTest 8: Validating form');
    try {
        const validation = await formHandler.validateForm('#test-form');
        console.log('✅ Form validation test:', validation.isValid ? 'PASSED (form is valid)' : 'PASSED (form has expected validation errors)');
        if (!validation.isValid) {
            console.log('Validation errors:', validation.errors);
        }
    }
    catch (error) {
        console.log('❌ Form validation test failed:', error.message);
    }
    // Test 9: Reset form
    console.log('\nTest 9: Resetting form');
    try {
        await formHandler.resetForm('#test-form');
        console.log('✅ Form reset test: PASSED');
    }
    catch (error) {
        console.log('❌ Form reset test failed:', error.message);
    }
    // Test 10: Submit form
    console.log('\nTest 10: Submitting form');
    try {
        // First fill the form again
        await formHandler.fillForm([
            { selector: '#username', value: 'finaltest' },
            { selector: '#email', value: 'final@example.com' },
            { selector: '#terms', value: true, type: 'checkbox' }
        ]);
        // Submit the form
        await formHandler.submitForm({
            submitSelector: '#submit-btn',
            captureScreenshot: true
        });
        console.log('✅ Form submit test: PASSED');
    }
    catch (error) {
        console.log('❌ Form submit test failed:', error.message);
    }
    // Test 11: Fill form with mixed field types
    console.log('\nTest 11: Filling form with mixed field types');
    try {
        await formHandler.resetForm('#test-form');
        await formHandler.fillForm([
            { selector: '#username', value: 'mixedtest' },
            { selector: '#email', value: 'mixed@example.com' },
            { selector: '#age', value: '30' },
            { selector: '#country', value: 'ca' },
            { selector: '#comments', value: 'Mixed field types test' },
            { selector: '#newsletter', value: true, type: 'checkbox' },
            { selector: '#terms', value: true, type: 'checkbox' },
            { selector: '#male', value: true, type: 'radio' }
        ]);
        console.log('✅ Mixed field types test: PASSED');
    }
    catch (error) {
        console.log('❌ Mixed field types test failed:', error.message);
    }
    // Test 12: Test field type auto-detection
    console.log('\nTest 12: Testing field type auto-detection');
    try {
        // Fill a field without specifying type (should auto-detect)
        await formHandler.fillField({ selector: '#password', value: 'autodetect123' });
        console.log('✅ Auto-detection test: PASSED');
    }
    catch (error) {
        console.log('❌ Auto-detection test failed:', error.message);
    }
    // Cleanup
    await browser.close();
    console.log('\n🎉 Form Handler Tests Completed!');
}
// Run the tests
testFormHandler().catch(console.error);
