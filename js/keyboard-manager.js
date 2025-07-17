export class KeyboardManager {
    constructor() {
        this.container = document.getElementById('keyboard-container');
        this.keyMap = new Map();
        this.createKeyboard();
    }

    createKeyboard() {
        const keyboardDiv = document.createElement('div');
        keyboardDiv.classList.add('keyboard');

        const noteDetails = this.getNoteDetails();
        const whiteKeyWidth = 100 / 52;
        const blackKeyWidth = whiteKeyWidth * 0.6;
        let whiteKeyPosition = 0;

        noteDetails.forEach(detail => {
            const keyEl = document.createElement('div');
            keyEl.classList.add('key', detail.type);
            keyEl.dataset.note = detail.note;

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('key-name');
            const noteName = detail.note.slice(0, -1);
            
            if (detail.type === 'white') {
                keyEl.style.width = `${whiteKeyWidth}%`;
                keyEl.style.left = `${whiteKeyPosition * whiteKeyWidth}%`;
                whiteKeyPosition++;
                nameSpan.textContent = noteName === 'C' ? detail.note : noteName;
                keyEl.appendChild(nameSpan);
                if (detail.note === 'C4') keyEl.classList.add('middle-c');
            } else { 
                keyEl.style.width = `${blackKeyWidth}%`;
                keyEl.style.left = `${(whiteKeyPosition * whiteKeyWidth) - (blackKeyWidth / 2)}%`;
                const names = this.getBlackKeyNames(noteName);
                nameSpan.innerHTML = `${names.sharp}♯<br>${names.flat}♭`;
                keyEl.appendChild(nameSpan);
            }

            keyboardDiv.appendChild(keyEl);
            this.keyMap.set(detail.note, keyEl);
        });

        this.container.appendChild(keyboardDiv);
    }
    
    setKeyState(noteName, state) {
        const key = this.keyMap.get(noteName);
        if (!key) return;

        // Clear previous actionable states (orange, green, red)
        key.classList.remove('orange', 'green', 'red');

        switch (state) {
            case 'correct':
                key.classList.add('green');
                break;
            case 'incorrect':
                key.classList.add('red');
                // Use a timeout to remove the red flash, ensuring the key returns to neutral
                setTimeout(() => key.classList.remove('red'), 300);
                break;
            case 'pressed':
                key.classList.add('orange');
                break;
            case 'next':
                key.classList.add('blue');
                break;
            case 'off':
                // The initial remove handled this.
                break;
        }
    }

    clearAllHighlights(className) {
        this.keyMap.forEach(keyEl => keyEl.classList.remove(className));
    }

    getNoteDetails() {
        const notes = [];
        const blackKeys = ['A#', 'C#', 'D#', 'F#', 'G#'];
        const allNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        let keyCount = 0;
        for (let octave = 0; octave <= 8; octave++) {
            for (const noteName of allNotes) {
                if (keyCount >= 88) break;
                if (octave === 0 && !['A', 'A#', 'B'].includes(noteName)) continue;
                if (octave === 8 && noteName !== 'C') continue;
                notes.push({ note: noteName + octave, type: blackKeys.includes(noteName) ? 'black' : 'white' });
                keyCount++;
            }
        }
        return notes;
    }

    getBlackKeyNames(noteName) {
        const map = { 'C#': 'D', 'D#': 'E', 'F#': 'G', 'G#': 'A', 'A#': 'B' };
        return { sharp: noteName.charAt(0), flat: map[noteName] };
    }
}