import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to main.js: Up 3 levels from tests/security/ to ArrowheadSolution/, then up 1 to website-integration/
// tests/security is in website-integration/ArrowheadSolution/tests/security
// ../../../ is website-integration/
// so ../../../shared/js/main.js
const mainJsPath = path.resolve(__dirname, '../../../../website-integration/shared/js/main.js');
// Wait, from __dirname (security) -> tests (..) -> ArrowheadSolution (../..) -> website-integration (../../..) -> root (../../../..)
// If I use ../../../../website-integration/shared/js/main.js it works if I am at root.
// Let's use simpler relative path.
// tests/security/test_xss_main.js
// ../../../shared/js/main.js relies on shared being inside website-integration alongside ArrowheadSolution.
// Let's list files to be sure where shared is.
// find website-integration -name shared
// ./website-integration/shared
// So shared is a sibling of ArrowheadSolution inside website-integration?
// No, ls -F website-integration showed ArrowheadSolution/ shared/
// So yes, shared is in website-integration/shared.
// ArrowheadSolution is in website-integration/ArrowheadSolution.

// So from ArrowheadSolution/tests/security:
// .. -> tests
// ../.. -> ArrowheadSolution
// ../../.. -> website-integration
// ../../../shared/js/main.js -> website-integration/shared/js/main.js

const resolvedPath = path.resolve(__dirname, '../../../shared/js/main.js');
console.log(`Loading main.js from: ${resolvedPath}`);

if (!fs.existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    // Try absolute path from repo root if relative fails, assuming run from root?
    // But __dirname is absolute.
    process.exit(1);
}

const mainJsContent = fs.readFileSync(resolvedPath, 'utf8');

// Create virtual DOM
const dom = new JSDOM(`<!DOCTYPE html><body><div class="toast-container"></div></body>`, {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost/"
});

const { window } = dom;
const { document } = window;

// Mock IntersectionObserver
window.IntersectionObserver = class {
  constructor(callback, options) {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock bootstrap
window.bootstrap = {
  Toast: class {
    constructor(element) {
      this.element = element;
      this._element = element;
    }
    show() {
      this._element.classList.add('show');
    }
  }
};

// Execute main.js
const scriptEl = document.createElement("script");
scriptEl.textContent = mainJsContent;
document.body.appendChild(scriptEl);

// Verify ProjectArrowhead
if (!window.ProjectArrowhead) {
  console.error('ProjectArrowhead not found on window object!');
  process.exit(1);
}

console.log('ProjectArrowhead loaded successfully.');

// Test Case: XSS Injection
const payload = '<img src=x onerror=alert("XSS")>';
console.log(`Testing payload: ${payload}`);

let alertCalled = false;
window.alert = (msg) => {
    console.log(`ALERT CALLED: ${msg}`);
    alertCalled = true;
};

// Run showToast
window.ProjectArrowhead.showToast(payload, 'danger');

// Check DOM
const toastBody = document.querySelector('.toast-body');
if (!toastBody) {
  console.error('FAIL: .toast-body not found in DOM');
  process.exit(1);
}

const innerHTML = toastBody.innerHTML;
const textContent = toastBody.textContent;

console.log(`toast-body innerHTML: ${innerHTML}`);

// Check for vulnerability
const imgTag = toastBody.querySelector('img');

if (imgTag || alertCalled) {
  console.error('VULNERABILITY DETECTED: Payload executed as HTML or alert called.');
  process.exit(1); // Fail (Vulnerability exists)
}

// Check for correct fix behavior
if (textContent === payload) {
  console.log('SUCCESS: Payload treated as text content.');
  process.exit(0); // Pass (Fix is working)
}

console.log('INCONCLUSIVE: No XSS detected, but text content match failed?');
process.exit(0);
