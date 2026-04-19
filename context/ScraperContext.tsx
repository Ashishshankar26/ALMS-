import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
// Cache breaker: 2026-04-19 13:16
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubjectAttendance {
  subjectCode: string;
  subjectName: string;
  attendedClasses: number;
  totalClasses: number;
  dutyLeaves?: number;
  percentage: number;
}

export interface SemesterResult {
  semester: string;
  sgpa: string;
  cgpa: string;
  subjects: any[];
}

export interface ScrapedData {
  profile: any;
  timetable: any;
  attendance: SubjectAttendance[];
  results: SemesterResult[];
  announcements: any[];
  messages: any[];
  assignments: any[];
  cgpa: string;
  overallAttendance: string;
  fee: string;
  examUrl: string;
}

type ScraperContextType = {
  data: ScrapedData;
  isScraping: boolean;
  refreshData: () => void;
  dumpHtml: () => void;
};

const MOCK_DATA: ScrapedData = {
  profile: {
    name: 'Loading...',
    vid: '',
    section: '',
    program: '',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/png?seed=Student&backgroundColor=007AFF',
  },
  timetable: {},
  attendance: [],
  results: [],
  announcements: [],
  messages: [],
  assignments: [],
  cgpa: '--',
  overallAttendance: '0.0',
  fee: '--',
  examUrl: '',
};

const ScraperContext = createContext<ScraperContextType>({
  data: MOCK_DATA,
  isScraping: false,
  refreshData: () => {},
  dumpHtml: () => {},
});

export const useScraper = () => useContext(ScraperContext);

// ─── Scripts (each handles ONE page, no routing logic) ───────────────────────

