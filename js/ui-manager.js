// This file will handle all updates to the DOM.

export class UIManager {
    constructor() {
        this.sheetMusicDiv = document.getElementById('sheet-music-container');
    }

    drawSong(notes, highlightedNoteIndex) {
        this.sheetMusicDiv.innerHTML = '';
        if (!notes || notes.length === 0) return;

        const VF = Vex.Flow;
        const renderer = new VF.Renderer(this.sheetMusicDiv, VF.Renderer.Backends.SVG);
        renderer.resize(520, 250);
        const context = renderer.getContext();

        // --- Create and connect the staves ---
        const trebleStave = new VF.Stave(20, 40, 480).addClef("treble").addTimeSignature("4/4");
        const bassStave = new VF.Stave(20, 140, 480).addClef("bass").addTimeSignature("4/4");

        new VF.StaveConnector(trebleStave, bassStave).setType('brace').setContext(context).draw();
        new VF.StaveConnector(trebleStave, bassStave).setType('singleLeft').setContext(context).draw();
        new VF.StaveConnector(trebleStave, bassStave).setType('singleRight').setContext(context).draw();

        trebleStave.setContext(context).draw();
        bassStave.setContext(context).draw();

        // --- Build two voices, inserting rests for the non-playing hand ---
        const trebleVexNotes = [];
        const bassVexNotes = [];

        notes.forEach((note, index) => {
            const isHighlighted = index === highlightedNoteIndex;
            const style = isHighlighted ? { fillStyle: 'green' } : undefined;

            if (note.hand === 'right') {
                const staveNote = new VF.StaveNote({ keys: note.keys, duration: note.duration });
                if (isHighlighted) { staveNote.setStyle(style); }
                trebleVexNotes.push(staveNote);
                bassVexNotes.push(new VF.StaveNote({ keys: ["d/3"], duration: note.duration + 'r' }));
            } else if (note.hand === 'left') {
                const staveNote = new VF.StaveNote({ keys: note.keys, duration: note.duration, clef: 'bass' });
                if (isHighlighted) { staveNote.setStyle(style); }
                bassVexNotes.push(staveNote);
                trebleVexNotes.push(new VF.StaveNote({ keys: ["b/4"], duration: note.duration + 'r' }));
            }
        });

        // --- Create voices from the notes and rests ---
        const trebleVoice = new VF.Voice().setMode(VF.Voice.Mode.SOFT).addTickables(trebleVexNotes);
        const bassVoice = new VF.Voice().setMode(VF.Voice.Mode.SOFT).addTickables(bassVexNotes);

        // --- Format and draw both voices together ---
        const voices = [trebleVoice, bassVoice];
        new VF.Formatter().joinVoices(voices).format(voices, 400);
        
        trebleVoice.draw(context, trebleStave);
        bassVoice.draw(context, bassStave);

        console.log(`Grand staff drawn, highlighting note ${highlightedNoteIndex}`);
    }

    updateVideoTime(time) {
        // TODO: Sync video playback with music.
    }
}