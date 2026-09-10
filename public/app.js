(function () {
  const STATUS_LABELS = {
    'a contacter': 'À contacter',
    'contacte': 'Contacté',
    'relance': 'Relancé',
    'devis envoye': 'Devis envoyé',
    'pas interesse': 'Pas intéressé',
    'a relancer': 'À relancer',
    'client': 'Client'
  };

  let currentProspects = [];
  let lastAudit = null;
  let activeView = 'audit';
  let searchResults = [];
  let auditQueueId = null;
  let searchPolling = null;

  const $ = (id) => document.getElementById(id);

  document.getElementById('today').textContent = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  // --- Onglets ---
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  function switchView(view) {
    activeView = view;
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    if (view === 'history') loadHistory();
    if (view === 'search') $('searchVille').focus();
  }

  async function api(path, opts = {}) {
    const res = await fetch('/api' + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('Erreur HTTP ' + res.status));
    return data;
  }

  // --- Nouvel audit ---
  async function runAudit() {
    const url = $('urlInput').value.trim();
    if (!url) { $('urlInput').focus(); return; }

    $('runBtn').disabled = true;
    $('errorBox').classList.remove('show');
    $('report').classList.remove('show');
    $('status').classList.add('show');
    const competitor = $('competitorInput').value.trim();
    const t0 = Date.now();
    const tick = () => {
      const s = Math.round((Date.now() - t0) / 1000);
      const extra = competitor ? ' (comparaison concurrent, peut durer jusqu\'à 2 min)' : '';
      $('statusText').textContent = `Analyse en cours… ${s}s écoulées (30 à 60 secondes${extra})`;
    };
    tick();
    const timer = setInterval(tick, 1000);

    try {
      const data = await api('/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, competitor: competitor || undefined })
      });
      lastAudit = data;
      window.Report.fill(data);
      $('saveBtn').disabled = false;
      const rep = $('report');
      if (rep) rep.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showError(err.message);
    } finally {
      clearInterval(timer);
      $('runBtn').disabled = false;
      $('status').classList.remove('show');
    }
  }

  async function saveProspect() {
    if (!lastAudit) return;
    $('saveBtn').disabled = true;
    try {
      await api('/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: lastAudit.url,
          name: $('nameInput').value,
          contact: $('contactInput').value,
          audit: lastAudit
        })
      });
      const btn = $('saveBtn');
      btn.textContent = 'Enregistré ✓';
      setTimeout(() => { btn.textContent = 'Enregistrer dans mes prospects'; }, 2000);
    } catch (err) {
      showError(err.message);
      $('saveBtn').disabled = false;
    }
  }

  function showError(msg) {
    $('errorBox').textContent = msg;
    $('errorBox').classList.add('show');
  }

  function showHistoryError(msg) {
    const box = $('historyErrorBox');
    if (!box) return;
    box.textContent = msg;
    box.classList.add('show');
  }

  // --- Historique ---
  async function loadHistory() {
    try {
currentProspects = await api('/prospects');
      renderHistoryList();
    } catch (err) {
      $('historyList').innerHTML = `<div class="empty">Erreur : ${window.Report.escapeHtml(err.message)}</div>`;
    }
  }

  function renderHistoryList() {
    const el = $('historyList');
    $('detail').style.display = 'none';
    el.style.display = 'block';

if (!currentProspects.length) {
      el.innerHTML = '<div class="empty">Aucun prospect audité pour l\'instant.</div>';
      return;
    }

    const today = new Date();
    const metrics = currentProspects.reduce((m, p) => {
      if (p.nextContact && new Date(p.nextContact) <= today && p.status !== 'client' && p.status !== 'pas interesse') m.dueRelance++;
      if (p.status === 'client') m.clients++;
      if (p.status === 'devis envoye') m.devis++;
      return m;
    }, { clients: 0, devis: 0, dueRelance: 0 });

    const metricsHtml = `<div class="pipeline">
      <span class="pl-item"><b>${currentProspects.length}</b> prospects</span>
      <span class="pl-item"><b>${metrics.devis}</b> devis</span>
      <span class="pl-item"><b>${metrics.clients}</b> clients</span>
      ${metrics.dueRelance ? `<span class="pl-item pl-warn"><b>${metrics.dueRelance}</b> à relancer</span>` : ''}
    </div>`;

const rows = currentProspects.map(p => {
      const next = p.nextContact && p.status !== 'client' && p.status !== 'pas interesse'
        ? `<div class="next-contact ${new Date(p.nextContact) <= today ? 'next-due' : ''}">Rappel : ${new Date(p.nextContact).toLocaleDateString('fr-FR')}</div>` : '';
      return `
      <tr data-id="${p.id}" class="clickable">
        <td class="cell-url">${window.Report.escapeHtml(p.url)}</td>
        <td>${window.Report.escapeHtml(p.name) || '—'}${next}</td>
        <td><span class="score-chip ${window.Report.scoreColor(p.score)}">${p.score == null ? '—' : p.score}</span></td>
        <td>
          <select class="status-select" data-id="${p.id}" data-status="${p.status}">
            ${Object.keys(STATUS_LABELS).map(s =>
              `<option value="${s}" ${s === p.status ? 'selected' : ''}>${STATUS_LABELS[s]}</option>`
            ).join('')}
          </select>
        </td>
        <td style="white-space:nowrap;">${p.lastAuditDate ? new Date(p.lastAuditDate).toLocaleDateString('fr-FR') : '—'}</td>
      </tr>
    `;
    }).join('');

    el.innerHTML = `${metricsHtml}
      <table class="history">
        <thead><tr>
          <th>URL</th><th>Prospect</th><th>Score</th><th>Statut</th><th>Dernier audit</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    el.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', () => updateStatus(sel.dataset.id, sel.value, sel));
    });
    el.querySelectorAll('tr.clickable').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.tagName === 'SELECT') return;
        showDetail(tr.dataset.id);
      });
    });
  }

  async function updateStatus(id, status, sel) {
    sel.classList.add('change');
    try {
      await api('/prospects/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setTimeout(() => sel.classList.remove('change'), 600);
    } catch (err) {
      showHistoryError('Erreur : ' + err.message);
      loadHistory();
    }
  }

  // --- Détail prospect ---
  async function showDetail(id) {
    try {
      const p = await api('/prospects/' + id);
      $('historyList').style.display = 'none';
const det = $('detail');
      det.style.display = 'block';

      const audits = p.audits.slice().reverse();
      const trend = (idx, cur) => {
        const prev = audits[idx + 1];
        if (!prev || cur == null || prev.scores.performance == null) return '';
        if (cur > prev.scores.performance) return ' <span class="tl-trend up">▲</span>';
        if (cur < prev.scores.performance) return ' <span class="tl-trend down">▼</span>';
        return '';
      };
      $('detailHead').innerHTML = `
        <h2 class="section">${window.Report.escapeHtml(p.name) || window.Report.escapeHtml(p.url)}</h2>
        <p class="section-sub">${window.Report.escapeHtml(p.url)} · ${window.Report.escapeHtml(p.contact) || 'aucun contact'} · Statut : <b>${window.Report.escapeHtml(STATUS_LABELS[p.status])}</b></p>
        <div class="actions" style="margin-top:0;">
          <button id="reAuditBtn" class="primary">Relancer l'audit</button>
        </div>
      `;

      const ncVal = p.nextContact ? p.nextContact.slice(0, 10) : '';
      $('detailBody').innerHTML = `
        <h2 class="section" style="margin-top:24px;">Suivi</h2>
        <div class="followup">
          <div class="fu-row"><label for="ncInput">Relance prévue le</label><input type="date" id="ncInput" value="${window.Report.escapeHtml(ncVal)}" /></div>
          <div class="fu-row"><label for="notesInput">Notes</label><textarea id="notesInput" rows="3">${window.Report.escapeHtml(p.notes || '')}</textarea></div>
          <button id="saveFollowup" class="primary">Enregistrer le suivi</button>
        </div>

        <h2 class="section" style="margin-top:24px;">Historique des audits (${audits.length})</h2>
        <div class="audit-timeline">
          ${audits.map((a, i) => `
            <div class="tl-item">
              <div class="tl-head">
                <span class="tl-date">${new Date(a.date).toLocaleString('fr-FR')}</span>
                <span>${a.device === 'mobile' ? 'Mobile' : window.Report.escapeHtml(a.device) || ''}</span>
              </div>
              <div class="tl-scores">
                <span class="tl-score">Performance <b class="${window.Report.scoreColor(a.scores.performance)}">${a.scores.performance ?? '—'}</b>${trend(i, a.scores.performance)}</span>
                <span class="tl-score">SEO <b class="${window.Report.scoreColor(a.scores.seo)}">${a.scores.seo ?? '—'}</b></span>
                <span class="tl-score">Accessibilité <b class="${window.Report.scoreColor(a.scores.accessibility)}">${a.scores.accessibility ?? '—'}</b></span>
                <span class="tl-score">Bonnes pratiques <b class="${window.Report.scoreColor(a.scores.bestPractices)}">${a.scores.bestPractices ?? '—'}</b></span>
              </div>
              <div class="tl-pitch">${window.Report.escapeHtml(a.pitch) || ''}</div>
            </div>
          `).join('')}
        </div>
      `;

      $('reAuditBtn').addEventListener('click', () => reAudit(p.id, $('reAuditBtn')));
      $('saveFollowup').addEventListener('click', () => saveFollowup(p.id));
      $('backBtn').addEventListener('click', () => {
        det.style.display = 'none';
        renderHistoryList();
      });
    } catch (err) {
      showHistoryError('Erreur : ' + err.message);
    }
  }

  async function saveFollowup(id) {
    const btn = $('saveFollowup');
    btn.disabled = true;
    try {
      await api('/prospects/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: $('notesInput').value,
          nextContact: $('ncInput').value || null
        })
      });
      btn.textContent = 'Enregistré ✓';
      setTimeout(() => { btn.textContent = 'Enregistrer le suivi'; btn.disabled = false; }, 1500);
    } catch (err) {
      btn.disabled = false;
      showHistoryError('Erreur : ' + err.message);
    }
  }

  async function reAudit(id, btn) {
    btn.disabled = true;
    btn.textContent = 'Analyse en cours…';
    try {
      await api('/prospects/' + id + '/audit', { method: 'POST' });
      btn.disabled = false;
      btn.textContent = 'Relancer l\'audit';
      showDetail(id);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Relancer l\'audit';
      showHistoryError('Erreur : ' + err.message);
    }
  }

  function copyToClipboard(text, btn, doneLabel) {
    const orig = btn.textContent;
    const ok = () => { btn.textContent = doneLabel; setTimeout(() => { btn.textContent = orig; }, 1500); };
    const fail = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const worked = document.execCommand('copy');
        document.body.removeChild(ta);
        if (worked) return ok();
      } catch (_) {}
      showError('Copie impossible : accès au presse-papiers bloqué.');
      btn.textContent = orig;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok, fail);
    } else {
      fail();
    }
  }

  // --- Recherche de prospects ---
  async function searchProspects() {
    const ville = $('searchVille').value.trim();
    const categorie = $('searchCategorie').value;
    if (!ville) { $('searchVille').focus(); return; }
    if (!categorie) { $('searchCategorie').focus(); return; }

    $('searchBtn').disabled = true;
    $('searchErrorBox').classList.remove('show');
    $('searchResults').style.display = 'none';
    $('searchStatus').style.display = 'flex';
    $('searchStatusText').textContent = 'Recherche en cours...';

    try {
      const data = await api('/prospecting/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorie, ville })
      });

      searchResults = data.results || [];
      auditQueueId = data.auditQueueId;

      renderSearchResults(searchResults);

      if (auditQueueId) {
        startAuditPolling();
      }
    } catch (err) {
      $('searchErrorBox').textContent = err.message;
      $('searchErrorBox').classList.add('show');
    } finally {
      $('searchBtn').disabled = false;
      $('searchStatus').style.display = 'none';
    }
  }

  function renderSearchResults(results) {
    const el = $('searchResults');
    el.style.display = 'block';

    const noSite = results.filter(r => r.tag === 'no-site');
    const badScore = results.filter(r => r.tag === 'to-audit' && r.audit && r.audit.scores && r.audit.scores.performance < 50);
    const goodScore = results.filter(r => r.tag === 'to-audit' && r.audit && r.audit.scores && r.audit.scores.performance >= 50);
    const pending = results.filter(r => r.tag === 'to-audit' && !r.audit);

    const total = results.length;
    const selectedCount = results.filter(r => r.selected).length;
    $('searchCount').textContent = `${total} résultat${total > 1 ? 's' : ''} · ${selectedCount} sélectionné${selectedCount > 1 ? 's' : ''}`;

    $('resultsNoSite').innerHTML = noSite.length
      ? noSite.map(r => resultCardHtml(r)).join('')
      : '<div class="empty">Aucun résultat</div>';

    $('resultsBadScore').innerHTML = badScore.length
      ? badScore.map(r => resultCardHtml(r)).join('')
      : (pending.length ? '<div class="empty">Audit en cours...</div>' : '<div class="empty">Aucun résultat</div>');

    $('resultsGoodScore').innerHTML = goodScore.length
      ? goodScore.map(r => resultCardHtml(r)).join('')
      : '<div class="empty">Aucun résultat</div>';

    el.querySelectorAll('.result-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = parseInt(cb.dataset.idx, 10);
        searchResults[idx].selected = cb.checked;
        renderSearchResults(searchResults);
      });
    });

    el.querySelectorAll('.add-single-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        saveSingleProspect(searchResults[idx]);
      });
    });
  }

  function resultCardHtml(r, idx) {
    const score = r.audit?.scores?.performance;
    const scoreHtml = score != null
      ? `<span class="score-chip ${window.Report.scoreColor(score)}">${score}</span>`
      : (r.tag === 'no-site' ? '<span class="tag tag-no-site">Pas de site</span>' : '<span class="pending-audit">Audit en cours...</span>');

    return `
      <div class="result-card ${r.selected ? 'selected' : ''}">
        <input type="checkbox" class="result-checkbox" data-idx="${searchResults.indexOf(r)}" ${r.selected ? 'checked' : ''} />
        <div class="result-info">
          <div class="result-name">${window.Report.escapeHtml(r.nom || 'Sans nom')}</div>
          <div class="result-addr">${window.Report.escapeHtml(r.adresse || '')}</div>
          <div class="result-tel">${window.Report.escapeHtml(r.telephone || '')}</div>
          ${r.websiteUri ? `<div class="result-url"><a href="${window.Report.escapeHtml(r.websiteUri)}" target="_blank" rel="noopener">${window.Report.escapeHtml(r.websiteUri)}</a></div>` : ''}
        </div>
        <div class="result-score">${scoreHtml}</div>
        <button class="add-single-btn" data-idx="${searchResults.indexOf(r)}">+</button>
      </div>
    `;
  }

  function startAuditPolling() {
    if (searchPolling) clearInterval(searchPolling);
    searchPolling = setInterval(async () => {
      try {
        const progress = await api(`/prospecting/audit-progress/${auditQueueId}`);
        if (progress.results) {
          for (let i = 0; i < progress.results.length; i++) {
            if (progress.results[i] && progress.results[i].audit) {
              searchResults[i].audit = progress.results[i].audit;
              searchResults[i].status = progress.results[i].status;
            }
          }
          renderSearchResults(searchResults);
        }
        if (progress.done) {
          clearInterval(searchPolling);
          searchPolling = null;
        }
      } catch {
        clearInterval(searchPolling);
        searchPolling = null;
      }
    }, 2000);
  }

  async function saveSingleProspect(result) {
    try {
      await api('/prospecting/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospects: [{ ...result, categorie: $('searchCategorie').value, ville: $('searchVille').value.trim() }]
        })
      });
      result.saved = true;
      renderSearchResults(searchResults);
    } catch (err) {
      $('searchErrorBox').textContent = err.message;
      $('searchErrorBox').classList.add('show');
    }
  }

  async function saveBatchProspects() {
    const selected = searchResults.filter(r => r.selected && !r.saved);
    if (!selected.length) return;

    $('saveBatchBtn').disabled = true;
    try {
      const enriched = selected.map(r => ({
        ...r,
        categorie: $('searchCategorie').value,
        ville: $('searchVille').value.trim()
      }));
      const data = await api('/prospecting/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects: enriched })
      });
      for (const r of selected) r.saved = true;
      renderSearchResults(searchResults);
      $('saveBatchBtn').textContent = `${data.saved} prospect${data.saved > 1 ? 's' : ''} ajouté${data.saved > 1 ? 's' : ''} ✓`;
      setTimeout(() => { $('saveBatchBtn').textContent = 'Ajouter la sélection aux prospects'; }, 2000);
    } catch (err) {
      $('searchErrorBox').textContent = err.message;
      $('searchErrorBox').classList.add('show');
    } finally {
      $('saveBatchBtn').disabled = false;
    }
  }

  function selectAllResults() {
    searchResults.forEach(r => { if (!r.saved) r.selected = true; });
    renderSearchResults(searchResults);
  }

  function deselectAllResults() {
    searchResults.forEach(r => { r.selected = false; });
    renderSearchResults(searchResults);
  }

// --- Copier le résumé ---
  $('copyBtn').addEventListener('click', () => {
    if (!lastAudit) return;
    copyToClipboard(window.Report.buildCopyText(lastAudit), $('copyBtn'), 'Copié !');
  });

  // --- Écrire l'email client ---
  $('emailBtn').addEventListener('click', () => {
    if (!lastAudit) return;
    copyToClipboard(window.Report.buildEmailText(lastAudit), $('emailBtn'), 'Email copié !');
  });

  // --- Exporter le rapport client (impression → PDF) ---
  $('pdfBtn').addEventListener('click', () => {
    if (!lastAudit) return;
    const prospectName = $('nameInput').value.trim();
    $('clientReport').innerHTML = window.Report.buildClientReportHtml(lastAudit, prospectName);
    window.print();
  });

  $('runBtn').addEventListener('click', runAudit);
  $('urlInput').addEventListener('keydown', e => { if (e.key === 'Enter') runAudit(); });
  $('saveBtn').addEventListener('click', saveProspect);

  $('searchBtn').addEventListener('click', searchProspects);
  $('searchVille').addEventListener('keydown', e => { if (e.key === 'Enter') searchProspects(); });
  $('selectAllBtn').addEventListener('click', selectAllResults);
  $('deselectAllBtn').addEventListener('click', deselectAllResults);
  $('saveBatchBtn').addEventListener('click', saveBatchProspects);
})();