const DASHBOARD_SCRIPT = `
(function() {
  try {
    var log = function(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "DEBUG", message: msg }));
    };
    log("DASHBOARD SCRIPT START");

    // Poll until the page's own AJAX has rendered the course cards AND the CGPA/Att values
    var pollCount = 0;
    var poll = setInterval(function() {
      pollCount++;
      var coursesList = document.getElementById("CoursesList");
      var cgpaEl      = document.getElementById("cgpa");
      var attPerEl    = document.getElementById("AttPercent");

      var hasCoursesLoaded = coursesList && coursesList.querySelectorAll(".mycoursesdiv").length > 0;
      var hasCgpa  = cgpaEl  && /[0-9]+\\.[0-9]+/.test(cgpaEl.innerText);
      var hasAtt   = attPerEl && /[0-9]+/.test(attPerEl.innerText);

      if ((hasCoursesLoaded && hasCgpa && hasAtt) || pollCount >= 20) {
        clearInterval(poll);
        log("Dashboard: Poll done, starting scrapeAll");
        scrapeAll();
      }
    }, 500);

    function scrapeAll() {
      try {
        log("scrapeAll: Starting...");
        var attCounts = {};
        
        var runFinalize = function() {
          if (runFinalize.done) return;
          runFinalize.done = true;
          finalize(attCounts);
        };

        var triggerAtt = function() {
          if (typeof window.getAtt === 'function') {
            try { window.getAtt(); log("scrapeAll: window.getAtt() called"); } catch(e) { log("scrapeAll: getAtt error: " + e.message); }
          }
          var btn = document.getElementById('AttPercent');
          if (btn) { btn.click(); log("scrapeAll: AttPercent clicked"); }
        };

        triggerAtt();

        var pollCount = 0;
        var poll = setInterval(function() {
          pollCount++;
          var summaryTable = document.getElementById("AttSummary");
          var hasRows = summaryTable && summaryTable.querySelectorAll("tr").length > 1;
          
          if (hasRows) {
            clearInterval(poll);
            log("scrapeAll: #AttSummary found, scraping...");
            var rows = summaryTable.querySelectorAll("tr");
            for (var i = 0; i < rows.length; i++) {
              var c = rows[i].querySelectorAll("td");
              if (i === 0) {
                var cellTexts = [];
                for(var j=0; j<c.length; j++) cellTexts.push(j + ":" + c[j].innerText.trim());
                log("DEBUG: Row 0 Cells: " + cellTexts.join(" | "));
              }
              if (c.length >= 5) {
                var codeText = c[0].innerText.trim();
                // Normalized code: extract the part before any dash or space
                var normCode = codeText.split("-")[0].split(":")[0].trim().replace(/[\s:]/g, "").toUpperCase();
                attCounts[normCode] = {
                  attended: parseInt(c[4].innerText) || 0,
                  total: parseInt(c[3].innerText) || 0,
                  leaves: parseInt(c[2].innerText) || 0,
                  subjectCode: codeText,
                  subjectName: codeText.includes("-") ? codeText.split("-")[1].trim() : codeText
                };
              }
            }
            runFinalize();
          } else if (pollCount >= 40) { 
            clearInterval(poll);
            log("scrapeAll: getAtt() timeout, trying fetch...");
            runFetch();
          } else if (pollCount % 10 === 0) {
            triggerAtt(); 
          }
        }, 500);

        function runFetch() {
          log("scrapeAll: Fetching attendance report...");
          fetch("Reports/frmStudentAttendance.aspx")
            .then(function(r) { return r.text(); })
            .then(function(html) {
               try {
                 var parser = new DOMParser();
                 var doc = parser.parseFromString(html, "text/html");
                 var table = doc.querySelector("table[id*='gvStudentAttendance']") || 
                             doc.querySelector("table[id*='Attendance']");
                 
                 if (table) {
                    var rows = table.querySelectorAll("tr");
                    for (var i = 0; i < rows.length; i++) {
                      var c = rows[i].querySelectorAll("td");
                      if (c.length >= 8) {
                        var code = c[1].innerText.trim();
                        var normCode = code.replace(/[\s:]/g, "").split("-")[0].toUpperCase();
                        if (code.length > 3 && !attCounts[normCode]) {
                          attCounts[normCode] = {
                            attended: parseInt(c[5].innerText) || 0,
                            total: parseInt(c[4].innerText) || 0,
                            leaves: parseInt(c[6].innerText) || 0,
                            subjectCode: code,
                            subjectName: c[2].innerText.trim()
                          };
                        }
                      }
                    }
                 }
               } catch(e) { log("Fetch Parse Error: " + e.toString()); }
               runFinalize();
            })
            ["catch"](function(err) {
              log("Fetch Error: " + err.toString());
              runFinalize();
            });
        }
      } catch(e2) {
        log("scrapeAll Error: " + e2.toString());
        finalize({});
      }
    }

    function finalize(attCounts) {
      log("finalize: Starting...");
      try {
        var prof = { name: "Unknown", vid: "", section: "", program: "", avatarUrl: "" };
        var nameEl = document.getElementById("p_name");
        if (nameEl) prof.name = nameEl.innerText.trim();
        var infoEl = document.getElementById("p_info");
        if (infoEl) {
          var infoTxt = infoEl.innerText || "";
          var vidM = infoTxt.match(/VID\\s*:\\s*([0-9]+)/i); if (vidM) prof.vid = vidM[1];
          var secM = infoTxt.match(/Section\\s*:\\s*([A-Z0-9]+)/i); if (secM) prof.section = secM[1];
          var progM = infoTxt.match(/[BMD]\\.Tech[^\\n]*\\([^)]+\\)/i); if (progM) prof.program = progM[0];
        }
        var picEl = document.getElementById("p_picture");
        if (picEl && picEl.src) prof.avatarUrl = picEl.src;

        var qC = "--";
        var cgpaEl = document.getElementById("cgpa");
        if (cgpaEl) { 
          var cm = cgpaEl.innerText.match(/([0-9]+\\.[0-9]+)/); 
          if (cm) qC = cm[1]; 
        }

        var qA = ""; // Start with empty to allow fallback
        var attEl = document.getElementById("AttPercent");
        if (attEl) { 
          // Match the percentage number in text like "ATTENDANCE : 90%"
          var am = attEl.innerText.match(/([0-9]+(?:\\.[0-9]+)?)/); 
          if (am) qA = am[1]; 
          log("DEBUG: Overall Att Text: " + attEl.innerText + " -> " + qA);
        }

        var fV = "0";
        var feeEl = document.getElementById("feebalance");
        if (feeEl) { 
          var txt = feeEl.innerText || "";
          var fm = txt.match(/([0-9,]+)/); 
          if (fm) fV = fm[1]; 
          else if (txt.includes("--")) fV = "0";
          log("DEBUG: Fee Text: [" + txt.trim() + "] -> " + fV);
        }

        var att = [];
        var cl = document.getElementById("CoursesList");
        if (cl) {
          var rows = cl.querySelectorAll(".mycoursesdiv");
          for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var pctSpan = row.querySelector(".c100 span");
            var pctText = (pctSpan ? pctSpan.innerText.trim() : "0").replace(/%/g, "");
            var pct = Number(pctText) || 0;

            var bTags = row.querySelectorAll("b");
            var code = bTags.length > 0 ? bTags[0].innerText.trim().replace(/\\s*:$/, "") : "";
            
            var pTag = row.querySelector("p.font-weight-medium");
            var name = "";
            if (pTag) { 
              var rawP = pTag.innerText || ""; 
              var ci = rawP.indexOf(":"); 
              if (ci > -1) name = rawP.substring(ci+1).split("\\n")[0].trim(); 
            }

            if (code && code.length > 2) {
              var normCode = code.split("-")[0].split(":")[0].trim().replace(/[\\s:]/g, "").toUpperCase();
              var counts = attCounts[normCode] || { attended: 0, total: 0, leaves: 0 };
              att.push({ 
                subjectCode: code, 
                subjectName: name, 
                attendedClasses: Number(counts.attended), 
                totalClasses: Number(counts.total), 
                dutyLeaves: Number(counts.leaves),
                percentage: pct
              });
            }
          }
        }

        var assignments = [];
        var paEl = document.getElementById("PendingAssignments");
        if (paEl) {
          var rows = paEl.querySelectorAll(".mycoursesdiv");
          for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var cols = row.querySelectorAll("div[class*='col']");
            var code = cols.length > 0 ? cols[0].innerText.trim() : "";
            var detail = (row.querySelector("p.font-weight-medium") || {}).innerText || "";
            var ldM = detail.match(/Last\\s*Date\\s*:\\s*([0-9\\-\\/]+)/i);
            if (code && code.length > 1 && code.length < 20) {
              assignments.push({ 
                id: Math.random().toString(), 
                courseCode: code, 
                type: detail.replace(/Course\\s*:\\s*/i, "").trim(), 
                lastDate: ldM ? ldM[1] : ""
              });
            }
          }
        }
        
        var makeupLink = "";
        var examUrl = "";
        var links = document.querySelectorAll("a");
        for(var i=0; i<links.length; i++) {
          if(links[i].href.includes("Student-MakeupAdjustment")) {
            makeupLink = links[i].href;
          }
          if(links[i].href.includes("seatingplan")) {
            examUrl = links[i].href;
          }
        }

        var res = {
          profile: prof,
          cgpa: qC,
          overallAttendance: qA,
          fee: fV,
          attendance: att,
          assignments: assignments,
          makeupUrl: makeupLink
        };

        var msgs = [];
        var mmEl = document.getElementById("MyMessage");
        if (mmEl) {
          var rows = mmEl.querySelectorAll(".mycoursesdiv");
          for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var titleEl = row.querySelector(".right-arrow, .font-weight-medium");
            var t = titleEl ? titleEl.innerText.trim() : row.innerText.trim();
            if (t && t.length > 5) msgs.push({ id: Math.random().toString(), title: t.substring(0, 60), content: t, date: "Recently" });
          }
        }

        var announc = [];
        var annContainer = document.querySelector(".TodayAnnouncements");
        if (annContainer) {
          var annRows = annContainer.querySelectorAll(".row");
          annRows.forEach(function(row) {
            var subjEl = row.querySelector(".announcement-subject");
            var dateEl = row.querySelector(".announcement-date");
            if (subjEl) {
              var title = subjEl.innerText.replace(/New\\s*/i, "").trim();
              var date = dateEl ? dateEl.innerText.trim() : "Today";
              announc.push({ 
                id: Math.random().toString(), 
                title: title.substring(0, 80), 
                content: title, 
                date: date 
              });
            }
          });
        }

        log("DASHBOARD DONE. Courses=" + att.length + " Ass=" + assignments.length + " Ann=" + announc.length);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "DASHBOARD_DATA",
          payload: { 
            profile: prof, overallAttendance: qA, cgpa: qC, fee: fV, 
            attendance: att, messages: msgs, assignments: assignments, announcements: announc,
            makeupUrl: makeupLink,
            examUrl: examUrl
          }
        }));

        // Now scrape results from modal
        setTimeout(scrapeResults, 1000);

      } catch(errFin) {
        log("finalize Error: " + errFin.toString());
      }
    }

    function scrapeResults() {
      log("scrapeResults: Starting...");
      var cgpaBox = document.getElementById("cgpa");
      if (!cgpaBox) { log("scrapeResults: CGPA box not found"); return; }
      
      cgpaBox.click();
      log("scrapeResults: Clicked CGPA box");
      
      var rAttempts = 0;
      var rPoll = setInterval(function() {
        rAttempts++;
        var modal = document.getElementById("modalmarks");
        var gradeTab = document.getElementById("second-tab1");
        var gradeContent = document.getElementById("GradeDetails");
        
        // Wait for modal and some content in GradeDetails (which is filled via AJAX)
        if (modal && gradeContent && (gradeContent.innerHTML.length > 50 || rAttempts >= 30)) {
          clearInterval(rPoll);
          if (rAttempts >= 30) { 
            log("scrapeResults: Timeout waiting for modal content"); 
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: "RESULTS_DATA", payload: [] }));
            return; 
          }
          
          // Switch to Grade Details tab if not active
          if (gradeTab && !gradeTab.classList.contains("active")) {
            gradeTab.click();
            log("scrapeResults: Switched to Grade Details tab");
          }
          
          setTimeout(function() {
            try {
              var results = [];
              var allText = gradeContent.innerText || "";
              log("scrapeResults: allText length=" + allText.length + " sample=" + allText.substring(0, 100));
              var tables = gradeContent.querySelectorAll("table");
              
              // Find all matches for "Term" and "TGPA" separately and pair them
              var termMatches = [];
              
              var tRegex = /Term\\s*[:\\s]*([IVX\\d]+)/gi;
              var gRegex = /TGPA\\s*[:\\s]*([0-9.]+)/gi;
              
              var tList = [];
              var m1;
              while ((m1 = tRegex.exec(allText)) !== null) tList.push(m1[1]);
              
              var gList = [];
              var m2;
              while ((m2 = gRegex.exec(allText)) !== null) gList.push(m2[1]);
              
              for (var i = 0; i < tList.length; i++) {
                termMatches.push({ term: tList[i], tgpa: gList[i] || "--" });
              }
              log("scrapeResults: termMatches found=" + termMatches.length);
              
              tables.forEach(function(table, idx) {
                var termInfo = termMatches[idx] || { term: (idx+1).toString(), tgpa: "--" };
                var subjects = [];
                var rows = table.querySelectorAll("tr");
                rows.forEach(function(row) {
                  var rowText = row.innerText.trim();
                  if (rowText && !rowText.includes("Course") && rowText.includes("::")) {
                    // Looser regex: look for CODE, then Name after ::, then Grade after "Grade"
                    var codeMatch = rowText.match(/([A-Z0-9]{3,})/); // At least 3 chars for code
                    var nameMatch = rowText.match(/::\\s*([\\s\\S]+?)(?=\\s*Grade|$)/i);
                    var gradeMatch = rowText.match(/Grade\\s*[:\\s]*([A-Z+O]{1,2})/i);
                    
                    if (codeMatch && nameMatch) {
                      subjects.push({
                        code: codeMatch[1].trim(),
                        name: nameMatch[1].trim(),
                        grade: gradeMatch ? gradeMatch[1].trim() : "--",
                        credits: "4"
                      });
                    }
                  }
                });
                results.push({
                  semester: "Semester " + termInfo.term,
                  sgpa: termInfo.tgpa,
                  subjects: subjects
                });
              });
              
              log("scrapeResults: Done. Semesters=" + results.length);
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: "RESULTS_DATA", payload: results }));
              
              // Close modal after a delay
              setTimeout(function() {
                var closeBtn = modal.querySelector("button[data-dismiss='modal']");
                if (closeBtn) closeBtn.click();
              }, 1000);
            } catch(e) { log("scrapeResults Parse Error: " + e.toString()); }
          }, 2500);
        }
      }, 500);
    }
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ERROR", message: "Dashboard: " + e.toString() }));
  }
})(); true;
`;

