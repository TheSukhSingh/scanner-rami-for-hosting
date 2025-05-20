document.addEventListener("DOMContentLoaded", () => {
  const circle = document.querySelector('.progress-ring__circle');
  if (circle) {
    const r = circle.r.baseVal.value;
    const c = 2 * Math.PI * r;
    circle.style.strokeDasharray = `${c} ${c}`;
    circle.style.strokeDashoffset = c;
  }

  const ipFile = document.getElementById('ipCsv'),
        ipInput = document.getElementById('ipInput'),
        ipName  = document.getElementById('ipCsvName');
  if (ipFile) ipFile.addEventListener('change', () => {
    if (ipFile.files.length) {
      ipInput.style.display = 'none';
      ipName.textContent    = ipFile.files[0].name;
    } else {
      ipInput.style.display = 'block';
      ipName.textContent    = '';
    }
  });

  const urlFile = document.getElementById('urlCsv'),
        urlInput = document.getElementById('urlInput'),
        urlName  = document.getElementById('urlCsvName');
  if (urlFile) urlFile.addEventListener('change', () => {
    if (urlFile.files.length) {
      urlInput.style.display = 'none';
      urlName.textContent    = urlFile.files[0].name;
    } else {
      urlInput.style.display = 'block';
      urlName.textContent    = '';
    }
  });

  const imgInput = document.getElementById('imageInput'),
        limitMsg = document.getElementById('limit-msg');
  if (imgInput) imgInput.addEventListener('change', () => {
    if (imgInput.files.length > 30) {
      limitMsg.textContent = `You can only upload up to 30 images. You selected ${imgInput.files.length}.`;
      imgInput.value = "";
    } else {
      limitMsg.textContent = "";
    }
  });
});

function openTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
  document.getElementById(tabName).style.display = 'block';
  document.querySelector(`.tab-button[onclick="openTab('${tabName}')"]`)
          .classList.add('active');
}

function setProgress(pct) {
  const circle = document.querySelector('.progress-ring__circle');
  if (!circle) return;
  const r = circle.r.baseVal.value;
  const c = 2 * Math.PI * r;
  circle.style.strokeDashoffset = c - (pct/100)*c;
  document.querySelector('.progress-text').textContent = `${pct}%`;
}

function riskValue(lvl) {
  const v = (lvl||'').toUpperCase();
  if (v.includes('MALICIOUS')) return 3;
  if (v.includes('SUSPICIOUS')) return 2;
  if (v.includes('SAFE')||v.includes('BENIGN')) return 1;
  return 0;
}

function clearResults() {
  document.getElementById('result').innerHTML = '';
  document.getElementById('sortControls').style.display = 'none';
}

function clearURLResults() {
  document.getElementById('urlResult').innerHTML = '';
  document.getElementById('urlHistoryResult').innerHTML = '';
  document.getElementById('urlSortControls').style.display = 'none';
}

function toggleAccordion(header) {
  const body = header.nextElementSibling,
        arrow= header.querySelector('.arrow');
  if (!body) return;
  const open = body.style.display === 'block';
  body.style.display  = open ? 'none' : 'block';
  arrow.innerText     = open ? '▶️' : '🔽';
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function triggerIPFile()  { document.getElementById('ipCsv').click(); }
function triggerURLFile() { document.getElementById('urlCsv').click(); }

async function scanIP() {
  const ipFile  = document.getElementById('ipCsv'),
        result  = document.getElementById('result'),
        spinner = document.querySelector('.spinner'),
        text    = document.getElementById('overallProgressText'),
        sortCtr = document.getElementById('sortControls');

  result.innerHTML = '<p>⏳ Scanning…</p>';
  sortCtr.style.display = 'none';
  spinner.style.display = 'block';
  document.getElementById('overallLoading').style.display = 'block';
  setProgress(0);
  text.textContent = '';

  let fetchOptions;
  if (ipFile.files.length) {
    const form = new FormData();
    form.append('file', ipFile.files[0]);
    fetchOptions = { method: 'POST', body: form };
  } else {
    const raw = document.getElementById('ipInput').value.trim();
    if (!raw) { alert('Please enter at least one IP.'); resetIPLoader(); return; }
    const ips = raw.split(',').map(x => x.trim()).filter(x => x);
    if (ips.length > 30) { alert('Limit to 30 IPs.'); resetIPLoader(); return; }
    fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ips })
    };
  }

  try {
    const res  = await fetch('/api/scan', fetchOptions);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Scan failed');

    result.innerHTML = '';
    const items = data.results || [];
    for (let i = 0; i < items.length; i++) {
      renderIPCard(items[i], i);
      setProgress(Math.round(((i+1) / items.length) * 100));
      text.textContent = `🔍 ${i+1}/${items.length}`;
      await sleep(200);
    }

    if (items.length > 1) sortCtr.style.display = 'block';
    text.textContent = '✅ Done';

  } catch (err) {
    result.innerHTML = `<p class="error">⚠️ ${err.message}</p>`;
  } finally {
    spinner.style.display = 'none';
    document.getElementById('overallLoading').style.display = 'none';
  }
}

