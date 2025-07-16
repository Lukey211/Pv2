// This is the brain of the application.

export class MusicEngine {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.song = null;
        this.currentNoteIndex = 0;
        this.playbackState = 'stopped'; // 'stopped', 'playing', 'paused', 'waiting'
        this.scheduledEvents = []; // To keep track of scheduled Tone.js events

        this.sampler = new Tone.Sampler({
            urls: {
                'A0': 'A0.mp3', 'C1': 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3',
                'A1': 'A1.mp3', 'C2': 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3',
                'A2': 'A2.mp3', 'C3': 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3',
                'A3': 'A3.mp3', 'C4': 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3',
                'A4': 'A4.mp3', 'C5': 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3',
                'A5': 'A5.mp3', 'C6': 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3',
                'A6': 'A6.mp3', 'C7': 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3',
                'A7': 'A7.mp3', 'C8': 'C8.mp3'
            },
            release: 1,
            baseUrl: 'https://tonejs.github.io/audio/salamander/',
            onload: () => {
                console.log("Piano soundfont loaded!");
            }
        }).toDestination();
    }

    // Helper to convert VexFlow duration to Tone.js time
    durationToTone(duration) {
        const map = {
            'w': '1n', 'h': '2n', 'q': '4n', '8': '8n', '16': '16n', '32': '32n'
        };
        // Add support for dotted notes
        if (duration.includes('d')) {
            return map[duration.replace('d', '')] + '.';
        }
        return map[duration] || '4n';
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
            let time = 0; // Use a relative time offset for the transport

            this.song.forEach((note, index) => {
                const toneDuration = this.durationToTone(note.duration);

                // Schedule the audio and the visual update together
                const eventId = Tone.Transport.schedule(t => {
                    // FIX: Convert VexFlow note "c/4" to Tone.js note "C4"
                    const noteName = note.keys[0].replace('/', '').toUpperCase();
                    this.sampler.triggerAttackRelease(noteName, toneDuration, t);
                    
                    Tone.Draw.schedule(() => {
                        this.uiManager.drawSong(this.song, index);
                    }, t);
                }, time);

                this.scheduledEvents.push(eventId);
                time += Tone.Time(toneDuration).toSeconds();
            });

            // Schedule an event to stop everything at the end
            const endEvent = Tone.Transport.schedule(t => {
                this.stop();
            }, time);
            this.scheduledEvents.push(endEvent);

            Tone.Transport.start();
            console.log("Playback started.");
        }

    stop() {
        Tone.Transport.stop();
        Tone.Transport.cancel(); // Clear all scheduled events
        this.scheduledEvents = [];
        this.playbackState = 'stopped';
        this.currentNoteIndex = 0;
        this.uiManager.drawSong(this.song, -1); // -1 for no highlight
        console.log("Playback stopped.");
    }

    handleNoteInput(midiNote, velocity) {
        // Play audio feedback immediately
        const noteName = Tone.Midi(midiNote).toNote();
        this.sampler.triggerAttackRelease(noteName, "8n");

        if (this.playbackState !== 'waiting' || !this.song) {
            return;
        }

        const expectedNote = this.song[this.currentNoteIndex];
        const playedNoteName = this.midiToVexflow(midiNote);

        const expectedNoteName = expectedNote.keys[0].split('/')[0];

        if (playedNoteName.startsWith(expectedNoteName)) {
            this.currentNoteIndex++;
            if (this.currentNoteIndex >= this.song.length) {
                console.log("Song finished!");
                this.playbackState = 'stopped';
                this.uiManager.drawSong(this.song, -1);
                return;
            }
            this.uiManager.drawSong(this.song, this.currentNoteIndex);
        }
    }

    midiToVexflow(midiNote) {
        const noteNames = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return `${noteName}/${octave}`;
    }
}