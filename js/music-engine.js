// This is the brain of the application.

export class MusicEngine {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.song = null;
        this.currentNoteIndex = 0;
        this.playbackState = 'waiting'; // 'stopped', 'playing', 'paused', 'waiting'
    }

    loadSong(song) {
        this.song = song;
        this.currentNoteIndex = 0;
        this.uiManager.drawSong(this.song, this.currentNoteIndex);
        console.log("Song loaded and first note highlighted.");
    }

    handleNoteInput(midiNote, velocity) {
        console.log(`MusicEngine received MIDI note: ${midiNote}`);

        if (this.playbackState !== 'waiting' || !this.song) {
            return;
        }

        const expectedNote = this.song[this.currentNoteIndex];
        const playedNoteName = this.midiToVexflow(midiNote);

        const expectedNoteName = expectedNote.keys[0].split('/')[0];

        if (playedNoteName.startsWith(expectedNoteName)) {
            console.log("Correct note played!");
            this.currentNoteIndex++;
            if (this.currentNoteIndex >= this.song.length) {
                console.log("Song finished!");
                this.playbackState = 'stopped';
                // Redraw one last time to show no highlight
                this.uiManager.drawSong(this.song, -1); // -1 means no highlight
                return;
            }
            // Redraw the song with the new note highlighted
            this.uiManager.drawSong(this.song, this.currentNoteIndex);
        } else {
            console.log(`Incorrect note. Expected ${expectedNoteName}, but got ${playedNoteName}`);
        }
    }

    // Helper to convert MIDI number to VexFlow note name (e.g., 60 -> "c/4")
    midiToVexflow(midiNote) {
        const noteNames = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return `${noteName}/${octave}`;
    }
}