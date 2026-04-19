const fs = require('fs');
const content = fs.readFileSync('d:/proj 2/lpu-app/context/ScraperContext.tsx', 'utf8');
const lines = content.split('\n');

let open = 0;
let close = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('const DASHBOARD_SCRIPT = `')) {
    for (let j = i; j < lines.length; j++) {
      const l = lines[j];
      for (let char of l) {
        if (char === '(') open++;
        if (char === ')') close++;
      }
      if (close > open) {
        console.log("Found mismatch at line " + (j + 1) + ": " + l);
        // We don't break because there might be more, but usually it's the first one that breaks it
      }
      if (l.includes('const TIMETABLE_SCRIPT = `')) break;
    }
    break;
  }
}
console.log("Final - Open:", open, "Close:", close);
