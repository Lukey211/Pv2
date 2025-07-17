export class MusicEngine {
    constructor(uiManager, keyboardManager) {
        this.uiManager = uiManager;
        this.keyboardManager = keyboardManager;
        this.song = null;
        this.currentNoteIndex = 0;
        this.playbackState = 'stopped';
        this.songPart = null;
        this.practiceHand = 'both';

        this.baseBPM = 120;
        Tone.Transport.bpm.value = this.baseBPM;
        this.sampler = new Tone.Sampler({
            urls: { 'A0': 'A0.mp3', 'C1': 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', 'A1': 'A1.mp3', 'C2': 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', 'A2': 'A2.mp3', 'C3': 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', 'A3': 'A3.mp3', 'C4': 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', 'A4': 'A4.mp3', 'C5': 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', 'A5': 'A5.mp3', 'C6': 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', 'A6': 'A6.mp3', 'C7': 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', 'A7': 'A7.mp3', 'C8': 'C8.mp3' },
            release: 1, baseUrl: 'https://tonejs.github.io/audio/salamander/',
            onload: () => console.log("Piano soundfont loaded!")
        }).toDestination();
    }

    durationToTone(duration) {
        const map = { 'w': '1n', 'h': '2n', 'q': '4n', '8': '8n', '16': '16n', '32': '32n' };
        return duration.includes('d') ? map[duration.replace('d', '')] + '.' : map[duration] || '4n';
    }

    loadSong(song) {
        this.stop();
        this.song = song;
        this.currentNoteIndex = 0;
        this.uiManager.drawSong(this.song, 0); // Highlight first note
        this.uiManager.scrollToNote(0); // Scroll to first note
        this.playbackState = 'waiting';
        this.updateKeyboardForNextNote();
        console.log("Song loaded.");
    }

    play() {
        if (!this.song || this.playbackState === 'playing') return;
        this.stop();
        this.playbackState = 'playing';
        this.keyboardManager.clearAllHighlights('blue');

        let cumulativeTime = 0;
        const partEvents = this.song.map((note, index) => {
            const durationInSeconds = Tone.Time(this.durationToTone(note.duration)).toSeconds();
            const event = { time: cumulativeTime, note, index, duration: durationInSeconds };
            cumulativeTime += durationInSeconds;
            return event;
        });

        this.songPart = new Tone.Part((time, value) => {
            if (this.practiceHand === 'both' || value.note.hand === this.practiceHand) {
                const notesInChord = value.note.keys.map(key => this.vexflowToTone(key));
                this.sampler.triggerAttackRelease(notesInChord, value.duration, time);
            }
            Tone.Draw.schedule(() => {
                this.uiManager.drawSong(this.song, value.index);
                this.uiManager.scrollToNote(value.index);
            }, time);
        }, partEvents).start(0);

        Tone.Transport.start();
        Tone.Transport.scheduleOnce(() => this.stop(), cumulativeTime);
        console.log("Playback started.");
    }

    stop() {
        Tone.Transport.stop();
        if (this.songPart) { this.songPart.stop(0); this.songPart.dispose(); this.songPart = null; }
        this.playbackState = 'stopped';
        this.currentNoteIndex = 0;
        this.uiManager.drawSong(this.song, -1);
        this.uiManager.scrollToNote(0);
        this.keyboardManager.clearAllHighlights('blue');
        console.log("Playback stopped.");
    }
    
    setTempo(rate) {
        Tone.Transport.bpm.value = this.baseBPM * rate;
    }

    setPracticeHand(hand) {
        this.practiceHand = hand;
        this.loadSong(this.song); // Reload song to apply hand selection
    }

    handleUserKeyPress(midiNote, isNoteOn) {
        const noteName = Tone.Midi(midiNote).toNote();
        this.keyboardManager.setUserPress(noteName, isNoteOn);
        if (isNoteOn) this.sampler.triggerAttackRelease(noteName, "8n");
    }

    handleNoteInput(midiNote) {
        if (this.playbackState !== 'waiting' || !this.song) return;
        const expectedNote = this.song[this.currentNoteIndex];
        if (!expectedNote) return;

        if (this.practiceHand !== 'both' && expectedNote.hand !== this.practiceHand) {
            this.playOtherHandNote(expectedNote);
            return;
        }

        const playedNoteName = this.midiToVexflow(midiNote);
        const expectedNoteNames = expectedNote.keys.map(k => k.split('/')[0]);
        const toneNoteName = Tone.Midi(midiNote).toNote();

        if (expectedNoteNames.includes(playedNoteName.split('/')[0])) {
            this.keyboardManager.showCorrectPress(toneNoteName);
            this.advanceToNextNote();
        } else {
            this.keyboardManager.setUserPress(toneNoteName, false);
            this.keyboardManager.showIncorrectPress(toneNoteName);
        }
    }
    
    playOtherHandNote(note) {
        const chordNotes = note.keys.map(key => this.vexflowToTone(key));
        const duration = this.durationToTone(note.duration);
        this.sampler.triggerAttackRelease(chordNotes, duration);
        chordNotes.forEach(n => this.keyboardManager.showCorrectPress(n));
        this.advanceToNextNote();
    }

    advanceToNextNote() {
        this.currentNoteIndex++;
        if (this.currentNoteIndex >= this.song.length) {
            this.stop();
            console.log("Song finished!");
            return;
        }
        this.uiManager.drawSong(this.song, this.currentNoteIndex);
        this.uiManager.scrollToNote(this.currentNoteIndex);
        this.updateKeyboardForNextNote();

        const nextNote = this.song[this.currentNoteIndex];
        if (this.practiceHand !== 'both' && nextNote.hand !== this.practiceHand) {
            setTimeout(() => this.playOtherHandNote(nextNote), 200);
        }
    }

    updateKeyboardForNextNote() {
        if(this.song && this.song[this.currentNoteIndex]) {
            const nextNote = this.song[this.currentNoteIndex];
            if(this.practiceHand === 'both' || nextNote.hand === this.practiceHand) {
                const nextNoteNames = nextNote.keys.map(key => this.vexflowToTone(key));
                this.keyboardManager.clearAllHighlights('blue');
                nextNoteNames.forEach(noteName => this.keyboardManager.highlightNextNote(noteName));
            }
        }
    }

    midiToVexflow(midiNote) { return Tone.Midi(midiNote).toNote().replace(/(\w)(\d)/, '$1/$2').toLowerCase(); }
    vexflowToTone(vfNote) { return vfNote.replace('/', '').toUpperCase(); }
}