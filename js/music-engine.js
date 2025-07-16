// This is the brain of the application.

export class MusicEngine {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.song = null;
        this.currentNoteIndex = 0;
        this.playbackState = 'stopped'; // 'stopped', 'playing', 'paused', 'waiting'
        this.scheduledEvents = []; // To keep track of scheduled Tone.js events

        // Use Tone.Sampler to load a piano soundfont
        this.sampler = new Tone.Sampler({
            urls: MIDI.Soundfont.acoustic_grand_piano, // Data loaded from the soundfont script
            onload: () => {
                console.log("Piano soundfont loaded!");
            }
        }).toDestination();
    }

    // Helper to convert VexFlow duration to Tone.js time
    durationToTone(duration) {
        const map = {
            'w': '1n',
            'h': '2n',
            'q': '4n',
            '8': '8n',
            '16': '16n',
            '32': '32n'
        };
        return map[duration] || '4n'; // Default to quarter note if not found
    }

    loadSong(song) {
        this.song = song;
        this.currentNoteIndex = 0;
        this.uiManager.drawSong(this.song, this.currentNoteIndex);
        this.playbackState = 'waiting';
        console.log("Song loaded and first note highlighted.");
    }

    play() {
        if (!this.song || this.playbackState === 'playing') {
            return;
        }

        this.stop(); // Clear any previous playback state
        this.playbackState = 'playing';
        let time = 0; // Use a relative time offset

        this.song.forEach((note, index) => {
            const toneDuration = this.durationToTone(note.duration);
            
            const eventId = Tone.Transport.schedule(t => {
                this.sampler.triggerAttackRelease(note.keys[0], toneDuration, t);
                // Use Tone.Draw to sync UI updates with the audio thread for accuracy
                Tone.Draw.schedule(() => {
                    this.uiManager.drawSong(this.song, index);
                }, t);
            }, time);

            this.scheduledEvents.push(eventId);
            time += Tone.Time(toneDuration).toSeconds();
        });

        const endEvent = Tone.Transport.schedule(t => {
            this.stop();
        }, time);
        this.scheduledEvents.push(endEvent);

        Tone.Transport.start();
        console.log("Playback started.");
    }

    stop() {
        Tone.Transport.stop();
        Tone.Transport.cancel();
        // Sampler handles its own releases, no need for triggerRelease()
        this.scheduledEvents = [];
        this.playbackState = 'stopped';
        this.currentNoteIndex = 0;
        this.uiManager.drawSong(this.song, -1); // -1 for no highlight
        console.log("Playback stopped.");
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
                this.uiManager.drawSong(this.song, -1); 
                return;
            }
            this.uiManager.drawSong(this.song, this.currentNoteIndex);
        } else {
            console.log(`Incorrect note. Expected ${expectedNoteName}, but got ${playedNoteName}`);
        }
    }

    midiToVexflow(midiNote) {
        const noteNames = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return `${noteName}/${octave}`;
    }
}