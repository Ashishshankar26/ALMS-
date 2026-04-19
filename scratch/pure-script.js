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
      var hasCgpa  = cgpaEl  && /[0-9]+\.[0-9]+/.test(cgpaEl.innerText);
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
          var vidM = infoTxt.match(/VID\s*:\s*([0-9]+)/i); if (vidM) prof.vid = vidM[1];
          var secM = infoTxt.match(/Section\s*:\s*([A-Z0-9]+)/i); if (secM) prof.section = secM[1];
          var progM = infoTxt.match(/[BMD]\.Tech[^\n]*\([^)]+\)/i); if (progM) prof.program = progM[0];
        }
        var picEl = document.getElementById("p_picture");
        if (picEl && picEl.src) prof.avatarUrl = picEl.src;

        var qC = "--";
        var cgpaEl = document.getElementById("cgpa");
        if (cgpaEl) { 
          var cm = cgpaEl.innerText.match(/([0-9]+\.[0-9]+)/); 
          if (cm) qC = cm[1]; 
        }

        var qA = ""; // Start with empty to allow fallback
        var attEl = document.getElementById("AttPercent");
        if (attEl) { 
          // Match the percentage number in text like "ATTENDANCE : 90%"
          var am = attEl.innerText.match(/([0-9]+(?:\.[0-9]+)?)/); 
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
            var code = bTags.length > 0 ? bTags[0].innerText.trim().replace(/\s*:$/, "") : "";
            
            var pTag = row.querySelector("p.font-weight-medium");
            var name = "";
            if (pTag) { 
              var rawP = pTag.innerText || ""; 
              var ci = rawP.indexOf(":"); 
              if (ci > -1) name = rawP.substring(ci+1).split("\n")[0].trim(); 
            }

            if (code && code.length > 2) {
              var normCode = code.split("-")[0].split(":")[0].trim().replace(/[\s:]/g, "").toUpperCase();
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
            var ldM = detail.match(/Last\s*Date\s*:\s*([0-9\-\/]+)/i);
            if (code && code.length > 1 && code.length < 20) {
              assignments.push({ 
                id: Math.random().toString(), 
                courseCode: code, 
                type: detail.replace(/Course\s*:\s*/i, "").trim(), 
                lastDate: ldM ? ldM[1] : "Check UMS" 
              });
            }
          }
        }

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
              var title = subjEl.innerText.replace(/New\s*/i, "").trim();
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
            attendance: att, messages: msgs, assignments: assignments, announcements: announc 
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
              
              var tRegex = /Term\s*[:\s]*([IVX\d]+)/gi;
              var gRegex = /TGPA\s*[:\s]*([0-9.]+)/gi;
              
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
                    var nameMatch = rowText.match(/::\s*([^Grade\n]+)/i);
                    var gradeMatch = rowText.match(/Grade\s*[:\s]*([A-Z+O]{1,2})/i);
                    
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
