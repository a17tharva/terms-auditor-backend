document.addEventListener('DOMContentLoaded', function() {
  
  const scanBtn = document.getElementById('scanBtn');
  const statusDiv = document.getElementById('status');

  if (!scanBtn) return; // Stop if button doesn't exist

  scanBtn.addEventListener('click', async () => {
    // 1. UI Feedback
    scanBtn.disabled = true;
    scanBtn.textContent = "Scanning...";
    statusDiv.innerHTML = "🔍 Extracting text...";

    // 2. Get Active Tab
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 3. Inject Script
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: extractTextFromPage,
    }, async (results) => {
      
      if (chrome.runtime.lastError || !results || !results[0]) {
        statusDiv.innerText = "❌ Failed to grab text. Reload the page.";
        console.error(chrome.runtime.lastError);
        resetButton();
        return;
      }

      const pageText = results[0].result;
      statusDiv.innerHTML = `📜 Found ${pageText.length} chars.<br>🤖 Analyzing...`;

      try {
        // 4. Send to Python Backend
        const response = await fetch('https://terms-auditor.onrender.com/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pageText })
        });

        const data = await response.json();

        if (data.error) {
          statusDiv.innerHTML = `<div style="color:red"><b>Error:</b> ${data.error}</div>`;
          resetButton();
          return;
        }

        // 5. Determine Color Theme
        let colorClass = 'risk-low';
        let riskLabel = 'Safe';
        
        if (data.risk_score >= 8) {
          colorClass = 'risk-high';
          riskLabel = 'Critical Risk';
        } else if (data.risk_score >= 5) {
          colorClass = 'risk-med';
          riskLabel = 'Caution';
        }

        // 6. Build HTML Result
        let html = `
          <div class="score-box ${colorClass}">
            <span class="score-val">${data.risk_score}/10</span>
            <span class="score-label">${riskLabel}</span>
          </div>
          <div class="summary">"${data.summary}"</div>
          <h4>🚩 Red Flags:</h4>
          <ul>
        `;

        if (data.red_flags && data.red_flags.length > 0) {
          data.red_flags.forEach(flag => {
            html += `<li>${flag}</li>`;
          });
        } else {
          html += `<li>No major red flags found.</li>`;
        }
        
        html += `</ul>`;

        statusDiv.innerHTML = html;
        resetButton();

      } catch (err) {
        statusDiv.innerText = "❌ Server Error. Is Python running?";
        resetButton();
      }
    });
  });

  function resetButton() {
    scanBtn.disabled = false;
    scanBtn.textContent = "Scan Terms";
  }
});

function extractTextFromPage() {
  return document.body.innerText;
}