function resetIPLoader() {
  document.querySelector('.spinner').style.display = 'none';
  document.getElementById('overallLoading').style.display = 'none';
  document.getElementById('overallProgressText').textContent = '';
}


function hideIPLoader(){
  document.querySelector('.spinner').style.display = 'none';
  document.getElementById('overallLoading').style.display = 'none';
  document.getElementById('overallProgressText').textContent = '';
}

function renderIPCard(item) {
  const { ip, result, error } = item;
  const container = document.getElementById('result');
  const card = document.createElement('div');
  card.className = 'accordion';

  let riskClass = 'safe';
  if (error) {
    riskClass = 'malicious';
  } else {
    const lvl = (result.abuse_risk || '').toUpperCase();
    if (lvl.includes('MALICIOUS')) riskClass = 'malicious';
    else if (lvl.includes('SUSPICIOUS')) riskClass = 'suspicious';
  }

  let detailHTML = '';
  if (error) {
    detailHTML = `<p class="error">⚠️ ${error}</p>`;
  } else {
    const d = result;
    const color = d.abuse_risk?.includes('MALICIOUS')
      ? 'red'
      : d.abuse_risk?.includes('SUSPICIOUS')
        ? 'orange'
        : 'green';

    detailHTML = `
      <p><strong>🛡️ Risk:</strong> <span style="color:${color};">${d.abuse_risk || 'Unknown'}</span></p>
      <p><strong>📈 Reports:</strong> ${d.abuse_reports ?? 'N/A'} (Confidence: ${d.abuse_score ?? 'N/A'}%)</p>
      <p><strong>🌍 Location:</strong> ${d.ipinfo_city || 'N/A'}, ${d.ipinfo_country || 'N/A'}</p>
      <p><strong>🏢 ISP/Org:</strong> ${d.ipinfo_org || d.whois_org || 'N/A'}</p>
      <p><strong>🛰️ Hostname:</strong> ${d.ipinfo_hostname || 'Unknown'}</p>
      <p><strong>🧩 ASN:</strong> ${d.ipinfo_asn || d.whois_asn || 'N/A'}</p>
      <p><strong>🧅 Tor Exit:</strong> ${d.is_tor_exit ? 'Yes' : 'No'}</p>
      <p><strong>🛡️ VT Vendors:</strong> ${d.vt_malicious_count ?? 0}</p>
      <p><strong>🏷️ Tags:</strong> ${(d.vt_detected_vendors || []).join(', ') || 'None'}</p>
      <p><strong>🔥 VT Reputation:</strong> ${d.vt_reputation ?? 'N/A'}</p>
      ${d.recommendation 
        ? `<div class="recommendation-box"><strong>🤖 Recommendation:</strong> ${d.recommendation}</div>`
        : ''
      }
      <div class="report-wrapper" style="margin-top:8px;">
        <button
          class="button report-btn"
          data-type="ip"
          data-value="${ip}"
        >Report</button>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="accordion-header ${riskClass}" onclick="toggleAccordion(this)">
      <span class="arrow">▶️</span> <h3>${ip}</h3>
    </div>
    <div class="accordion-body">${detailHTML}</div>
  `;
  container.appendChild(card);
}

async function loadHistory(applySort = false) {
  const result = document.getElementById('result'),
        spinner= document.querySelector('.spinner'),
        text   = document.getElementById('overallProgressText'),
        sortOpt= document.getElementById('sortOption')?.value || 'date_desc';

  result.innerHTML = '';
  document.getElementById('overallLoading').style.display = 'block';
  spinner.style.display = 'block';
  text.textContent = '📜 Loading history…';
  document.getElementById('sortControls').style.display = 'block';

  try {
    const res = await fetch('/api/history'),
          data= await res.json();
    if (!res.ok) throw new Error(data.error);

    let hist = data;
    if (applySort) {
      hist.sort((a,b) => {
        if (sortOpt==='date_asc') return new Date(a.scanned_at)-new Date(b.scanned_at);
        if (sortOpt==='date_desc') return new Date(b.scanned_at)-new Date(a.scanned_at);
        if (sortOpt==='risk_asc') return riskValue(a.abuse_risk)-riskValue(b.abuse_risk);
        if (sortOpt==='risk_desc') return riskValue(b.abuse_risk)-riskValue(a.abuse_risk);
        return 0;
      });
    }

    hist.forEach((entry,i) => renderIPCard({ ip: entry.ip, result: entry, error: null }, i));
  } catch(e) {
    result.innerHTML = `<p class="error">⚠️ ${e.message}</p>`;
  } finally {
    spinner.style.display = 'none';
    document.getElementById('overallLoading').style.display='none';
    text.textContent = '✅ Loaded';
  }
}

async function scanURL() {
  const urlFile = document.getElementById('urlCsv'),
        resBox  = document.getElementById('urlResult'),
        histBox = document.getElementById('urlHistoryResult'),
        sortCtr = document.getElementById('urlSortControls');

  resBox.innerHTML = '<p>⏳ Scanning…</p>';
  histBox.innerHTML = '';
  sortCtr.style.display = 'none';

  let fetchOptions;
  if (urlFile.files.length) {
    const form = new FormData();
    form.append('file', urlFile.files[0]);
    fetchOptions = { method: 'POST', body: form };
  } else {
    const input = document.getElementById('urlInput').value.trim();
    if (!input) return alert('Please enter a URL.');
    fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: input })
    };
  }

  try {
    const response = await fetch('/api/scan-url', fetchOptions);
    const data     = await response.json();
    if (!response.ok) throw new Error(data.error || 'Scan failed');

    resBox.innerHTML = '';

    const items = data.results || [];
    items.forEach((entry, idx) => renderURLCard(entry, idx));

    if (items.length > 1) sortCtr.style.display = 'block';
  } catch (err) {
    resBox.innerHTML = `<p class="error">⚠️ ${err.message}</p>`;
  }
}


