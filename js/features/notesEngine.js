// ═══════════════════════════════════════════════════════════════════════
//  FOCUS ENGINE — Notes Engine (Session Notes CRUD)
// ═══════════════════════════════════════════════════════════════════════

import { state } from '../core/appState.js';
import { DB } from '../services/storageService.js';
import { Firebase } from '../services/firebaseService.js';
import { toast } from '../ui/toastController.js';
import { renderPersonal } from './notesFeature.js';

export function toggleNoteExpand(id) {
  const card = document.querySelector(`.note-card[data-note-id="${id}"]`);
  if (card) card.classList.toggle('expanded');
}

export function openEditNote(id) {
  const note = state.sessionNotes.find(n => n.id === id);
  if (!note) return;

  const input = document.getElementById('editNoteText');
  const subjectEl = document.getElementById('editNoteSubject');
  const topicEl = document.getElementById('editNoteTopic');
  const hiddenId = document.getElementById('editNoteId');

  if (input) input.value = note.text;
  if (subjectEl) subjectEl.value = note.subject || '';
  if (topicEl) topicEl.value = note.topic || '';
  if (hiddenId) hiddenId.value = note.id;

  document.getElementById('sheetBackdrop').classList.add('active');
  document.getElementById('sheetEditNote').classList.add('active');
}

export function closeNoteModal() {
  const sheet = document.getElementById('sheetEditNote');
  if (sheet) {
    sheet.classList.add('closing');
    const cleanup = () => {
      sheet.classList.remove('active', 'closing');
    };
    sheet.addEventListener('animationend', cleanup, { once: true });
    setTimeout(cleanup, 350);
  }
  document.getElementById('sheetBackdrop').classList.remove('active');
}

export async function saveEditNote() {
  const id = document.getElementById('editNoteId').value;
  const text = document.getElementById('editNoteText').value.trim();
  const topic = document.getElementById('editNoteTopic').value.trim();

  if (!id || !text) {
    toast('Note text cannot be empty');
    return;
  }

  const note = state.sessionNotes.find(n => n.id === id);
  if (!note) return;

  note.text = text;
  if (topic) note.topic = topic;

  DB.save();
  await Firebase.updateDoc('sessionNotes', id, { text: note.text, topic: note.topic });

  closeNoteModal();
  renderPersonal();
  toast('Note updated', 'success');
}

export async function deleteSessionNote(id) {
  if (!confirm('Delete this note?')) return;

  state.sessionNotes = state.sessionNotes.filter(n => n.id !== id);
  DB.save();
  await Firebase.deleteDoc('sessionNotes', id);

  renderPersonal();
  toast('Note deleted');
}
