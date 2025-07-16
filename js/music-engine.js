// This is the brain of the application.

export class MusicEngine {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.song = null;
        this.currentNoteIndex = 0;
        this.playbackState = 'stopped';
        this.songPart = null;

        // The base BPM for our application (a common default)
        this.baseBPM = 120;
        Tone.Transport.bpm.value = this.baseBPM;

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

    durationToTone(duration) {
        const map = {
            'w': '1n', 'h': '2n', 'q': '4n', '8': '8n', '16': '16n', '32': '32n'
        };
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

        this.stop();
        this.playbackState = 'playing';

        let cumulativeTime = 0;
        const partEvents = this.song.map((note, index) => {
            const durationInSeconds = Tone.Time(this.durationToTone(note.duration)).toSeconds();
            const event = {
                time: cumulativeTime,
                note: note,
                index: index,
                duration: durationInSeconds
            };
            cumulativeTime += durationInSeconds;
            return event;
        });

        this.songPart = new Tone.Part((time, value) => {
            const noteName = value.note.keys[0].replace('/', '').toUpperCase();
            this.sampler.triggerAttackRelease(noteName, value.duration, time);
            
            Tone.Draw.schedule(() => {
                this.uiManager.drawSong(this.song, value.index);
            }, time);
        }, partEvents).start(0);

        Tone.Transport.start();
        
        Tone.Transport.scheduleOnce(() => {
            this.stop();
        }, cumulativeTime);

        console.log("Playback started.");
    }

    stop() {
        Tone.Transport.stop();
        if (this.songPart) {
            this.songPart.stop();
            this.songPart.dispose();
            this.songPart = null;
        }
        this.playbackState = 'stopped';
        this.currentNoteIndex = 0;
        this.uiManager.drawSong(this.song, -1);
        console.log("Playback stopped.");
    }
    
    setTempo(rate) {
        // This is the corrected logic for tempo control
        Tone.Transport.bpm.value = this.baseBPM * rate;
        console.log(`Tempo set to: ${Tone.Transport.bpm.value.toFixed(2)} BPM`);
    }

    handleNoteInput(midiNote, velocity) {
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