function renderURLCard(item) {
  const { url, result, error } = item;
  const container = document.getElementById('urlResult');
  const card = document.createElement('div');
  card.className = 'accordion';

  let riskClass = 'safe';
  if (error) {
    riskClass = 'malicious';
  } else {
    const lbl = (result.label || '').toLowerCase();
    const bad = ['phishing','malware','spyware','adware','defacement','hacking','cryptomining'];
    if (bad.includes(lbl)) riskClass = 'malicious';
  }

  let detailHTML = '';
  if (error) {
    detailHTML = `<p class="error">⚠️ ${error}</p>`;
  } else {
    const d = result;
    detailHTML = `
      <p><strong>🛡️ Classification:</strong> ${d.label?.toUpperCase()||'N/A'}</p>
      <p><strong>🔗 Matched Against:</strong> ${d.matched_against||'N/A'}</p>
      <p><strong>🧩 Group:</strong> ${d.group||'N/A'}</p>
      <p><strong>📈 Confidence:</strong> ${d.confidence_score||'N/A'}</p>
      <p><strong>🏷️ Tags:</strong> ${(d.tags||[]).join(', ')||'None'}</p>
      <p><strong>🔎 Threat Type:</strong> ${d.threat_type||'N/A'}</p>
      <p><strong>📅 Discovered On:</strong> ${d.discovered_on||'N/A'}</p>
      <p><strong>🗂️ Source:</strong> ${d.source||'N/A'}</p>
      <p><strong>📝 Notes:</strong> ${d.notes||'None'}</p>
      ${d.recommendation 
        ? `<div class="recommendation-box"><strong>🤖 Recommendation:</strong> ${d.recommendation}</div>`
        : ''
      }
      <div class="report-wrapper" style="margin-top:8px;">
        <button
          class="button report-btn"
          data-type="url"
          data-value="${url}"
        >Report</button>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="accordion-header ${riskClass}" onclick="toggleAccordion(this)">
      <span class="arrow">▶️</span> <h3>${url}</h3>
    </div>
    <div class="accordion-body">${detailHTML}</div>
  `;
  container.appendChild(card);
}

async function loadURLHistory(applySort = false) {
  const histBox = document.getElementById('urlHistoryResult'),
        sortOpt = document.getElementById('urlSortOption')?.value||'date_desc';

  histBox.innerHTML = '';
  document.getElementById('urlSortControls').style.display = 'block';

  try {
    const r = await fetch('/api/url-history'),
          data = await r.json();
    if (!r.ok) throw new Error(data.error);

    let hist = data;
    if (applySort) {
      hist.sort((a,b) => {
        if (sortOpt==='date_asc') return new Date(a.scanned_at)-new Date(b.scanned_at);
        if (sortOpt==='date_desc') return new Date(b.scanned_at)-new Date(a.scanned_at);
        if (sortOpt==='risk_asc') return riskValue(a.label)-riskValue(b.label);
        if (sortOpt==='risk_desc') return riskValue(b.label)-riskValue(a.label);
        return 0;
      });
    }

    hist.forEach((entry,i) => renderURLCard({ url: entry.url, result: entry, error: null }, i));
  } catch(e) {
    histBox.innerHTML = `<p class="error">⚠️ ${e.message}</p>`;
  }
}

async function scanImage() {
  const input    = document.getElementById('imageInput'),
        resultBox= document.getElementById('imageResult');
  resultBox.innerHTML = '';

  if (!input.files.length) {
    return alert('Please select at least one image.');
  }
  if (input.files.length > 30) {
    return alert('Limit to 30 images.');
  }

  const form = new FormData();
  for (let f of input.files) form.append('file', f);

  try {
    const r = await fetch('/api/scan-image', { method:'POST', body: form }),
          data = await r.json();
    if (!r.ok) throw new Error(data.error);

    data.results.forEach(item => {
      if (item.error) {
        resultBox.innerHTML += `<p class="error">⚠️ ${item.file}: ${item.error}</p>`;
      } else {
        resultBox.innerHTML += `
          <div class="image-result-item">
            <p><strong>${item.file}</strong></p>
            <p>🧠 Prediction: ${item.label}</p>
            <p>📊 Confidence: ${item.confidence}%</p>
          </div>`;
      }
    });
  } catch(e) {
    resultBox.innerHTML = `<p class="error">⚠️ ${e.message}</p>`;
  }
}

function clearImageResult() {
  document.getElementById('imageInput').value = '';
  document.getElementById('imageResult').innerHTML = '';
  document.getElementById('limit-msg').textContent = '';
}

async function reportScan(type, value, btn) {
  if (btn.disabled) return;
  btn.disabled = true;
  const origText = btn.textContent;
  btn.textContent = 'Reporting…';

  try {
    const endpoint = type === 'ip' ? '/api/report-ip' : '/api/report-url';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(type === 'ip' ? { ip: value } : { url: value, label: '' }),
    });

    // read as text first
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      // not valid JSON (probably HTML), so ignore parse error
    }

    if (!res.ok) {
      // prefer JSON error if present, else statusText
      const errMsg = data.error || res.statusText || 'Report failed';
      throw new Error(errMsg);
    }

    // success
    btn.textContent = 'Reported';
    btn.classList.add('reported');

  } catch (err) {
    alert('🚨 ' + err.message);
    btn.disabled = false;
    btn.textContent = origText;
  }
}