const TIMETABLE_SCRIPT = `
(function() {
  try {
    var log = function(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: msg }));
    };
    log('Timetable: polling...');
    var t_attempts = 0;
    var t_poll = setInterval(function() {
      t_attempts++;
      var tables = document.querySelectorAll('table');
      var t1 = null, t2 = null, t3 = null;
      tables.forEach(function(t) {
        var txt = t.textContent || '';
        if (txt.includes('Timing') && txt.includes('Monday')) t1 = t;
        if (txt.includes('Course Code') && txt.includes('Course Title')) t2 = t;
        if (txt.includes('Adjustment Date')) t3 = t;
      });

      if ((t1 && t2) || t_attempts >= 16) {
        clearInterval(t_poll);
        try {
          var res = { schedule: {}, courses: [] };
          if (t1) {
            var rows = t1.querySelectorAll('tr');
            var days = [];
            var headerRowIndex = -1;

            // Find the header row that contains 'Timing'
            for (var rIdx = 0; rIdx < rows.length; rIdx++) {
              if (rows[rIdx].textContent.indexOf('Timing') !== -1) {
                headerRowIndex = rIdx;
                var headerCells = rows[rIdx].querySelectorAll('td');
                headerCells.forEach(function(c) { 
                  var dName = c.textContent.trim();
                  days.push(dName);
                  if (dName && dName !== 'Timing') res.schedule[dName] = [];
                });
                break;
              }
            }

            if (headerRowIndex !== -1) {
              for (var rIdx = headerRowIndex + 1; rIdx < rows.length; rIdx++) {
                var cells = rows[rIdx].querySelectorAll('td');
                if (cells.length < 2) continue;
                var slot = '';
                for (var cIdx = 0; cIdx < cells.length; cIdx++) {
                  var cellTxt = cells[cIdx].textContent.trim();
                  var day = days[cIdx];
                  if (day === 'Timing') { 
                    slot = cellTxt; 
                  } else if (day && cellTxt && cellTxt !== 'Â' && cellTxt !== '') {
                    res.schedule[day].push({ time: slot, details: cellTxt });
                  }
                }
              }
            }
          }

          // Parse Adjustments/Makeup Classes
          if (t3) {
            var t3Rows = t3.querySelectorAll('tr');
            for (var r3 = 0; r3 < t3Rows.length; r3++) {
              var cells = t3Rows[r3].querySelectorAll('td');
              if (cells.length >= 5) {
                var dateStr = cells[0].textContent.trim();
                var dayStr = cells[1].textContent.trim();
                var timeStr = cells[2].textContent.trim();
                var subjectStr = cells[3].textContent.trim();
                var roomStr = cells[4].textContent.trim();
                
                // Only if it looks like a date (e.g. contains - or /)
                if (dateStr.includes('-') || dateStr.includes('/') || dateStr.match(/[0-9]/)) {
                  if (!res.schedule[dayStr]) res.schedule[dayStr] = [];
                  res.schedule[dayStr].push({ 
                    time: timeStr, 
                    details: subjectStr + ' R: ' + roomStr, 
                    date: dateStr 
                  });
                }
              }
            }
          }

          if (t2) {
            var t2Rows = t2.querySelectorAll('tr');
            for (var r2 = 0; r2 < t2Rows.length; r2++) {
              var cells = t2Rows[r2].querySelectorAll('td');
              if (cells.length > 5) {
                var code = cells[1] ? cells[1].textContent.trim() : '';
                // Skip header or empty rows
                if (code && code !== 'Course Code' && code.length > 2) {
                  res.courses.push({ 
                    code: code,
                    type: cells[2] ? cells[2].textContent.trim() : '',
                    title: cells[3] ? cells[3].textContent.trim() : '',
                    faculty: cells[8] ? cells[8].textContent.trim() : '' 
                  });
                }
              }
            }
          }
          log('Timetable: Done. Days=' + Object.keys(res.schedule).length);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'TIMETABLE_JSON', payload: res }));
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'Timetable parse: ' + e.toString() }));
        }
      }
    }, 500);
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'TimetableOuter: ' + e.toString() }));
  }
})(); true;
`;


