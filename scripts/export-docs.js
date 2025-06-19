#!/usr/bin/env node

/**
 * Documentation Export Script
 * 
 * This script helps export documentation to various formats using different methods.
 * Run with: node scripts/export-docs.js
 */

const fs = require('fs');
const path = require('path');

console.log('📚 Documentation Export Helper\n');

// Check for Chrome/Chromium installation
const chromeCommands = [
    'google-chrome --version',
    'chromium --version', 
    'google-chrome-stable --version',
    '/usr/bin/google-chrome --version',
    '/usr/bin/chromium-browser --version',
    '/opt/google/chrome/chrome --version'
];

async function findChrome() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    for (const cmd of chromeCommands) {
        try {
            const result = await execAsync(cmd);
            console.log(`✅ Found Chrome: ${cmd.split(' ')[0]}`);
            console.log(`   Version: ${result.stdout.trim()}`);
            return cmd.split(' ')[0];
        } catch (error) {
            // Continue to next command
        }
    }
    return null;
}

async function checkPuppeteer() {
    try {
        const puppeteer = require('puppeteer');
        console.log('✅ Puppeteer is available');
        return true;
    } catch (error) {
        console.log('❌ Puppeteer not found');
        return false;
    }
}

async function generatePDF() {
    try {
        const puppeteer = require('puppeteer');
        const htmlPath = path.join(__dirname, '../docs/architecture-flow.html');
        const outputPath = path.join(__dirname, '../docs/architecture-flow.pdf');
        
        console.log('🚀 Launching browser...');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        console.log('📄 Loading HTML file...');
        await page.goto(`file://${htmlPath}`, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });
        
        // Wait for Mermaid diagrams to render
        console.log('⏳ Waiting for diagrams to render...');
        await page.waitForTimeout(3000);
        
        console.log('📝 Generating PDF...');
        await page.pdf({
            path: outputPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            }
        });
        
        await browser.close();
        console.log(`✅ PDF generated: ${outputPath}`);
        
    } catch (error) {
        console.error('❌ PDF generation failed:', error.message);
        console.log('\n💡 Try one of these solutions:');
        console.log('1. Install Puppeteer: npm install puppeteer');
        console.log('2. Use the HTML file directly in your browser');
        console.log('3. Print to PDF from your browser');
    }
}

async function main() {
    console.log('🔍 Checking system capabilities...\n');
    
    // Check for Chrome
    const chromePath = await findChrome();
    if (!chromePath) {
        console.log('❌ Chrome/Chromium not found');
        console.log('💡 Install Chrome: sudo apt-get install google-chrome-stable');
    }
    
    // Check for Puppeteer
    const hasPuppeteer = await checkPuppeteer();
    
    console.log('\n📋 Available export options:');
    console.log('1. 📄 HTML file ready: docs/architecture-flow.html');
    console.log('2. 🌐 Open in browser and Print to PDF');
    
    if (hasPuppeteer) {
        console.log('3. 🤖 Generate PDF with Puppeteer');
        console.log('\n🚀 Generating PDF...');
        await generatePDF();
    } else {
        console.log('3. ❌ Puppeteer not available (run: npm install puppeteer)');
    }
    
    console.log('\n🛠️  VS Code Markdown Preview Enhanced setup:');
    console.log('1. Open Command Palette (Ctrl+Shift+P)');
    console.log('2. Run: "Markdown Preview Enhanced: Open Preview"'); 
    console.log('3. Right-click preview → "Chrome (Puppeteer)" → "PDF"');
    console.log('4. If Chrome path error, add to VS Code settings:');
    console.log('   "markdown-preview-enhanced.chromePath": "/usr/bin/google-chrome"');
    
    console.log('\n📱 Alternative methods:');
    console.log('• Open docs/architecture-flow.html in browser → Print → Save as PDF');
    console.log('• Use online Markdown to PDF converters');
    console.log('• Copy Mermaid diagrams to https://mermaid.live for PNG export');
}

main().catch(console.error);