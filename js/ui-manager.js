// This file will handle all updates to the DOM.

const VF = Vex.Flow; // Define VF here, making it accessible to all methods

export class UIManager {
    constructor() {
        this.sheetMusicDiv = document.getElementById('sheet-music-container');
        this.playhead = document.getElementById('playhead');
        this.vexNotes = []; // Will store rendered notes to get their positions
    }

    drawSong(notes, highlightedNoteIndex) {
        this.sheetMusicDiv.innerHTML = ''; // Clear previous content
        this.sheetMusicDiv.appendChild(this.playhead); // Re-add playhead

        if (!notes || notes.length === 0) return;

        // 1. Pre-calculate the total width needed
        const formatter = new VF.Formatter();
        // Create temporary voices just for width calculation
        const tempTreble = new VF.Voice().setMode(VF.Voice.Mode.SOFT).addTickables(this._getVexNotes(notes, 'right'));
        const tempBass = new VF.Voice().setMode(VF.Voice.Mode.SOFT).addTickables(this._getVexNotes(notes, 'left'));
        
        const minWidth = formatter.preCalculateMinTotalWidth([tempTreble, tempBass]);
        const totalWidth = minWidth + 200; // Add padding

        // 2. Create a single, wide renderer
        const renderer = new VF.Renderer(this.sheetMusicDiv, VF.Renderer.Backends.SVG);
        renderer.resize(totalWidth, 250);
        const context = renderer.getContext();
        
        // 3. Create single, wide staves
        const trebleStave = new VF.Stave(10, 40, totalWidth).addClef("treble").addTimeSignature("4/4").setContext(context).draw();
        const bassStave = new VF.Stave(10, 140, totalWidth).addClef("bass").addTimeSignature("4/4").setContext(context).draw();
        new VF.StaveConnector(trebleStave, bassStave).setType('brace').setContext(context).draw();

        // 4. Get VexFlow notes, now with highlighting
        this.vexNotes = [];
        const trebleVexNotes = this._getVexNotes(notes, 'right', highlightedNoteIndex);
        const bassVexNotes = this._getVexNotes(notes, 'left', highlightedNoteIndex);

        // 5. Format and draw the voices
        const voices = [
            new VF.Voice().setMode(VF.Voice.Mode.SOFT).addTickables(trebleVexNotes),
            new VF.Voice().setMode(VF.Voice.Mode.SOFT).addTickables(bassVexNotes)
        ];
        new VF.Formatter().joinVoices(voices).format(voices, minWidth);
        voices.forEach(v => {
            // Find the correct stave to draw on
            const stave = v.getTickables()[0]?.clef === 'bass' ? bassStave : trebleStave;
            v.draw(context, stave);
        });
        
        console.log(`Scrolling score drawn, highlighting note ${highlightedNoteIndex}`);
    }

    // Helper to generate VexFlow notes and rests
    _getVexNotes(notes, hand, highlightedNoteIndex = -1) {
        const vexNotes = [];
        notes.forEach((note, index) => {
            const isHighlighted = index === highlightedNoteIndex;
            const style = isHighlighted ? { fillStyle: 'green' } : undefined;
            const clef = hand === 'left' ? 'bass' : 'treble';

            if (note.hand === hand) {
                const staveNote = new VF.StaveNote({ keys: note.keys, duration: note.duration, clef });
                if (isHighlighted) staveNote.setStyle(style);
                vexNotes.push(staveNote);
                // Store a reference back to the original note index
                staveNote.noteIndex = index;
                this.vexNotes.push(staveNote); 
            } else {
                const key = hand === 'left' ? "d/3" : "b/4";
                vexNotes.push(new VF.StaveNote({ keys: [key], duration: note.duration + 'r' }));
            }
        });
        return vexNotes;
    }

    scrollToNote(noteIndex) {
        if (noteIndex < 0) {
            this.sheetMusicDiv.scrollLeft = 0;
            return;
        }

        const noteToScrollTo = this.vexNotes.find(n => n.noteIndex === noteIndex);
        if (!noteToScrollTo || typeof noteToScrollTo.getAbsoluteX !== 'function') return;

        const noteX = noteToScrollTo.getAbsoluteX();
        const playheadOffset = this.sheetMusicDiv.clientWidth * 0.4;
        
        this.sheetMusicDiv.scrollLeft = noteX - playheadOffset;
    }
}