const MAKEUP_SCRIPT = `
(function() {
  try {
    var log = function(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: msg }));
    };
    log('Makeup: Polling for table...');
    var m_attempts = 0;
    var m_poll = setInterval(function() {
      m_attempts++;
      var tables = document.querySelectorAll('table');
      var table = null;
      for (var i = 0; i < tables.length; i++) {
        if (tables[i].textContent.includes('Scheduled Date')) {
          table = tables[i];
          break;
        }
      }
      
      if (table || m_attempts >= 20) {
        clearInterval(m_poll);
        if (!table) {
           log('Makeup: Table not found (Scheduled Date header missing)');
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAKEUP_DATA', payload: [] }));
           return;
        }
        
        var rows = Array.from(table.querySelectorAll('tr')).filter(function(r) {
           // Only rows with cells that aren't the header
           return r.querySelectorAll('td').length >= 8 && !r.textContent.includes('Scheduled Date');
        });
        var data = rows.map(function(row, rIdx) {
          var cells = row.querySelectorAll('td');
          
          if (rIdx === 0) {
            var cellLogs = [];
            for(var i=0; i<cells.length; i++) cellLogs.push(i + ': ' + cells[i].textContent.trim());
            log('Makeup Row 0: ' + cellLogs.join(' | '));
          }
          
          var categoryText = (cells[0].textContent || '').trim();
          var dateText = (cells[1].textContent || '').trim();
          var timeText = (cells[2].textContent || '').trim();
          var roomText = (cells[3].querySelector('span') || cells[3]).textContent.trim();
          var courseText = (cells[6].textContent || '').trim();
          var typeText = (cells[7].textContent || '').trim();
          var facultyText = (cells[8].textContent || '').trim();
          
          var courseCode = courseText.split(':')[0] || '';
          var courseTitle = courseText.split(':')[1] || courseText;
          
          // Calculate day name from dateText (e.g. "25 Apr 2026")
          var dayName = '';
          try {
            var d = new Date(dateText);
            if (isNaN(d.getTime())) {
              var parts = dateText.split(' ');
              if (parts.length === 3) {
                d = new Date(parts[1] + ' ' + parts[0] + ', ' + parts[2]);
              }
            }
            var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            dayName = days[d.getDay()] || '';
          } catch(e) {
            log('Day Calc Error: ' + e.toString());
          }
          
          return {
            date: dateText,
            time: timeText,
            room: roomText,
            subjectCode: courseCode,
            subject: courseTitle,
            type: typeText,
            faculty: facultyText,
            category: categoryText,
            dayName: dayName
          };
        }).filter(Boolean);
        
        log('Makeup: Found ' + data.length + ' rows');
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAKEUP_DATA', payload: data }));
      }
    }, 1000);
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ERROR", message: "Makeup: " + e.toString() }));
  }
})(); true;
`;