document.addEventListener('click', function(e) {
  const btn = e.target.closest('.report-btn');
  if (!btn) return;
  const type  = btn.dataset.type;
  const value = btn.dataset.value;
  reportScan(type, value, btn);
});



document.addEventListener('DOMContentLoaded', () => {
  const pwLength    = document.getElementById('pwLength');
  const pwLengthVal = document.getElementById('pwLengthValue');
  const pwLower     = document.getElementById('pwLower');
  const pwUpper     = document.getElementById('pwUpper');
  const pwNumbers   = document.getElementById('pwNumbers');
  const pwSymbols   = document.getElementById('pwSymbols');
  const pwOutput    = document.getElementById('pwOutput');

  function generatePassword() {
    const length = +pwLength.value;
    pwLengthVal.textContent = length;
    let charset = '';
    if (pwLower.checked)   charset += 'abcdefghijklmnopqrstuvwxyz';
    if (pwUpper.checked)   charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (pwNumbers.checked) charset += '0123456789';
    if (pwSymbols.checked) charset += '!@#$%^&*()_+[]{}|;:,.<>?';

    if (!charset) {
      pwOutput.value = '';
      return;
    }

    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);
    let pass = '';
    for (let i = 0; i < length; i++) {
      pass += charset[randomValues[i] % charset.length];
    }
    pwOutput.value = pass;
  }

  generatePassword();

  pwLength.addEventListener('input', generatePassword);
  [pwLower, pwUpper, pwNumbers, pwSymbols].forEach(cb =>
    cb.addEventListener('change', generatePassword)
  );
  genBtn.addEventListener('click', generatePassword);
});

