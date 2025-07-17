export class MusicEngine {
    constructor(uiManager, keyboardManager) {
        this.uiManager = uiManager;
        this.keyboardManager = keyboardManager;
        this.song = null;
        this.currentNoteIndex = 0;
        this.playbackState = 'stopped';
        this.songPart = null;
        this.practiceHand = 'both';
        this.heldChordNotes = new Set();
        this.currentMode = 'song';
        this.exerciseConfig = null;
        this.loop = {
            enabled: false,
            selectionMode: 'inactive',
            start: null,
            end: null
        };

        this.baseBPM = 120;
        Tone.Transport.bpm.value = this.baseBPM;
        this.sampler = new Tone.Sampler({
            urls: { 'A0': 'A0.mp3', 'C1': 'C1.mp3', 'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', 'A1': 'A1.mp3', 'C2': 'C2.mp3', 'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', 'A2': 'A2.mp3', 'C3': 'C3.mp3', 'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', 'A3': 'A3.mp3', 'C4': 'C4.mp3', 'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', 'A4': 'A4.mp3', 'C5': 'C5.mp3', 'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', 'A5': 'A5.mp3', 'C6': 'C6.mp3', 'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', 'A6': 'A6.mp3', 'C7': 'C7.mp3', 'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', 'A7': 'A7.mp3', 'C8': 'C8.mp3' },
            release: 1, baseUrl: 'https://tonejs.github.io/audio/salamander/',
            onload: () => console.log("Piano soundfont loaded!")
        }).toDestination();
    }

    startExercise(exerciseData) {
        this.currentMode = exerciseData.type;
        this.exerciseConfig = exerciseData.config;
        this.stop();

        if (this.currentMode === 'song') {
            this.uiManager.updateTitle(exerciseData.title);
            this.loadSong(exerciseData.notes);
        } else if (this.currentMode === 'flashcard') {
            this._generateFlashcard();
        } else if (this.currentMode === 'arpeggio') {
            this._generateArpeggioExercise();
        }
    }

    _generateArpeggioExercise() {
        const possibleRoots = ['C4', 'G3', 'D4', 'A3', 'E4', 'F3'];
        const possibleQualities = ['major', 'minor'];
        
        const root = possibleRoots[Math.floor(Math.random() * possibleRoots.length)];
        const quality = possibleQualities[Math.floor(Math.random() * possibleQualities.length)];
        const octaves = 2;

        this.uiManager.updateTitle(`Practice: ${root.slice(0,-1)} ${quality} Arpeggio`);

        const formulas = { major: [0, 4, 7], minor: [0, 3, 7] };
        const rootMidi = Tone.Midi(root).toMidi();
        const formula = formulas[quality];
        const arpeggioMidiSequence = [];
        
        for (let i = 0; i < octaves; i++) {
            formula.forEach(interval => arpeggioMidiSequence.push(rootMidi + interval + (i * 12)));
        }
        arpeggioMidiSequence.push(rootMidi + (octaves * 12));
        for (let i = octaves - 1; i >= 0; i--) {
            for (let j = formula.length - 1; j >= 0; j--) {
                const note = rootMidi + formula[j] + (i * 12);
                if (note !== arpeggioMidiSequence[arpeggioMidiSequence.length - 1]) {
                     arpeggioMidiSequence.push(note);
                }
            }
        }
        
        const notes = arpeggioMidiSequence.map(midiNote => ({
            keys: [this.midiToVexflow(midiNote)],
            duration: 'q',
            hand: midiNote < 60 ? 'left' : 'right'
        }));

        this.loadSong(notes, false);
    }

    _generateFlashcard() {
        this.stop();
        this.uiManager.updateTitle("Flashcards: Identify the Note");
        const { clef, range } = this.exerciseConfig;
        const minMidi = Tone.Midi(this.vexflowToTone(range[0])).toMidi();
        const maxMidi = Tone.Midi(this.vexflowToTone(range[1])).toMidi();
        const randomMidi = Math.floor(Math.random() * (maxMidi - minMidi + 1)) + minMidi;
        const vexKey = this.midiToVexflow(randomMidi);
        const hand = clef === 'bass' ? 'left' : 'right';
        const flashcardNote = [{ keys: [vexKey], duration: 'w', hand: hand }];
        this.loadSong(flashcardNote, false);
    }

    loadSong(song, resetMode = true) {
        if (resetMode) this.currentMode = 'song';
        this.stop();
        this.song = song;
        this.currentNoteIndex = 0;
        this.uiManager.drawSong(this.song, 0, this.loop); 
        this.uiManager.scrollToNote(0); 
        this.playbackState = 'waiting';
        this.updateKeyboardForNextNote();
    }

    play() {
        if (this.currentMode === 'flashcard' || !this.song || this.playbackState === 'playing') return;
        this.stop();
        this.playbackState = 'playing';
        this.keyboardManager.clearAllHighlights('blue');
        
        const notesToPlay = (this.practiceHand === 'both') ? this.song : this.song.filter(note => note.hand === this.practiceHand);
        
        let cumulativeTime = 0;
        const partEvents = notesToPlay.map(note => {
            const durationInSeconds = Tone.Time(this.durationToTone(note.duration)).toSeconds();
            const event = { time: cumulativeTime, note, duration: durationInSeconds, originalIndex: this.song.indexOf(note) };
            cumulativeTime += durationInSeconds;
            return event;
        });

        this.songPart = new Tone.Part((time, value) => {
            const notesInChord = value.note.keys.map(key => this.vexflowToTone(key));
            this.sampler.triggerAttackRelease(notesInChord, value.duration, time);
            
            Tone.Draw.schedule(() => {
                this.uiManager.drawSong(this.song, value.originalIndex, this.loop);
                this.uiManager.scrollToNote(value.originalIndex);
                this.updateKeyboardForNextNote(value.originalIndex + 1);
            }, time);
        }, partEvents).start(0);

        if (this.loop.enabled) {
            this.songPart.loop = true;
            const loopStartEvent = partEvents.find(e => e.originalIndex === this.loop.start);
            const loopEndEvent = partEvents.find(e => e.originalIndex === this.loop.end);
            if (loopStartEvent && loopEndEvent) {
                this.songPart.loopStart = loopStartEvent.time;
                this.songPart.loopEnd = loopEndEvent.time + loopEndEvent.duration;
                this.songPart.start(0, this.songPart.loopStart);
            }
        } else {
            this.songPart.loop = false;
            this.songPart.start(0);
            Tone.Transport.scheduleOnce(() => this.stop(), cumulativeTime);
        }
        
        Tone.Transport.start();
    }

    stop() {
        Tone.Transport.stop();
        if (this.songPart) { this.songPart.stop(0); this.songPart.dispose(); this.songPart = null; }
        this.playbackState = 'stopped';
        
        if (this.currentMode === 'song' || this.currentMode === 'arpeggio') {
            this.currentNoteIndex = this.loop.enabled ? this.loop.start : 0;
        } else {
            this.currentNoteIndex = 0;
        }
        if (this.song) {
            this.uiManager.drawSong(this.song, this.currentNoteIndex, this.loop);
            this.uiManager.scrollToNote(this.currentNoteIndex);
            this.updateKeyboardForNextNote();
        }
    }
    
    setTempo(rate) { Tone.Transport.bpm.value = this.baseBPM * rate; }
    
    setPracticeHand(hand) {
        this.practiceHand = hand;
        this.startExercise({ type: this.currentMode, notes: this.song, config: this.exerciseConfig });
    }

    toggleLoop() {
        if (this.loop.enabled || this.loop.selectionMode !== 'inactive') {
            this.loop.enabled = false;
            this.loop.start = null;
            this.loop.end = null;
            this.loop.selectionMode = 'inactive';
        } else {
            this.loop.selectionMode = 'selecting_start';
        }
        this.uiManager.drawSong(this.song, this.currentNoteIndex, this.loop);
        return this.loop.enabled || this.loop.selectionMode !== 'inactive';
    }

    handleNoteSelection(index) {
        if (this.loop.selectionMode === 'inactive') return;
        if (this.loop.start === null) {
            this.loop.start = index;
            this.uiManager.drawSong(this.song, this.currentNoteIndex, this.loop);
        } else {
            this.loop.end = (index < this.loop.start) ? this.loop.start : index;
            this.loop.start = (index < this.loop.start) ? index : this.loop.start;
            this.loop.enabled = true;
            this.loop.selectionMode = 'inactive';
            this.currentNoteIndex = this.loop.start;
            this.uiManager.drawSong(this.song, this.currentNoteIndex, this.loop);
            this.uiManager.scrollToNote(this.currentNoteIndex);
            this.updateKeyboardForNextNote();
        }
    }

    handleUserKeyPress(midiNote, isNoteOn) {
        const noteName = Tone.Midi(midiNote).toNote();
        if (isNoteOn) {
            this.sampler.triggerAttack(noteName);
            const expectedNote = this.song ? this.song[this.currentNoteIndex] : null;
            let keyState = 'pressed';
            if (expectedNote && (this.practiceHand === 'both' || expectedNote.hand === this.practiceHand)) {
                const expectedKeys = expectedNote.keys.map(k => this.vexflowToTone(k));
                if (expectedKeys.includes(noteName)) {
                    keyState = 'correct';
                }
            }
            this.keyboardManager.setKeyState(noteName, keyState);
        } else {
            this.sampler.triggerRelease(noteName);
            this.keyboardManager.setKeyState(noteName, 'off');
            const noteNameOnly = this.midiToVexflow(midiNote).split('/')[0];
            this.heldChordNotes.delete(noteNameOnly);
        }
    }

    handleNoteInput(midiNote) {
        if (this.playbackState !== 'waiting' || !this.song || !this.song[this.currentNoteIndex]) return;
        const expectedNote = this.song[this.currentNoteIndex];
        if (this.practiceHand !== 'both' && expectedNote.hand !== this.practiceHand) {
            this.playOtherHandNote(expectedNote);
            return;
        }
        const playedNoteName = this.midiToVexflow(midiNote).split('/')[0];
        const expectedNoteNames = expectedNote.keys.map(k => k.split('/')[0]);
        if (expectedNoteNames.includes(playedNoteName)) {
            this.uiManager.showCheckmarkFeedback(this.currentNoteIndex);
            if (this.currentMode === 'flashcard') {
                setTimeout(() => this._generateFlashcard(), 600);
            } else {
                const isChord = expectedNote.keys.length > 1;
                if (isChord) {
                    this.heldChordNotes.add(playedNoteName);
                    if (expectedNoteNames.every(name => this.heldChordNotes.has(name))) {
                        this.advanceToNextNote();
                    }
                } else {
                    this.advanceToNextNote();
                }
            }
        } else {
            this.keyboardManager.flashIncorrect(Tone.Midi(midiNote).toNote());
        }
    }
    
    playOtherHandNote(note) {
        const chordNotes = note.keys.map(key => this.vexflowToTone(key));
        this.sampler.triggerAttackRelease(chordNotes, this.durationToTone(note.duration));
        chordNotes.forEach(n => this.keyboardManager.setKeyState(n, 'correct'));
        setTimeout(() => chordNotes.forEach(n => this.keyboardManager.setKeyState(n, 'off')), 200);
        this.advanceToNextNote();
    }

    advanceToNextNote() {
        this.heldChordNotes.clear();
        this.currentNoteIndex++;
        if (this.loop.enabled && this.currentNoteIndex > this.loop.end) {
            this.currentNoteIndex = this.loop.start;
        }
        if (!this.loop.enabled && this.currentNoteIndex >= this.song.length) {
            this.stop();
            console.log("Song finished!");
            return;
        }
        this.uiManager.drawSong(this.song, this.currentNoteIndex, this.loop);
        this.uiManager.scrollToNote(this.currentNoteIndex);
        this.updateKeyboardForNextNote();
        const nextNote = this.song[this.currentNoteIndex];
        if (this.practiceHand !== 'both' && nextNote && nextNote.hand !== this.practiceHand) {
            setTimeout(() => this.playOtherHandNote(nextNote), 200);
        }
    }

    updateKeyboardForNextNote(index = this.currentNoteIndex) {
        this.keyboardManager.clearAllHighlights('blue');
        if (!this.song || !this.song[index]) return;
        const nextNote = this.song[index];
        if (this.practiceHand === 'both' || (nextNote && nextNote.hand === this.practiceHand)) {
            const nextNoteNames = nextNote.keys.map(key => this.vexflowToTone(key));
            nextNoteNames.forEach(noteName => this.keyboardManager.setKeyState(noteName, 'next'));
        }
    }

    durationToTone(duration) {
        const map = { 'w': '1n', 'h': '2n', 'q': '4n', '8': '8n', '16': '16n', '32': '32n' };
        return duration.includes('d') ? map[duration.replace('d', '')] + '.' : map[duration] || '4n';
    }

    midiToVexflow(midiNote) {
        const note = Tone.Midi(midiNote).toNote();
        return note.replace(/([a-zA-Z]#?)(\d)/, '$1/$2').toLowerCase();
    }
    
    vexflowToTone(vfNote) { return vfNote.replace('/', '').toUpperCase(); }
}