const EXAMS_SCRIPT = `
(function() {
  try {
    var log = function(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: msg }));
    };
    log('Exams: Polling for seating plan...');
    var e_attempts = 0;
    var e_poll = setInterval(function() {
      e_attempts++;
      var tables = document.querySelectorAll('table');
      var table = null;
      for (var i = 0; i < tables.length; i++) {
        var txt = tables[i].textContent;
        if (txt.includes('Date') && (txt.includes('Course') || txt.includes('Subject')) && txt.includes('Seat')) {
          table = tables[i];
          break;
        }
      }
      
      if (table || e_attempts >= 20) {
        clearInterval(e_poll);
        if (!table) {
           log('Exams: Table not found');
           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EXAMS_DATA', payload: [] }));
           return;
        }
        
        var rows = Array.from(table.querySelectorAll('tr')).filter(function(r) {
           return r.querySelectorAll('td').length >= 4 && !r.textContent.includes('Date');
        });
        
        var data = rows.map(function(row, rIdx) {
          var cells = row.querySelectorAll('td');
          
          if (rIdx === 0) {
            var cellLogs = [];
            for(var i=0; i<cells.length; i++) cellLogs.push(i + ': ' + cells[i].textContent.trim());
            log('Exams Row 0: ' + cellLogs.join(' | '));
          }
          
          // Flexible mapping based on common LPU layouts
          // Column 0: Exam Date, 1: Time/Session, 2: Course, 3: Room, 4: Seat...
          var dateText = (cells[0].textContent || '').trim();
          var timeText = (cells[1].textContent || '').trim();
          var courseText = (cells[2].textContent || '').trim();
          var roomText = (cells[3].textContent || '').trim();
          var seatText = cells[4] ? (cells[4].textContent || '').trim() : '';
          
          var courseCode = courseText.split(':')[0] || courseText.split('-')[0] || '';
          var courseTitle = courseText.includes(':') ? courseText.split(':')[1] : (courseText.includes('-') ? courseText.split('-')[1] : courseText);

          return {
            date: dateText,
            time: timeText,
            subjectCode: courseCode.trim(),
            subject: courseTitle.trim(),
            room: roomText,
            seat: seatText
          };
        }).filter(Boolean);
        
        log('Exams: Found ' + data.length + ' exams');
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EXAMS_DATA', payload: data }));
      }
    }, 1000);
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "ERROR", message: "Exams: " + e.toString() }));
  }
})(); true;
`;


