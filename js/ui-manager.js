const VF = Vex.Flow;

export class UIManager {
    constructor(onNoteClickCallback) {
        this.sheetMusicDiv = document.getElementById('sheet-music-container');
        this.viewerContainer = document.getElementById('viewer-container');
        this.pageTitle = document.querySelector('h1');
        this.vexNotes = [];
        this.onNoteClickCallback = onNoteClickCallback;
        this.sheetMusicDiv.addEventListener('click', this._handleNoteClick.bind(this));
    }

    _handleNoteClick(event) {
        let target = event.target;
        while (target && target !== this.sheetMusicDiv) {
            if (target.id && target.id.startsWith('vf-note-')) {
                // The fix is here: split('-')[2] correctly gets the index number.
                const index = parseInt(target.id.split('-')[2]);
                if (!isNaN(index) && this.onNoteClickCallback) {
                    this.onNoteClickCallback(index);
                }
                return;
            }
            target = target.parentElement;
        }
    }

    showCheckmarkFeedback(noteIndex) {
        const note = this.vexNotes.find(n => n.noteIndex === noteIndex);
        if (!note || !this.viewerContainer) return;

        const noteX = note.getAbsoluteX() + this.sheetMusicDiv.offsetLeft - this.sheetMusicDiv.scrollLeft;
        const noteY = note.getStave().getYForTopText() - 20;

        const bubble = document.createElement('div');
        bubble.classList.add('feedback-bubble');
        bubble.innerHTML = '✓';
        bubble.style.left = `${noteX}px`;
        bubble.style.top = `${noteY}px`;
        this.viewerContainer.appendChild(bubble);

        setTimeout(() => {
            bubble.style.opacity = '1';
            bubble.style.transform = 'translateY(-20px)';
        }, 10);
        setTimeout(() => {
            bubble.style.opacity = '0';
            setTimeout(() => bubble.remove(), 400);
        }, 500);
    }

    drawSong(songData, highlightedNoteIndex, loopState = {}) {
        this.sheetMusicDiv.innerHTML = '';
        if (this.playhead) this.sheetMusicDiv.appendChild(this.playhead);
        if (!songData || !songData.notes || songData.notes.length === 0) return;

        const { notes, keySignature, timeSignature } = songData;

        this.vexNotes = [];
        const trebleVexNotes = this._getVexNotes(notes, 'right', highlightedNoteIndex, loopState);
        const bassVexNotes = this._getVexNotes(notes, 'left', highlightedNoteIndex, loopState);

        const totalBeats = this._getTotalBeats(notes);
        if (totalBeats === 0) return;

        const voiceConfig = { num_beats: totalBeats, beat_value: 4 };
        const trebleVoice = new VF.Voice(voiceConfig).addTickables(trebleVexNotes);
        const bassVoice = new VF.Voice(voiceConfig).addTickables(bassVexNotes);
        
        const minWidth = new VF.Formatter().joinVoices([trebleVoice, bassVoice]).preCalculateMinTotalWidth([trebleVoice, bassVoice]);
        const totalWidth = minWidth + 200;

        const renderer = new VF.Renderer(this.sheetMusicDiv, VF.Renderer.Backends.SVG);
        renderer.resize(totalWidth, 250);
        const context = renderer.getContext();
        
        const trebleStave = new VF.Stave(10, 40, totalWidth).addClef("treble").addKeySignature(keySignature || 'C').addTimeSignature(timeSignature || '4/4').setContext(context).draw();
        const bassStave = new VF.Stave(10, 140, totalWidth).addClef("bass").addKeySignature(keySignature || 'C').addTimeSignature(timeSignature || '4/4').setContext(context).draw();
        new VF.StaveConnector(trebleStave, bassStave).setType('brace').setContext(context).draw();

        const trebleBeams = VF.Beam.generateBeams(trebleVexNotes.filter(n => !n.isRest()));
        const bassBeams = VF.Beam.generateBeams(bassVexNotes.filter(n => !n.isRest()));

        new VF.Formatter().joinVoices([trebleVoice, bassVoice]).format([trebleVoice, bassVoice], minWidth + 100);
        
        trebleVoice.draw(context, trebleStave);
        bassVoice.draw(context, bassStave);
        
        trebleBeams.forEach(b => b.setContext(context).draw());
        bassBeams.forEach(b => b.setContext(context).draw());
    }

    _getVexNotes(notes, hand, highlightedNoteIndex, loopState) {
        const vexNotes = [];
        notes.forEach((note, index) => {
            const clef = hand === 'left' ? 'bass' : 'treble';
            if (note.hand === hand) {
                const staveNote = new VF.StaveNote({ keys: note.keys, duration: note.duration, clef });
                staveNote.attrs.id = `note-${index}`; 
                
                if (loopState && loopState.enabled && index >= loopState.start && index <= loopState.end) {
                    staveNote.setStyle({ fillStyle: '#D3D3D3', strokeStyle: '#D3D3D3' });
                }
                if (loopState && loopState.selectionMode !== 'inactive' && index === loopState.start) {
                     staveNote.setStyle({ fillStyle: '#FBC02D', strokeStyle: '#FBC02D' });
                }
                if (index === highlightedNoteIndex) {
                    staveNote.setStyle({ fillStyle: 'green', strokeStyle: 'green' });
                }
                staveNote.noteIndex = index;
                vexNotes.push(staveNote);
                if (!staveNote.isRest()) this.vexNotes.push(staveNote);
            } else {
                const restKey = hand === 'left' ? "d/3" : "b/4";
                vexNotes.push(new VF.StaveNote({ keys: [restKey], duration: note.duration + 'r' }));
            }
        });
        return vexNotes;
    }

    _getTotalBeats(notes) {
        const beatValues = { 'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25, '32': 0.125 };
        return notes.reduce((total, note) => {
            const duration = note.duration.replace('d', '');
            let beatValue = beatValues[duration] || 0;
            if (note.duration.includes('d')) beatValue *= 1.5;
            return total + beatValue;
        }, 0);
    }

    scrollToNote(noteIndex) {
        if (noteIndex < 0) {
            this.sheetMusicDiv.scrollLeft = 0;
            return;
        }
        const noteToScrollTo = this.vexNotes.find(n => n.noteIndex === noteIndex);
        if (!noteToScrollTo) return;
        if (typeof noteToScrollTo.getAbsoluteX === 'function') {
            const noteX = noteToScrollTo.getAbsoluteX();
            if (this.sheetMusicDiv.parentElement) {
                const playheadOffset = this.sheetMusicDiv.parentElement.clientWidth * 0.4;
                this.sheetMusicDiv.scrollLeft = noteX - playheadOffset;
            }
        }
    }
}