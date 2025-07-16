// This module creates and controls the virtual keyboard UI.

export class KeyboardManager {
    constructor() {
        this.container = document.getElementById('keyboard-container');
        this.keyMap = new Map(); // To store key elements by note name (e.g., "C4")
        this.createKeyboard();
    }

    createKeyboard() {
        const keyboardDiv = document.createElement('div');
        keyboardDiv.classList.add('keyboard');

        const noteDetails = this.getNoteDetails();
        let whiteKeyPosition = 0;

        noteDetails.forEach(detail => {
            const keyEl = document.createElement('div');
            keyEl.classList.add('key', detail.type);
            keyEl.dataset.note = detail.note;

            if (detail.type === 'white') {
                keyEl.style.left = `${whiteKeyPosition * 50}px`;
                whiteKeyPosition++;
            } else { // black
                keyEl.style.left = `${(whiteKeyPosition - 1) * 50 + 35}px`;
            }

            keyboardDiv.appendChild(keyEl);
            this.keyMap.set(detail.note, keyEl);
        });

        this.container.appendChild(keyboardDiv);
    }

    // --- Public API for controlling key colors ---

    highlightNextNote(noteName) {
        this.clearAllHighlights('blue');
        const key = this.keyMap.get(noteName);
        if (key) {
            key.classList.add('blue');
        }
    }

    showCorrectPress(noteName) {
        this.flashKey(noteName, 'green');
    }
    
    showIncorrectPress(noteName) {
        this.flashKey(noteName, 'red');
    }

    setUserPress(noteName, isDown) {
        const key = this.keyMap.get(noteName);
        if (key) {
            isDown ? key.classList.add('orange') : key.classList.remove('orange');
        }
    }

    clearAllHighlights(className) {
        this.keyMap.forEach(keyEl => keyEl.classList.remove(className));
    }

    flashKey(noteName, className) {
        const key = this.keyMap.get(noteName);
        if (key) {
            key.classList.add(className);
            setTimeout(() => key.classList.remove(className), 300);
        }
    }

    getNoteDetails() {
        const notes = [];
        const blackKeys = ['A#', 'C#', 'D#', 'F#', 'G#'];
        const allNotes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];

        // Start with A0, B0
        notes.push({ note: 'A0', type: 'white' }, { note: 'A#0', type: 'black' }, { note: 'B0', type: 'white' });

        // Octaves 1 through 7
        for (let octave = 1; octave <= 7; octave++) {
            allNotes.forEach(noteName => {
                if (octave === 7 && noteName === 'C#') return; // Stop after C8
                const note = noteName + octave;
                const type = blackKeys.includes(noteName) ? 'black' : 'white';
                notes.push({ note, type });
            });
        }
        // Add C8
        notes.push({ note: 'C8', type: 'white' });

        return notes;
    }
}