// This file will handle all updates to the DOM.

export class UIManager {
    constructor() {
        this.sheetMusicDiv = document.getElementById('sheet-music-container');
    }

    drawSong(notes, highlightedNoteIndex) {
        this.sheetMusicDiv.innerHTML = '';
        if (!notes || notes.length === 0) return;

        // Correctly access the VexFlow library from the global scope
        const VF = Vex.Flow;

        const renderer = new VF.Renderer(this.sheetMusicDiv, VF.Renderer.Backends.SVG);
        renderer.resize(500, 150);
        const context = renderer.getContext();
        const stave = new VF.Stave(10, 40, 480); // Made stave wider

        stave.addClef("treble").addTimeSignature("4/4");
        stave.setContext(context).draw();

        const staveNotes = notes.map((note, index) => {
            const staveNote = new VF.StaveNote(note);
            if (index === highlightedNoteIndex) {
                staveNote.setStyle({ fillStyle: 'green' });
            }
            return staveNote;
        });

        // Use a helper to automatically format and draw the notes.
        VF.Formatter.FormatAndDraw(context, stave, staveNotes);

        console.log(`Sheet music drawn, highlighting note ${highlightedNoteIndex}`);
    }

    updateVideoTime(time) {
        // TODO: Sync video playback with music.
    }
}