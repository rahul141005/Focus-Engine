// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Progress Feature
// ═══════════════════════════════════════════════════════════════════════

import { state } from '../core/appState.js';
import { SUBJECT_COLORS, CONSISTENCY_WEIGHT, ENCOURAGEMENTS } from '../config/constants.js';
import { fmtTime, fmtHHMM } from '../utils/formatUtils.js';
import { todayStr, parseLocalDate } from '../utils/timeUtils.js';

export function renderProgress() {
  const today = new Date();
  const last7 = Array.from({length:7}, (_,i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6-i));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  const recent = state.sessions.filter(s => last7.includes(s.session_date));

  const activeDays = new Set(recent.map(s => s.session_date)).size;
  const consistency = Math.round((activeDays / 7) * 100);

  const totalSecs = recent.reduce((a,s) => a + (s.duration_seconds||0), 0);
  const totalMins = Math.floor(totalSecs / 60);

  document.getElementById('metricConsistency').textContent = `${consistency}%`;
  document.getElementById('metricConsistencySub').textContent = `${activeDays} of 7 days`;
  document.getElementById('metricTotal').textContent = fmtHHMM(totalMins);
  document.getElementById('metricSessions').textContent = recent.length;
  document.getElementById('metricAvg').textContent = activeDays > 0 ? fmtHHMM(Math.round(totalMins/activeDays)) : '00:00';

  const weekBars = document.getElementById('weekBars');
  weekBars.innerHTML = last7.map((date, i) => {
    const dayMins = state.sessions
      .filter(s => s.session_date === date)
      .reduce((a,s) => a + Math.floor((s.duration_seconds||0)/60), 0);
    const maxMins = 240;
    const pct = Math.min(100, Math.round((dayMins / maxMins) * 100));
    const d = parseLocalDate(date);
    const label = ['S','M','T','W','T','F','S'][d.getDay()];
    const isToday = date === todayStr();
    return `<div class="week-day-col">
      <div class="week-bar">
        <div class="week-bar-fill" style="height:${pct}%;${isToday?'background:linear-gradient(180deg,#f59e0b,rgba(245,158,11,0.5))':''}"></div>
      </div>
      <div class="week-day-label" style="${isToday?'color:var(--indigo);font-weight:600':''}">${label}</div>
    </div>`;
  }).join('');

  const subjectSecs = {};
  recent.forEach(s => {
    subjectSecs[s.subject] = (subjectSecs[s.subject]||0) + (s.duration_seconds||0);
  });

  const totalSubSecs = Object.values(subjectSecs).reduce((a,b)=>a+b, 0);
  const subDist = document.getElementById('subjectDist');

  if (totalSubSecs === 0) {
    subDist.innerHTML = '<div style="font-size:13px;color:var(--text-3);text-align:center;padding:10px 0">No sessions yet</div>';
  } else {
    subDist.innerHTML = Object.entries(subjectSecs)
      .sort(([,a],[,b]) => b-a)
      .map(([subj, secs]) => {
        const color = SUBJECT_COLORS[subj] || SUBJECT_COLORS.Other;
        const pct = Math.round((secs / totalSubSecs) * 100);
        return `<div class="dist-row">
          <div class="dist-subject">${subj}</div>
          <div class="dist-bar-wrap">
            <div class="dist-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <div class="dist-pct">${pct}%</div>
        </div>`;
      }).join('');
  }

  const analyticsEl = document.getElementById('subjectAnalytics');
  if (analyticsEl) {
    if (state.questionAnalytics.length === 0) {
      analyticsEl.innerHTML = '<div style="font-size:13px;color:var(--text-3);text-align:center;padding:10px 0">No per-question data yet</div>';
    } else {
      const subjData = {};
      state.questionAnalytics.forEach(qa => {
        const subj = qa.subject;
        if (!subjData[subj]) subjData[subj] = { topics: {}, totalQ: 0, totalSecs: 0, sessions: 0 };
        subjData[subj].totalQ += qa.questions.length;
        subjData[subj].totalSecs += qa.questions.reduce((a, q) => a + q.seconds, 0);
        subjData[subj].sessions++;

        const topicName = qa.topic || 'General';
        if (!subjData[subj].topics[topicName]) {
          subjData[subj].topics[topicName] = { totalQ: 0, totalSecs: 0, sessions: 0, history: [] };
        }
        const td = subjData[subj].topics[topicName];
        td.totalQ += qa.questions.length;
        td.totalSecs += qa.questions.reduce((a, q) => a + q.seconds, 0);
        td.sessions++;
        td.history.push({ date: qa.date, questions: qa.questions.length, avgSecs: qa.questions.length > 0 ? Math.round(qa.questions.reduce((a, q) => a + q.seconds, 0) / qa.questions.length) : 0 });
      });

      analyticsEl.innerHTML = Object.entries(subjData).map(([subj, data]) => {
        const color = SUBJECT_COLORS[subj] || SUBJECT_COLORS.Other;
        const avgPerQ = data.totalQ > 0 ? Math.round(data.totalSecs / data.totalQ) : 0;
        const safeKey = encodeURIComponent(subj).replace(/[^a-zA-Z0-9]/g, '_');

        const topicsHtml = Object.entries(data.topics).map(([topic, tData]) => {
          const topicKey = safeKey + '_' + encodeURIComponent(topic).replace(/[^a-zA-Z0-9]/g, '_');
          const tAvg = tData.totalQ > 0 ? Math.round(tData.totalSecs / tData.totalQ) : 0;
          const historyHtml = tData.history.map(h =>
            `<div class="analytics-history-row"><span class="analytics-history-date">${h.date}</span><span class="analytics-history-stat">${h.questions}Q · avg ${fmtTime(h.avgSecs)}</span></div>`
          ).join('');

          return `<div class="topic-analytics-item" id="ta-${topicKey}">
            <div class="topic-analytics-header" onclick="document.getElementById('ta-${topicKey}').classList.toggle('expanded')">
              <svg class="topic-analytics-arrow" viewBox="0 0 24 24"><polyline points="9,6 15,12 9,18"/></svg>
              <div class="topic-analytics-name">${topic}</div>
            </div>
            <div class="topic-analytics-body">
              <div class="analytics-metric-row">
                <div class="analytics-metric-label">Total Questions</div>
                <div class="analytics-metric-value">${tData.totalQ}</div>
              </div>
              <div class="analytics-metric-row">
                <div class="analytics-metric-label">Avg Time / Question</div>
                <div class="analytics-metric-value">${fmtTime(tAvg)}</div>
              </div>
              <div class="analytics-metric-row">
                <div class="analytics-metric-label">Sessions</div>
                <div class="analytics-metric-value">${tData.sessions}</div>
              </div>
              ${historyHtml ? '<div class="analytics-history-title">History</div>' + historyHtml : ''}
            </div>
          </div>`;
        }).join('');

        return `<div class="subject-analytics-card" id="sa-${safeKey}">
          <div class="subject-analytics-header" onclick="App.toggleSubjectAnalytics('${safeKey}')">
            <div class="subject-analytics-dot" style="background:${color}"></div>
            <div class="subject-analytics-name">${subj}</div>
            <div class="subject-analytics-summary">${data.totalQ}Q · ${fmtTime(avgPerQ)} avg</div>
            <svg class="subject-analytics-chevron" viewBox="0 0 24 24"><polyline points="9,6 15,12 9,18"/></svg>
          </div>
          <div class="subject-analytics-body">
            <div class="analytics-metric-row">
              <div class="analytics-metric-label">Total Questions</div>
              <div class="analytics-metric-value">${data.totalQ}</div>
            </div>
            <div class="analytics-metric-row">
              <div class="analytics-metric-label">Avg Time / Question</div>
              <div class="analytics-metric-value">${fmtTime(avgPerQ)}</div>
            </div>
            <div class="analytics-metric-row">
              <div class="analytics-metric-label">Sessions</div>
              <div class="analytics-metric-value">${data.sessions}</div>
            </div>
            <div class="subject-topics-section">
              <div class="subject-topics-title">Topics</div>
              ${topicsHtml}
            </div>
          </div>
        </div>`;
      }).join('');
    }
  }

  const weekCompEl = document.getElementById('weekComparison');
  if (weekCompEl) {
    const prev7 = Array.from({length:7}, (_,i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (13-i));
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    });
    const prevSessions = state.sessions.filter(s => prev7.includes(s.session_date));
    const prevMins = Math.floor(prevSessions.reduce((a,s) => a + (s.duration_seconds||0), 0) / 60);
    const diff = totalMins - prevMins;
    const diffSign = diff >= 0 ? '+' : '';
    const diffPct = prevMins > 0 ? Math.round((diff / prevMins) * 100) : (totalMins > 0 ? 100 : 0);
    weekCompEl.innerHTML = `
      <div class="week-comp-row"><span>This week</span><span class="week-comp-val">${fmtHHMM(totalMins)}</span></div>
      <div class="week-comp-row"><span>Last week</span><span class="week-comp-val">${fmtHHMM(prevMins)}</span></div>
      <div class="week-comp-row diff"><span>Difference</span><span class="week-comp-val ${diff >= 0 ? 'positive' : 'negative'}">${diffSign}${Math.abs(diffPct)}%</span></div>`;
  }

  const consistScoreEl = document.getElementById('consistencyScore');
  if (consistScoreEl) {
    const dailyMins = last7.map(date =>
      state.sessions.filter(s => s.session_date === date).reduce((a,s) => a + Math.floor((s.duration_seconds||0)/60), 0)
    );
    const mean = dailyMins.reduce((a,b)=>a+b,0) / 7;
    const variance = dailyMins.reduce((a,v)=>a+Math.pow(v-mean,2),0) / 7;
    const stddev = Math.sqrt(variance);
    const score = mean > 0 ? Math.max(0, Math.min(100, Math.round(100 - (stddev / mean) * CONSISTENCY_WEIGHT))) : 0;
    consistScoreEl.textContent = `${score}/100`;
  }

  const enc = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
  document.getElementById('encourageText').textContent = enc;

  const from = parseLocalDate(last7[0]).toLocaleDateString('en-IN', {day:'numeric',month:'short'});
  const to   = parseLocalDate(last7[6]).toLocaleDateString('en-IN', {day:'numeric',month:'short'});
  document.getElementById('progressRange').textContent = `${from} – ${to}`;
}