const RESULTS_SCRIPT = `
(function() {
  try {
    var log = function(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'DEBUG', message: msg }));
    };
    log('Results: Starting poll...');
    var attempts = 0;
    var poll = setInterval(function() {
      attempts++;
      var tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
      var gradesTab = tabs.find(function(t) { return /Grades/i.test(t.innerText); });
      
      if (gradesTab || attempts >= 16) {
        clearInterval(poll);
        if (gradesTab) {
          gradesTab.click();
          log('Results: Grades tab clicked');
          setTimeout(function() {
             var rows = Array.from(document.querySelectorAll('tr'));
             var results = [];
             rows.forEach(function(row) {
                var cells = row.querySelectorAll('td');
                if (cells.length > 5) {
                   results.push({
                      code: cells[1].innerText.trim(),
                      name: cells[2].innerText.trim(),
                      grade: cells[4].innerText.trim()
                   });
                }
             });
             log('Results: Extracted ' + results.length + ' rows');
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RESULTS_DATA', payload: results }));
          }, 1500);
        } else {
           log('Results: Grades tab not found');
        }
      }
    }, 500);
  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: 'Results Error: ' + e.toString() }));
  }
})(); true;
`;

export const ScraperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<ScrapedData>(MOCK_DATA);
  const [isScraping, setIsScraping] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const didDashboard = useRef(false);
  const didTimetable = useRef(false);
  const didMakeup = useRef(false);

  // Load initial data from storage
  useEffect(() => {
    AsyncStorage.getItem('@scraped_data').then(json => {
      if (json) {
        try {
          const parsed = JSON.parse(json);
          setData(prev => ({ ...prev, ...parsed }));
        } catch (e) {
          console.error('Failed to parse cached data:', e);
        }
      }
    });
  }, []);

  // Reset progress when authentication changes to false. This ensures the
  // next user doesn't see the previous user's info.
  useEffect(() => {
    if (!isAuthenticated) {
      setData(MOCK_DATA);          // Reset to fresh mock (not old user's data)
      setIsScraping(false);
      didDashboard.current = false;
      didTimetable.current = false;
      didMakeup.current = false;
    }
  }, [isAuthenticated]);

  const isProcessingPhase = useRef(false);

  const isFullyDone = useRef(false);

  const refreshData = () => {
    console.log('REFRESH DATA START');
    if (isAuthenticated) {
      didDashboard.current = false;
      didTimetable.current = false;
      didMakeup.current = false;
      isProcessingPhase.current = false;
      isFullyDone.current = false;
      // We keep the old data visible while syncing to prevent a "blank" screen
      setIsScraping(true);

      // Safety watchdog: force stop loading after 15s
      setTimeout(() => {
        setIsScraping(false);
      }, 15000);

      // Force navigate back to dashboard to start sync
      setTimeout(() => { 
        const navCmd = "window.location.href = 'https://ums.lpu.in/lpuums/StudentDashboard.aspx'; true;";
        webViewRef.current?.injectJavaScript(navCmd);
      }, 300);
    }
  };

  const dumpHtml = () => {
    console.log('DUMPING HTML...');
    webViewRef.current?.injectJavaScript(`
      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        type: 'DEBUG', 
        message: 'DUMP URL: ' + window.location.href + ' TITLE: ' + document.title + ' BODY: ' + document.body.innerText.substring(0, 500)
      }));
      true;
    `);
  };

  const handleLoadEnd = (event: any) => {
    const url: string = event?.nativeEvent?.url || '';
    console.log('WEBVIEW LOAD END:', url);
    webViewRef.current?.injectJavaScript("window.ReactNativeWebView.postMessage(JSON.stringify({type:'DEBUG', message:'WEBVIEW_READY_SIGNAL'})); true;");
    
    if (url.includes('seatingplan') || url.includes('conduct') || url.includes('datesheet')) {
      console.log('AUTO-CAPTURED EXAM URL:', url);
      setData(prev => {
        const merged = { ...prev, examUrl: url };
        AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
        return merged;
      });
    }

    if (isFullyDone.current) return;

    if (url.includes('StudentDashboard.aspx') && !didDashboard.current) {
      console.log('INJECTING DASHBOARD_SCRIPT...');
      didDashboard.current = true;
      isProcessingPhase.current = true;
      setIsScraping(true);
      webViewRef.current?.injectJavaScript(DASHBOARD_SCRIPT);
    } else if (url.includes('frmStudentTimeTable.aspx') && !didTimetable.current) {
      didTimetable.current = true;
      isProcessingPhase.current = true;
      webViewRef.current?.injectJavaScript(TIMETABLE_SCRIPT);
    } else if (url.includes('seatingplan') || url.includes('seating-plan')) {
      console.log('INJECTING EXAMS_SCRIPT...');
      webViewRef.current?.injectJavaScript(EXAMS_SCRIPT);
    } else if (url.includes('Student-MakeupAdjustment') && !didMakeup.current) {
      console.log('INJECTING MAKEUP_SCRIPT...');
      didMakeup.current = true;
      webViewRef.current?.injectJavaScript(MAKEUP_SCRIPT);
    } else if (url.includes('Login.aspx') || url.includes('login.aspx') || url.includes('LoginNew.aspx') || url.includes('index.aspx')) {
      console.warn('SCRAPER: Redirected to Login! Session might be expired.');
      setIsScraping(false);
      isProcessingPhase.current = false;
    }
  };

  const onMessage = async (event: any) => {
    isProcessingPhase.current = false;
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      console.log('MESSAGE FROM WEBVIEW:', msg.type);

      if (msg.type === 'QUICK_PROFILE') {
        // Update profile/attendance immediately — before full dashboard data arrives
        const p = msg.payload || {};
        if (p.profile?.name && p.profile.name !== 'Unknown') {
          setData(prev => ({
            ...prev,
            profile: {
              ...p.profile,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/png?seed=${p.profile.vid || 'student'}&backgroundColor=007AFF`,
            },
            overallAttendance: p.overallAttendance || prev.overallAttendance,
            ...(p.cgpa ? { cgpa: p.cgpa } : {}),
          }));
        }

      } else if (msg.type === 'DASHBOARD_DATA') {
        const p = msg.payload || {};
        console.log('DASHBOARD DATA RECEIVED:', Object.keys(p));
        
        setData(prev => {
          const merged = { ...prev };
          if (p.profile?.name) {
            merged.profile = {
              ...p.profile,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/png?seed=${p.profile.vid || 'student'}&backgroundColor=007AFF`,
            };
          }
          if (p.overallAttendance) merged.overallAttendance = p.overallAttendance;
          if (p.attendance?.length > 0) merged.attendance = p.attendance;
          if (p.assignments?.length > 0) merged.assignments = p.assignments;
          if (p.messages?.length > 0) merged.messages = p.messages;
          if (p.announcements?.length > 0) merged.announcements = p.announcements;
          if (p.cgpa) merged.cgpa = p.cgpa;
          if (p.fee) merged.fee = p.fee;
          if (p.examUrl) merged.examUrl = p.examUrl;
          
          // Trigger Makeup Scraping if URL found
          if (p.makeupUrl) {
            webViewRef.current?.injectJavaScript(
               "window.location.href = '" + p.makeupUrl + "'; true;"
            );
          } else {
             // Go directly to timetable if no makeup
             webViewRef.current?.injectJavaScript(
                `window.location.href = 'https://ums.lpu.in/lpuums/Reports/frmStudentTimeTable.aspx'; true;`
             );
          }

          merged.lastUpdated = new Date().toISOString();
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
          return merged;
        });

      } else if (msg.type === 'EXAMS_DATA') {
        const payload = msg.payload || [];
        console.log('EXAMS DATA RECEIVED:', JSON.stringify(payload));
        setData(prev => {
          const merged = { ...prev, ...msg.payload, lastUpdated: new Date().toISOString() };
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
          return merged;
        });
      } else if (msg.type === 'MAKEUP_DATA') {
        const payload = msg.payload || [];
        console.log('MAKEUP DATA RECEIVED:', JSON.stringify(payload));
        setData(prev => {
          const merged = { ...prev, makeupClasses: payload };
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
          return merged;
        });

        // NOW navigate to timetable (Final Step)
        webViewRef.current?.injectJavaScript(
          `window.location.href = 'https://ums.lpu.in/lpuums/Reports/frmStudentTimeTable.aspx'; true;`
        );

      } else if (msg.type === 'RESULTS_DATA') {
        const payload = msg.payload || [];
        setData(prev => {
          const merged = { ...prev, results: payload };
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
          return merged;
        });

      } else if (msg.type === 'TIMETABLE_JSON') {
        setIsScraping(false); // FINISH LOADING
        isFullyDone.current = true;
        const raw = msg.payload || {};
        const rawSchedule = raw.schedule || {};
        const courses: any[] = raw.courses || [];

        // Build course code → {title, faculty} lookup map
        const courseMap: Record<string, { title: string; faculty: string }> = {};
        for (const c of courses) {
          const code = (c.code || '').trim();
          if (code) {
            courseMap[code] = { title: c.title || '', faculty: c.faculty || '' };
          }
        }

        // 1. Process Schedule into structured format
        const structuredSchedule: Record<string, any[]> = {};
        Object.keys(rawSchedule).forEach(day => {
          structuredSchedule[day] = rawSchedule[day].map((item: any) => {
            const details = item.details || '';
            // Format: "Lecture / G:All C:CSE211 / R: 33-311 / S:224IS"
            const subjectMatch = details.match(/C:([A-Z0-9]+)/);
            const roomMatch    = details.match(/R:\s*([A-Z0-9-]+)/);
            const typeMatch    = details.match(/^([^/]+)/);
            const sCode = subjectMatch ? subjectMatch[1] : '';
            const extra = courseMap[sCode];

            return {
              time: item.time,
              subjectCode: sCode,
              subject: extra?.title || sCode || (typeMatch ? typeMatch[1].trim() : 'Class'),
              room: roomMatch ? roomMatch[1] : 'TBA',
              type: typeMatch ? typeMatch[1].trim() : 'Lecture',
              faculty: extra?.faculty || '',
              date: item.date || ''
            };
          });
        });

        setData(prev => {
          // 2. Update attendance records with full names and faculty info
          const updatedAttendance = (prev.attendance || []).map(att => {
            const extra = courseMap[att.subjectCode];
            return {
              ...att,
              subjectName: extra?.title || att.subjectName,
              faculty: extra?.faculty || '',
            };
          });

          // 3. Calculate Aggregate Attendance
          let totalAttended = 0;
          let totalDelivered = 0;
          let totalLeaves = 0;
          updatedAttendance.forEach(a => {
            totalAttended += (a.attendedClasses || 0);
            totalDelivered += (a.totalClasses || 0);
            totalLeaves += (a.dutyLeaves || 0);
          });
          
          let aggregatePct = "0.0";
          if (totalDelivered > 0) {
            aggregatePct = (((totalAttended + totalLeaves) / totalDelivered) * 100).toFixed(1);
          }

          const merged = { 
            ...prev, 
            timetable: structuredSchedule,
            attendance: updatedAttendance,
            overallAttendance: aggregatePct,
            makeupClasses: prev.makeupClasses || [],
            lastUpdated: new Date().toISOString()
          };
          AsyncStorage.setItem('@scraped_data', JSON.stringify(merged)).catch(console.error);
          return merged;
        });

      } else if (msg.type === 'URL_CHANGE') {
        const url = msg.payload;
        if (url.includes('StudentDashboard.aspx')) {
          webViewRef.current?.injectJavaScript(DASHBOARD_SCRIPT);
        } else if (url.includes('frmStudentTimeTable.aspx')) {
          webViewRef.current?.injectJavaScript(TIMETABLE_SCRIPT);
        } else if (url.includes('Student-MakeupAdjustment')) {
          webViewRef.current?.injectJavaScript(MAKEUP_SCRIPT);
        }
      } else if (msg.type === 'DEBUG') {
        console.log('SCRAPER DEBUG:', msg.message);
      } else if (msg.type === 'ERROR') {
        console.error('SCRAPER ERROR:', msg.message);
        setIsScraping(false);
      }
    } catch (e) {
      console.error('Failed to parse message from WebView:', e);
    }
  };

  return (
    <ScraperContext.Provider value={{ data, isScraping, refreshData, dumpHtml }}>
      {children}
      {isAuthenticated && (
        <View style={{ height: 0, width: 0, overflow: 'hidden', position: 'absolute', opacity: 0 }}>
          <WebView
            ref={webViewRef}
            source={{ uri: 'https://ums.lpu.in/lpuums/StudentDashboard.aspx' }}
            onLoadEnd={handleLoadEnd}
            onMessage={onMessage}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          />
        </View>
      )}
    </ScraperContext.Provider>
  );
};
