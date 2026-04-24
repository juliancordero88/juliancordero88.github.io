// ============================================================
// TRADEMARK CLEARANCE ENGINE — app.js
// ============================================================

(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────
  // Point this at your deployed API URL after deploying to Render/Fly/etc.
  var API_BASE = (window.TM_API_BASE || 'http://localhost:8000') + '/api/v1';

  // Wire up the API docs link
  var docsLink = document.getElementById('docsLink');
  if (docsLink) docsLink.href = API_BASE.replace('/api/v1', '') + '/docs';

  // ── DOM refs ───────────────────────────────────────────────
  var markInput      = document.getElementById('markInput');
  var classInput     = document.getElementById('classInput');
  var gsInput        = document.getElementById('gsInput');
  var chkUSPTO       = document.getElementById('chkUSPTO');
  var chkEUIPO       = document.getElementById('chkEUIPO');
  var chkCommonLaw   = document.getElementById('chkCommonLaw');
  var searchBtn      = document.getElementById('searchBtn');
  var resultsSection = document.getElementById('results');
  var commonLawSect  = document.getElementById('common-law');
  var spinner        = document.getElementById('spinner');
  var errorBanner    = document.getElementById('errorBanner');
  var warningsBox    = document.getElementById('warningsBox');
  var warningsList   = document.getElementById('warningsList');
  var riskBanner     = document.getElementById('riskBanner');
  var riskBadge      = document.getElementById('riskBadge');
  var riskHeading    = document.getElementById('riskHeading');
  var riskSubtext    = document.getElementById('riskSubtext');
  var dupontSection  = document.getElementById('dupontSection');
  var dupontGrid     = document.getElementById('dupontGrid');
  var conflictsSection = document.getElementById('conflictsSection');
  var conflictsList  = document.getElementById('conflictsList');
  var conflictCount  = document.getElementById('conflictCount');
  var domainsSection = document.getElementById('domainsSection');
  var domainsGrid    = document.getElementById('domainsGrid');
  var companiesSection = document.getElementById('companiesSection');
  var companiesGrid  = document.getElementById('companiesGrid');
  var socialSection  = document.getElementById('socialSection');
  var socialGrid     = document.getElementById('socialGrid');

  // ── Helpers ────────────────────────────────────────────────

  function pct(val) {
    return Math.round((val || 0) * 100) + '%';
  }

  function scoreColor(val) {
    if (val >= 0.75) return 'var(--red)';
    if (val >= 0.50) return 'var(--amber)';
    return 'var(--green)';
  }

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.add('active');
  }

  function hideError() {
    errorBanner.classList.remove('active');
  }

  function showWarnings(warnings) {
    if (!warnings || !warnings.length) {
      warningsBox.classList.remove('active');
      return;
    }
    warningsList.innerHTML = warnings.map(function (w) {
      return '<li>' + escapeHtml(w) + '</li>';
    }).join('');
    warningsBox.classList.add('active');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setLoading(on) {
    searchBtn.disabled = on;
    spinner.classList.toggle('active', on);
  }

  async function apiFetch(path, options) {
    var resp = await fetch(API_BASE + path, options);
    if (!resp.ok) {
      var text = await resp.text();
      throw new Error('API ' + resp.status + ': ' + text.slice(0, 200));
    }
    return resp.json();
  }

  // ── Render functions ───────────────────────────────────────

  function renderRiskBanner(data) {
    var level = data.risk_level;
    riskBadge.textContent = level;
    riskBadge.className = 'risk-badge ' + level;

    var label = level === 'HIGH'
      ? 'High likelihood of confusion — attorney review strongly recommended'
      : level === 'MEDIUM'
      ? 'Moderate risk — further investigation advised before filing'
      : 'Low apparent risk — no strong conflicts detected in searched databases';

    riskHeading.textContent = data.query_mark + ' — Overall Score: ' + pct(data.overall_score);
    riskSubtext.textContent = label;
    riskBanner.style.display = 'flex';
  }

  function renderDuPont(factors) {
    var items = [
      { label: 'Factor 1 — Mark Similarity',    value: pct(factors.factor_1_mark_similarity),   numeric: true },
      { label: 'Factor 2 — Goods Relatedness',   value: pct(factors.factor_2_goods_relatedness), numeric: true },
      { label: 'Factor 5 — Fame of Mark',        value: factors.factor_5_fame_of_mark,           numeric: false },
      { label: 'Factor 6 — Concurrent Uses',     value: String(factors.factor_6_concurrent_uses), numeric: true },
      { label: 'Factor 7 — Actual Confusion',    value: factors.factor_7_actual_confusion,        numeric: false },
      { label: 'Factor 10 — Market Interface',   value: factors.factor_10_market_interface,       numeric: false },
      { label: 'Factor 11 — Right to Exclude',   value: factors.factor_11_right_to_exclude,       numeric: false },
    ];

    dupontGrid.innerHTML = items.map(function (item) {
      return (
        '<div class="dupont-card">' +
          '<div class="dupont-label">' + escapeHtml(item.label) + '</div>' +
          '<div class="dupont-value' + (item.numeric ? '' : ' attorney') + '">' +
            escapeHtml(item.value) +
          '</div>' +
        '</div>'
      );
    }).join('');

    dupontSection.style.display = 'block';
  }

  function renderConflicts(conflicts, queryMark) {
    if (!conflicts || !conflicts.length) {
      conflictsList.innerHTML = '<p style="color:var(--gray-light);text-align:center;padding:40px 0;">No conflicts found in the searched databases.</p>';
      conflictsSection.style.display = 'block';
      return;
    }

    conflictCount.textContent = '(' + conflicts.length + ')';

    conflictsList.innerHTML = conflicts.map(function (c) {
      var riskPct = pct(c.risk_score);
      var classes = c.nice_classes && c.nice_classes.length
        ? 'Classes ' + c.nice_classes.slice(0, 5).join(', ')
        : 'Class unknown';

      return (
        '<div class="conflict-card">' +
          '<div class="conflict-risk-col">' +
            '<div class="conflict-risk-pct ' + c.risk_level + '">' + riskPct + '</div>' +
            '<div class="conflict-risk-lbl">Risk</div>' +
          '</div>' +
          '<div class="conflict-body">' +
            '<h4>' + escapeHtml(c.mark) +
              '<span class="chip">' + escapeHtml(c.source) + '</span>' +
            '</h4>' +
            '<div class="conflict-meta">' +
              escapeHtml(c.owner || '—') + ' · ' + escapeHtml(c.status || '—') + ' · ' + escapeHtml(classes) +
            '</div>' +
            '<div class="conflict-gs">' + escapeHtml((c.goods_services || '').slice(0, 180) + (c.goods_services && c.goods_services.length > 180 ? '…' : '')) + '</div>' +
          '</div>' +
          '<div class="conflict-scores">' +
            scoreRow('Phonetic', c.phonetic) +
            scoreRow('Visual',   c.visual) +
            scoreRow('Concept',  c.conceptual) +
            scoreRow('G&S',      c.gs_relatedness) +
          '</div>' +
        '</div>'
      );
    }).join('');

    conflictsSection.style.display = 'block';
  }

  function scoreRow(label, val) {
    var w = Math.round((val || 0) * 100);
    return (
      '<div class="score-row">' +
        '<span class="lbl">' + label + '</span>' +
        '<span class="val">' + pct(val) + '</span>' +
      '</div>' +
      '<div class="score-bar"><div class="score-bar-fill" style="width:' + w + '%"></div></div>'
    );
  }

  function renderDomains(domains) {
    if (!domains || !domains.length) return;
    domainsGrid.innerHTML = domains.map(function (d) {
      var taken = d.registered;
      return (
        '<div class="cl-card">' +
          '<span class="cl-label">' + escapeHtml(d.domain) + '</span>' +
          '<span class="cl-status ' + (taken ? 'taken' : 'available') + '">' +
            (taken ? 'Registered' : 'Available') +
          '</span>' +
        '</div>'
      );
    }).join('');
    domainsSection.style.display = 'block';
  }

  function renderCompanies(companies) {
    if (!companies || !companies.length) return;
    companiesGrid.innerHTML = companies.slice(0, 20).map(function (co) {
      return (
        '<div class="cl-card">' +
          '<span class="cl-label" style="max-width:65%">' + escapeHtml(co.name) + ' <small style="opacity:.5">(' + escapeHtml(co.jurisdiction) + ')</small></span>' +
          '<span class="cl-status ' + (co.status && co.status.toLowerCase() === 'active' ? 'taken' : 'unknown') + '">' +
            escapeHtml(co.status || 'Unknown') +
          '</span>' +
        '</div>'
      );
    }).join('');
    companiesSection.style.display = 'block';
  }

  function renderSocial(social) {
    if (!social || !social.length) return;
    socialGrid.innerHTML = social.map(function (s) {
      var cls = s.available === null ? 'unknown' : s.available ? 'available' : 'taken';
      var label = s.available === null ? 'Unknown' : s.available ? 'Available' : 'Taken';
      return (
        '<div class="cl-card">' +
          '<span class="cl-label">' + escapeHtml(s.platform) + ' ' + escapeHtml(s.handle) + '</span>' +
          '<span class="cl-status ' + cls + '">' + label + '</span>' +
        '</div>'
      );
    }).join('');
    socialSection.style.display = 'block';
  }

  // ── Main search ────────────────────────────────────────────

  window.runSearch = async function () {
    var mark = (markInput.value || '').trim();
    if (!mark) {
      markInput.focus();
      return;
    }

    // Reset UI
    hideError();
    warningsBox.classList.remove('active');
    riskBanner.style.display = 'none';
    dupontSection.style.display = 'none';
    conflictsSection.style.display = 'none';
    domainsSection.style.display = 'none';
    companiesSection.style.display = 'none';
    socialSection.style.display = 'none';
    resultsSection.style.display = 'block';
    commonLawSect.style.display = 'none';
    conflictsList.innerHTML = '';
    dupontGrid.innerHTML = '';

    setLoading(true);

    try {
      // Parse classes
      var classesStr = (classInput.value || '').trim();
      var niceClasses = [];
      if (classesStr) {
        niceClasses = classesStr.split(',').map(function (s) {
          return parseInt(s.trim(), 10);
        }).filter(function (n) { return !isNaN(n); });
      }

      // Build source param
      var sources = [];
      if (chkUSPTO.checked) { sources.push('marker'); sources.push('rapidapi'); }
      if (chkEUIPO.checked)  sources.push('euipo');
      var sourceParam = sources.length ? sources.join(',') : 'euipo';

      // Risk assessment (includes trademark search + scoring)
      var riskBody = {
        mark:           mark,
        goods_services: (gsInput.value || '').trim(),
        nice_classes:   niceClasses,
      };

      var riskData = await apiFetch('/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(riskBody),
      });

      showWarnings(riskData.warnings);
      renderRiskBanner(riskData);
      renderDuPont(riskData.dupont_factors);
      renderConflicts(riskData.conflicts, mark);

      // Common law (parallel, optional)
      if (chkCommonLaw.checked) {
        commonLawSect.style.display = 'block';
        try {
          var clData = await apiFetch('/common-law?q=' + encodeURIComponent(mark));
          renderDomains(clData.domains);
          renderCompanies(clData.companies);
          renderSocial(clData.social);
        } catch (clErr) {
          // Non-fatal — show a note
          domainsSection.style.display = 'block';
          domainsGrid.innerHTML = '<p style="color:var(--amber);font-size:0.85rem;padding:10px 0;">Common law check unavailable: ' + escapeHtml(clErr.message) + '</p>';
        }
      }

      // Scroll to results
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      showError(err.message || 'Search failed. Is the API server running?');
    } finally {
      setLoading(false);
    }
  };

  // Allow Enter key in the mark input to trigger search
  markInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') window.runSearch();
  });

})();
