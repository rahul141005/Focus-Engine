// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Modal Controller (Bottom Sheets)
// ═══════════════════════════════════════════════════════════════════════

import { state } from '../core/appState.js';

export function openSheet(id) {
  document.getElementById('sheetBackdrop').classList.add('active');
  document.getElementById(id).classList.add('active');
}

export function closeSheet() {
  const activeSheet = document.querySelector('.bottom-sheet.active');
  if (activeSheet) {
    activeSheet.classList.add('closing');
    const cleanup = () => {
      activeSheet.classList.remove('active', 'closing');
    };
    activeSheet.addEventListener('animationend', cleanup, { once: true });
    setTimeout(cleanup, 350);
  }
  document.getElementById('sheetBackdrop').classList.remove('active');
  state.currentDayId = null;
  state.reassignTaskId = null;
}
