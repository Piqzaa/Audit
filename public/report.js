(function () {
  const SCORE_LABELS = [
    ['performance', 'Performance'],
    ['seo', 'SEO (Lighthouse)'],
    ['accessibility', 'Accessibilité'],
    ['bestPractices', 'Bonnes pratiques']
  ];
  const VITAL_LABELS = [
    ['lcp', 'LCP (chargement)'],
    ['cls', 'CLS (stabilité)'],
    ['tbt', 'TBT (réactivité)'],
    ['fcp', 'FCP (premier affichage)'],
    ['inp', 'INP (interactivité)']
  ];
  const VITAL_THRESHOLDS = {
    lcp: [2.5, 4],
    cls: [0.1, 0.25],
    tbt: [200, 600],
    fcp: [1.8, 3],
    inp: [200, 500]
  };

  function vitalColor(key, value) {
    if (value == null) return 'na';
    const raw = parseFloat(String(value).replace(',', '.'));
    if (Number.isNaN(raw)) return 'na';
    const t = VITAL_THRESHOLDS[key];
    if (!t) return 'na';
    if (raw < t[0]) return 'good';
    if (raw < t[1]) return 'mid';
    return 'bad';
  }

  function scoreClass(score) {
    if (score == null) return 'score-na';
    if (score >= 90) return 'score-good';
    if (score >= 50) return 'score-mid';
    return 'score-bad';
  }

  function scoreColor(score) {
    if (score == null) return 'na';
    if (score >= 90) return 'good';
    if (score >= 50) return 'mid';
    return 'bad';
  }

  function prioClass(prio) {
    if (prio === 'Élevée') return 'prio-high';
    if (prio === 'Moyenne') return 'prio-mid';
    return 'prio-low';
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtAuditDate(audit) {
    const iso = (audit && audit.date) || new Date().toISOString();
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function oppRow(o) {
    const label = o.label || o.title || '';
    return `<div class="opp">
      <span class="prio ${prioClass(o.prio)}">${escapeHtml(o.prio || '')}</span>
      <div class="opp-body">
        <div class="opp-title">${escapeHtml(label)}</div>
        ${o.figure ? `<div class="opp-figure">${escapeHtml(o.figure)}</div>` : ''}
        ${o.impact ? `<div class="opp-impact">${escapeHtml(o.impact)}</div>` : ''}
      </div>
    </div>`;
  }

  function findingRow(f) {
    const reason = [f.detail, f.why, f.recommendation ? `Recommandation : ${f.recommendation}` : ''].filter(Boolean).join(' · ');
    return `<div class="${f.ok ? 'ck ck-ok' : 'ck ck-warn'}">
      <span class="ck-ico">${f.ok ? '✓' : '✗'}</span>
      <div>
        <div class="ck-title">${escapeHtml(f.label)}</div>
        ${reason ? `<div class="ck-detail">${escapeHtml(reason)}</div>` : ''}
      </div>
    </div>`;
  }

  function findingLi(f) {
    const why = f.why ? ` <span>${escapeHtml(f.why)}</span>` : '';
    const rec = f.recommendation ? ` <span class="cr-rec">Recommandation : ${escapeHtml(f.recommendation)}</span>` : '';
    return `<li class="${f.ok ? 'ok' : ''}">${escapeHtml(f.label)}${why}${rec}</li>`;
  }

  function summaryRow(s) {
    const tag = s.severity === 'high' ? 'Attention' : s.severity === 'mid' ? 'À surveiller' : s.severity === 'action' ? 'Priorité' : 'OK';
    return `<div class="kpi kpi-${s.severity}"><span class="kpi-tag">${tag}</span><span class="kpi-text">${escapeHtml(s.text)}</span></div>`;
  }

  function summaryHtml(summary) {
    if (!summary || !summary.length) return '';
    return `<h2 class="section">Ce qui saute aux yeux</h2>
      <p class="section-sub">Les points clés à retenir pour le client.</p>
      <div class="kpis">${summary.map(summaryRow).join('')}</div>`;
  }

  function sectionHtml(cat) {
    const score = cat.score;
    const badge = score != null ? `<span class="sec-score ${scoreColor(score)}">${score}</span>` : '';
    const issues = cat.issues || [];
    const body = issues.length
      ? issues.map(i => `<div class="cat-issue">
          <span class="prio ${prioClass(i.prio)}">${escapeHtml(i.prio || '')}</span>
          <div class="cat-issue-body">
            <div class="cat-issue-title">${escapeHtml(i.title)}</div>
            ${i.figure ? `<div class="cat-issue-figure">${escapeHtml(i.figure)}</div>` : ''}
            ${i.impact ? `<div class="cat-issue-impact">${escapeHtml(i.impact)}</div>` : ''}
          </div>
        </div>`).join('')
      : '<p class="sec-ok">Aucun problème détecté sur cette section.</p>';
    return `<div class="cat-section">
      <div class="cat-head">
        <div>
          <h3 class="cat-title">${escapeHtml(cat.label)}</h3>
          <div class="cat-desc">${escapeHtml(cat.desc)}</div>
        </div>
        ${badge}
      </div>
      <div class="cat-body">${body}</div>
    </div>`;
  }

  function categoriesHtml(categories) {
    if (!categories || !categories.length) return '';
    return `<div class="catPanel">${categories.map(sectionHtml).join('')}</div>`;
  }

  function compareHtml(cmp) {
    if (!cmp || !Array.isArray(cmp.rows) || !cmp.rows.length) return '';
    const rows = cmp.rows.map(r => {
      const cell = (v, side) => {
        if (r.winner === 'na') return `<b>${escapeHtml(v == null ? '—' : v)}</b>`;
        const cls = r.winner === side ? 'cmp-better' : '';
        const mark = r.winner === side ? ' ✓' : '';
        return `<b class="${cls}">${escapeHtml(v == null ? '—' : v)}${mark}</b>`;
      };
      return `<tr>
        <td>${escapeHtml(r.label)}</td>
        <td>${cell(r.mine, 'mine')}</td>
        <td>${cell(r.theirs, 'theirs')}</td>
      </tr>`;
    }).join('');
    return `<section class="brief">
      <div class="brief-head">
        <div><h2 class="section" style="margin:0;">Vous vs concurrent</h2>
        <p class="section-sub" style="margin:2px 0 0;">${escapeHtml(cmp.competitorUrl)}</p></div>
      </div>
      <table class="cmp">
        <thead><tr><th>Critère</th><th>Votre site</th><th>Concurrent</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="cmp-summary">${escapeHtml(cmp.summary || '')}</p>
    </section>`;
  }

  function businessBriefHtml(business) {
    if (!business || !Array.isArray(business.families) || !business.families.length) return '';
    const fams = business.families;
    const scoreLabel = business.businessScore === 'eleve' ? 'Potentiel de progression élevé'
      : business.businessScore === 'moyen' ? 'Potentiel de progression modéré'
      : 'Peu de marge de progression';
    const ll = business.lostLeads;

    const famHtml = fams.map(f => {
      const top = f.topIssue ? `<div class="bf-top">${escapeHtml(f.topIssue.title)}</div>` : '';
      return `<div class="bf-card bf-${f.color}">
        <div class="bf-name">${escapeHtml(f.label)}</div>
        <div class="bf-note">${escapeHtml(f.note)}${f.score != null ? ` · ${f.score}/100` : ''}</div>
        ${top}
      </div>`;
    }).join('');

    const lostHtml = (ll && ll.enabled && ll.estLostPerMonth > 0)
      ? `<div class="bf-lost"><span class="bf-lost-num">~${ll.estLostPerMonth}</span> leads potentiels par mois perdus liés à la lenteur mobile (estimation indicative)</div>`
      : '';

    return `<section class="brief">
      <div class="brief-head">
        <div>
          <h2 class="section" style="margin:0;">En bref</h2>
          <p class="section-sub" style="margin:2px 0 0;">Pour le client, sans jargon.</p>
        </div>
        <span class="bf-bscore bscore-${business.businessScore}">${escapeHtml(scoreLabel)}</span>
      </div>
      <div class="bf-fams">${famHtml}</div>
      ${lostHtml}
    </section>`;
  }

  function fillReport(audit) {
    const scores = audit.scores || {};
    const scoresEl = document.getElementById('scores');
    scoresEl.innerHTML = SCORE_LABELS.map(([key, label]) => {
      const v = scores[key];
      return `<div class="score-card ${scoreColor(v)}"><div class="num">${v == null ? '—' : v}</div><div class="label">${label}</div></div>`;
    }).join('');

    const vitals = audit.vitals || {};
    const vitalsEl = document.getElementById('vitals');
    vitalsEl.innerHTML = VITAL_LABELS.map(([key, label]) => {
      const v = vitals[key];
      return `<div class="vital ${vitalColor(key, v)}"><div class="v-label">${label}</div><div class="v-value">${v || '—'}</div></div>`;
    }).join('');

    document.getElementById('reportUrl').textContent = audit.url;
    document.getElementById('reportDate').textContent = audit.date ? new Date(audit.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    document.getElementById('pitchText').textContent = audit.pitch || '';

    const summaryEl = document.getElementById('summary');
    summaryEl.innerHTML = summaryHtml(audit.summary);

    const briefEl = document.getElementById('businessBrief');
    briefEl.innerHTML = businessBriefHtml(audit.business);

    const cmpEl = document.getElementById('compareWrap');
    cmpEl.innerHTML = compareHtml(audit.compare || null);

    const hasCategories = Array.isArray(audit.categories) && audit.categories.length;
    const catEl = document.getElementById('categorySections');
    const catWrap = document.getElementById('catWrap');
    const issuesEl = document.getElementById('issues');
    const oppEl = document.getElementById('opportunities');

    if (hasCategories) {
      catEl.innerHTML = categoriesHtml(audit.categories);
      catWrap.removeAttribute('open');
      issuesEl.closest('.legacy-block').style.display = 'none';
      oppEl.closest('.legacy-block').style.display = 'none';
    } else {
      catWrap.removeAttribute('open');
      issuesEl.closest('.legacy-block').style.display = '';
      oppEl.closest('.legacy-block').style.display = '';
      const issues = audit.issues || [];
      if (!issues.length) {
        issuesEl.innerHTML = '<p style="font-size:13px;color:var(--ink-light);">Aucun problème majeur détecté sur les critères techniques standards.</p>';
      } else {
        issuesEl.innerHTML = issues.map(i =>
          `<div class="issue"><div class="i-title">${escapeHtml(i.title)}</div><div class="i-desc">${escapeHtml(i.description)}</div></div>`
        ).join('');
      }

      const opps = audit.opportunities || [];
      if (!opps.length) {
        oppEl.innerHTML = '<p style="font-size:13px;color:var(--ink-light);">Aucun problème technique majeur détecté.</p>';
      } else {
        oppEl.innerHTML = opps.map(oppRow).join('');
      }
    }

    const content = audit.content || {};
    const findings = content.findings || [];
    const cEl = document.getElementById('contentCheck');
    if (content.fetchFailed) {
      cEl.innerHTML = '<p style="font-size:13px;color:var(--ink-light);">Contenu de la page illisible (bloqué ou indisponible) — analyse de conversion non disponible.</p>';
    } else if (!findings.length) {
      cEl.innerHTML = '<p style="font-size:13px;color:var(--ink-light);">Aucune donnée de contenu.</p>';
    } else {
      cEl.innerHTML = `<div class="ckPanel">${findings.map(findingRow).join('')}</div>`;
    }

    document.getElementById('report').classList.add('show');
  }

  function buildCopyText(audit) {
    const scores = audit.scores || {};
    const scoreStr = SCORE_LABELS
      .map(([k, label]) => scores[k] != null ? label + ': ' + scores[k] : '')
      .filter(Boolean)
      .join(' · ');

    const opps = (audit.opportunities || []).slice(0, 3)
      .map(o => `- ${o.label || o.title}${o.figure ? ` (${o.figure})` : ''}`)
      .join('\n');

    const findings = (audit.content && audit.content.findings || []).filter(f => !f.ok).slice(0, 4)
      .map(f => `- ${f.label}`)
      .join('\n');

    const convAngle = (audit.content && audit.content.conversionAngle) || null;

    const summary = (audit.summary || []).slice(0, 4).map(s => `- ${s.text}`).join('\n');

    let out = `Audit de ${audit.url}\n${scoreStr}\n\n${audit.pitch || ''}`;
    if (audit.impact) out += `\n\n${audit.impact}`;
    if (summary) out += `\n\nPoints clés :\n${summary}`;
    if (opps) out += `\n\nOpportunités les plus rentables :\n${opps}`;
    if (findings) out += `\n\nLeviers contenu/conversion :\n${findings}`;
    if (convAngle) out += `\n\n${convAngle}`;
    return out;
  }

  function buildEmailText(audit) {
    const scores = audit.scores || {};

    const strengths = [];
    const every = (audit.content && audit.content.findings || []).filter(f => f.ok);
    for (const f of every) strengths.push(f.label);
    if (scores.seo != null && scores.seo >= 90) strengths.push(`Présence SEO solide (${scores.seo}/100)`);
    if (scores.accessibility != null && scores.accessibility >= 90) strengths.push(`Bon niveau d'accessibilité (${scores.accessibility}/100)`);
    if (scores.bestPractices != null && scores.bestPractices >= 90) strengths.push(`Conformité technique (bonnes pratiques ${scores.bestPractices}/100)`);

    const improvements = [];
    const opps = (audit.opportunities || []).slice(0, 4);
    for (const o of opps) improvements.push(o.figure ? `${o.label} (${o.figure})` : o.label);
    const bad = (audit.content && audit.content.findings || []).filter(f => !f.ok);
    for (const f of bad) improvements.push(f.label);
    if (scores.performance != null && scores.performance < 90) improvements.push(`Performance mobile à renforcer (${scores.performance}/100)`);
    if (scores.seo != null && scores.seo < 80) improvements.push(`Référencement à optimiser (${scores.seo}/100)`);
    if (scores.accessibility != null && scores.accessibility < 80) improvements.push(`Accessibilité à améliorer (${scores.accessibility}/100)`);

    const uniqueS = [...new Set(strengths)];
    const uniqueI = [...new Set(improvements)].slice(0, 6);

    const convAngle = (audit.content && audit.content.conversionAngle) || null;

    let lines = [];
    lines.push(`Objet : Diagnostic gratuit du site ${audit.url}`);
    lines.push('');
    lines.push('Bonjour,');
    lines.push('');
    lines.push(`Nous avons réalisé un audit technique gratuit de <${audit.url}>. En voici la synthèse.`);
    lines.push('');

    if (uniqueS.length) {
      lines.push('Points forts :');
      for (const s of uniqueS.slice(0, 5)) lines.push(`• ${s}`);
      lines.push('');
    }

    if (uniqueI.length) {
      lines.push('Axes d\'amélioration constatés :');
      for (const i of uniqueI) lines.push(`• ${i}`);
      lines.push('');
    }

    lines.push(audit.pitch || `Le site ${scores.performance != null ? `obtient ${scores.performance}/100 en performance` : 'présente des marges de progression'}, ce qui pèse sur l'expérience visiteur et le référencement.`);
    lines.push('');

    const summary = (audit.summary || []).slice(0, 4).map(s => `• ${s.text}`);
    if (summary.length) {
      lines.push('Ce qui ressort du diagnostic :');
      for (const s of summary) lines.push(s);
      lines.push('');
    }

    if (convAngle) {
      lines.push(convAngle);
      lines.push('');
    }

    lines.push('N\'hésitez pas si vous souhaitez en savoir plus ou recevoir un plan d\'amélioration.');
    lines.push('');
    lines.push('Cordialement,');
    lines.push('L\'équipe AlexBuild');

    return lines.join('\n');
  }

  function buildStakes(audit) {
    const s = audit.scores || {};
    const v = audit.vitals || {};
    const stakes = [];
    const perf = s.performance;
    if (perf != null && perf < 90) {
      stakes.push(v.lcp
        ? `La lenteur d'affichage (contenu principal après ${v.lcp}) fait perdre une grande part des visiteurs sur mobile.`
        : `La lenteur d'affichage fait perdre une grande part des visiteurs sur mobile.`);
    }
    if (s.seo != null && s.seo < 80) {
      stakes.push(`La majorité des clics vont aux sites en première page de Google : une faible visibilité limite les demandes reçues.`);
    }
    if (s.accessibility != null && s.accessibility < 80) {
      stakes.push(`Une expérience difficile sur mobile peut écarter une partie des visiteurs avant tout contact.`);
    }
    if (!stakes.length) {
      stakes.push(`Aucun frein technique majeur : la concurrence se joue sur le contenu, la conversion et l'image perçue sur mobile.`);
    }
    return stakes.slice(0, 3);
  }

  function buildClientReportHtml(audit) {
    const scores = audit.scores || {};
    const vitals = audit.vitals || {};
    const opps = audit.opportunities || [];
    const content = audit.content || {};
    const goodFindings = (content.findings || []).filter(f => f.ok).slice(0, 4);
    const badFindings = (content.findings || []).filter(f => !f.ok).slice(0, 4);

    const scoreCard = (label, val) =>
      `<div class="cr-score"><div class="cr-score-num ${scoreColor(val)}">${val == null ? '—' : val}</div><div class="cr-score-label">${escapeHtml(label)}</div></div>`;
    const vitalRow = (label, val) => `<div class="cr-vital"><span>${label}</span><b>${escapeHtml(val || '—')}</b></div>`;

    const oppsHtml = opps.length ? `<h3>Priorités d'amélioration</h3>` + opps.slice(0, 4).map(o => {
      const label = o.label || o.title || '';
      return `<div class="cr-opp">
        <span class="prio ${prioClass(o.prio)}">${escapeHtml(o.prio || '')}</span>
        <div class="cr-opp-body">
          <div class="cr-opp-title">${escapeHtml(label)}</div>
          ${o.figure ? `<div class="cr-opp-figure">${escapeHtml(o.figure)}</div>` : ''}
          ${o.impact ? `<div class="cr-opp-impact">${escapeHtml(o.impact)}</div>` : ''}
        </div>
      </div>`;
    }).join('') : '';

    const summary = audit.summary || [];
    const summaryHtml = summary.length ? `<section class="cr-summary">
      <div class="cr-stakes-label">Ce qui saute aux yeux</div>
      <ul>` + summary.map(s => `<li class="kpi-${s.severity}">${escapeHtml(s.text)}</li>`).join('') + `</ul>
    </section>` : '';

    const catArr = (Array.isArray(audit.categories) ? audit.categories : []);
    const catsHtml = catArr.length ? `<h3>Analyse par domaine</h3><div class="cr-cat-panel">` + catArr.map(c => {
      const score = c.score;
      const scoreCls = score == null ? 'na' : score >= 90 ? 'good' : score >= 50 ? 'mid' : 'bad';
      const scoreBadge = score != null ? `<b class="cr-cat-score ${scoreCls}">${score}</b>` : '';
      const body = (c.issues && c.issues.length)
        ? c.issues.map(i => `<li>${escapeHtml(i.title)}${i.figure ? ` <span class="cr-cat-fig">(${escapeHtml(i.figure)})</span>` : ''}</li>`).join('')
        : `<li class="cr-cat-none">Aucun problème détecté.</li>`;
      return `<div class="cr-cat">
        <div class="cr-cat-head"><span>${escapeHtml(c.label)}</span>${scoreBadge}</div>
        <ul class="cr-cat-list">${body}</ul>
      </div>`;
    }).join('') + `</div>` : '';

    const stakesHtml = `<section class="cr-stakes">
      <div class="cr-stakes-label">Enjeux</div>
      <ul>` + buildStakes(audit).map(st => `<li>${escapeHtml(st)}</li>`).join('') + `</ul>
    </section>`;

    const biz = audit.business || {};
    const fams = Array.isArray(biz.families) ? biz.families : [];
    const famsHtml = fams.length ? `<div class="cr-fams">` + fams.map(f => {
      const top = f.topIssue ? `<div class="cr-fam-top">${escapeHtml(f.topIssue.title)}</div>` : '';
      return `<div class="cr-fam cr-fam-${f.color || 'na'}">
        <div class="cr-fam-name">${escapeHtml(f.label)}</div>
        <div class="cr-fam-note">${escapeHtml(f.note)}${f.score != null ? ` · ${f.score}/100` : ''}</div>
        ${top}
      </div>`;
    }).join('') + `</div>` : '';
    const crLost = (biz.lostLeads && biz.lostLeads.enabled && biz.lostLeads.estLostPerMonth > 0)
      ? `<p class="cr-lost"><b>~${biz.lostLeads.estLostPerMonth} leads potentiels par mois</b> perdus liés à la lenteur mobile (estimation indicative).</p>` : '';
    const crBrief = ((famsHtml || crLost) ? `<section class="cr-brief"><div class="cr-stakes-label">En bref</div>${famsHtml}${crLost}</section>` : '');

    let findingsHtml = '';
    if (content.findings && content.findings.length) {
      const good = goodFindings.map(findingLi).join('');
      const bad = badFindings.map(findingLi).join('');
      findingsHtml = `<h3>Contenu &amp; conversion</h3><ul class="cr-checklist"><div class="cr-col"><h4>Points positifs</h4>${good || '<li>—</li>'}</div><div class="cr-col"><h4>Pistes à travailler</h4>${bad || '<li>—</li>'}</div></ul>`;
    } else if (content.fetchFailed) {
      findingsHtml = `<h3>Contenu &amp; conversion</h3><p class="cr-note">Analyse du contenu indisponible (page bloquée).</p>`;
    }

    return `
      <div class="cr-wrap">
        <header class="cr-head">
          <div class="cr-brand">AlexBuild <span>/</span> audit</div>
          <div class="cr-brand-sub">Diagnostic technique gratuit</div>
        </header>

        <section class="cr-title">
          <h1>Rapport d'audit</h1>
          <p>Site : <b>${escapeHtml(audit.url)}</b></p>
          <p class="cr-date">Audit réalisé le ${fmtAuditDate(audit)}</p>
        </section>

        <section class="cr-scores">
          ${scoreCard('Performance', scores.performance)}
          ${scoreCard('SEO (Lighthouse)', scores.seo)}
          ${scoreCard('Accessibilité', scores.accessibility)}
          ${scoreCard('Bonnes pratiques', scores.bestPractices)}
        </section>

        <section class="cr-vitals">
          ${vitalRow('LCP — contenu principal', vitals.lcp)}
          ${vitalRow('CLS — stabilité', vitals.cls)}
          ${vitalRow('TBT — réactivité', vitals.tbt)}
          ${vitalRow('FCP — premier affichage', vitals.fcp)}
          ${vitalRow('INP — interactivité', vitals.inp)}
        </section>

        ${audit.pitch ? `<section class="cr-pitch">${escapeHtml(audit.pitch)}</section>` : ''}

        ${crBrief}

        ${summaryHtml}

        ${stakesHtml}

        ${catsHtml}

        ${oppsHtml}

        ${findingsHtml}

        <div class="cr-disclaimer">Analyse automatisée basée sur les données disponibles au moment de l'audit.</div>
        <footer class="cr-foot">Rapport généré via l'API Google PageSpeed Insights — AlexBuild · dev@alexbuild.fr</footer>
      </div>
    `;
  }

  window.Report = {
    fill: fillReport,
    buildCopyText: buildCopyText,
    buildEmailText: buildEmailText,
    buildClientReportHtml: buildClientReportHtml,
    scoreClass: scoreClass,
    scoreColor: scoreColor,
    escapeHtml: escapeHtml
  };
})();