// ───── Inline Integrity Checker ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const fileIn  = document.getElementById('integrityFile');
  const btn     = document.getElementById('runIntegrityBtn');
  const outDiv  = document.getElementById('integrityResult');

  // Enable button on file select
  fileIn.addEventListener('change', () => {
    btn.disabled = !fileIn.files.length;
  });

  btn.addEventListener('click', async () => {
    if (!fileIn.files.length) return;
    btn.disabled = true;
    btn.textContent = 'Checking…';
    outDiv.innerHTML = '';

    const form = new FormData();
    form.append('file', fileIn.files[0]);
    form.append('refhash', ''); // optional: could add an input if you want

    let res, data;
    try {
      res = await fetch('/api/integrity', { method: 'POST', body: form });
      data = await res.json();
    } catch (e) {
      alert('Network error');
      btn.disabled = false;
      btn.textContent = 'Run Check';
      return;
    }

    // handle errors
    if (!res.ok) {
      outDiv.innerHTML = `<p class="error">${data.error || 'Error'}.</p>`;
      btn.disabled = false;
      btn.textContent = 'Run Check';
      return;
    }

    // build success UI
    const { filename, hashes, match_result, status, vt_summary, vt_verdict, vt_url } = data;
    let html = `
      <div class="scan-box ${status}">
        <div class="status-badge">
          ${ status==='safe' ? '✅ SAFE'
            : status==='malicious' ? '❌ MALICIOUS'
            : '⚠️ UNKNOWN' }
        </div>
        <h3>📄 Results for: ${filename}</h3>
        <div class="hash-box"><pre>`;

    for (const [name,val] of Object.entries(hashes)) {
      html += `${name.padEnd(7,' ')}: ${val}\n`;
    }
    html += `</pre></div>
        <div class="verdict-box">
          ${ match_result ? `<p><strong>🔎 ${match_result}</strong></p>` : '' }
          <p>${vt_summary}</p>
          <p><strong>${vt_verdict}</strong></p>
          ${ vt_url ? `<p>🔗 <a href="${vt_url}" target="_blank">View on VirusTotal</a></p>` : '' }
        </div>
      </div>
    `;

    outDiv.innerHTML = html;
    btn.disabled = false;
    btn.textContent = 'Run Check';
  });
});
