const fs = require('fs');
const content = fs.readFileSync('d:/proj 2/lpu-app/context/ScraperContext.tsx', 'utf8');

const scriptMatch = content.match(/const DASHBOARD_SCRIPT = `([\s\S]+?)`;/);
if (!scriptMatch) {
    console.log("DASHBOARD_SCRIPT not found");
    process.exit(1);
}

const script = scriptMatch[1];
console.log("Script Length:", script.length);

try {
    // Basic syntax check by wrapping in a function
    new Function(script);
    console.log("Syntax OK");
} catch (e) {
    console.log("Syntax Error:", e.message);
    // Find approximate location
    const lines = script.split('\n');
    console.log("Approximate location check...");
}
