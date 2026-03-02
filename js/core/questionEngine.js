// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Question Engine
//  Question navigation exists only here
// ═══════════════════════════════════════════════════════════════════════

import { session } from '../core/appState.js';
import { fmtTime } from '../utils/formatUtils.js';

export function nextQuestion() {
  if (!session.active || session.paused || session.mode !== 'perQuestion') return;
  const qTime = Math.floor((Date.now() - session.currentQuestionStart) / 1000);
  session.questions[session.questionIndex] = { number: session.questionIndex + 1, seconds: qTime, skipped: false };
  session.questionIndex++;

  const existingQ = session.questions[session.questionIndex];
  if (existingQ && existingQ.seconds > 0) {
    session.questionElapsed = existingQ.seconds;
    session.currentQuestionStart = Date.now() - (existingQ.seconds * 1000);
  } else {
    session.currentQuestionStart = Date.now();
    session.questionElapsed = 0;
  }
  document.getElementById('questionNumber').textContent = session.questionIndex + 1;
  document.getElementById('questionTimer').textContent = fmtTime(session.questionElapsed);
}

export function skipQuestion() {
  if (!session.active || session.paused || session.mode !== 'perQuestion') return;
  const qTime = Math.floor((Date.now() - session.currentQuestionStart) / 1000);
  session.questions[session.questionIndex] = { number: session.questionIndex + 1, seconds: qTime, skipped: true };
  session.questionIndex++;

  const existingQ = session.questions[session.questionIndex];
  if (existingQ && existingQ.seconds > 0) {
    session.questionElapsed = existingQ.seconds;
    session.currentQuestionStart = Date.now() - (existingQ.seconds * 1000);
  } else {
    session.currentQuestionStart = Date.now();
    session.questionElapsed = 0;
  }
  document.getElementById('questionNumber').textContent = session.questionIndex + 1;
  document.getElementById('questionTimer').textContent = fmtTime(session.questionElapsed);
}

export function prevQuestion() {
  if (!session.active || session.paused || session.mode !== 'perQuestion') return;
  if (session.questionIndex <= 0) return;

  const curQTime = Math.floor((Date.now() - session.currentQuestionStart) / 1000);
  session.questions[session.questionIndex] = { number: session.questionIndex + 1, seconds: curQTime, skipped: false };

  session.questionIndex--;

  const prevQ = session.questions[session.questionIndex];
  if (!prevQ) return;
  session.questionElapsed = prevQ.seconds;
  session.currentQuestionStart = Date.now() - (prevQ.seconds * 1000);

  document.getElementById('questionNumber').textContent = session.questionIndex + 1;
  document.getElementById('questionTimer').textContent = fmtTime(prevQ.seconds);
}
