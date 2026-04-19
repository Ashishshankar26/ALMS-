const fs = require('fs');
const content = fs.readFileSync('d:/proj 2/lpu-app/context/ScraperContext.tsx', 'utf8');
const start = content.indexOf('const DASHBOARD_SCRIPT = `');
const end = content.indexOf('const TIMETABLE_SCRIPT = `');
const script = content.substring(start, end);

let open = 0;
let close = 0;
for (let char of script) {
  if (char === '{') open++;
  if (char === '}') close++;
}
console.log("Open:", open, "Close:", close);
