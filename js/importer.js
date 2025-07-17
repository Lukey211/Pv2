document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('midi-file-input');
    const outputTextarea = document.getElementById('json-output');

    fileInput.addEventListener('change', handleFileSelect, false);

    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        outputTextarea.value = "Processing...";

        try {
            const arrayBuffer = await file.arrayBuffer();
            const midi = new Midi(arrayBuffer);
            const bpm = midi.header.tempos[0]?.bpm || 120;
            console.log(`Detected BPM: ${bpm}`);

            // 1. Group notes by start time to identify chords
            const timeMap = new Map();
            midi.tracks.forEach((track, index) => {
                const hand = (midi.tracks.length > 1 && index === 1) ? 'left' : 'right';
                track.notes.forEach(note => {
                    const time = note.time;
                    if (!timeMap.has(time)) {
                        timeMap.set(time, []);
                    }
                    timeMap.get(time).push({
                        midi: note.midi,
                        duration: note.duration,
                        hand: hand
                    });
                });
            });

            // 2. Sort the events by time
            const sortedTimes = Array.from(timeMap.entries()).sort((a, b) => a[0] - b[0]);
            
            // 3. Transform the grouped notes into our lesson format
            const lessonNotes = sortedTimes.map(([time, notesAtTime]) => {
                const firstNote = notesAtTime[0];
                return {
                    keys: notesAtTime.map(n => midiToVexflow(n.midi)), // Create an array of keys for chords
                    duration: quantizeDuration(firstNote.duration, bpm),
                    hand: firstNote.hand
                };
            });

            const lessonJson = {
                title: midi.header.name || "Imported Song",
                notes: lessonNotes
            };

            outputTextarea.value = JSON.stringify(lessonJson, null, 2);

        } catch (e) {
            outputTextarea.value = `Error parsing MIDI file: \n${e.toString()}`;
            console.error(e);
        }
    }

    // --- Helper Functions ---

    function midiToVexflow(midiNote) {
        const noteNames = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
        const octave = Math.floor(midiNote / 12) - 1;
        const noteName = noteNames[midiNote % 12];
        return `${noteName}/${octave}`;
    }

    function quantizeDuration(durationInSeconds, bpm) {
        const quarterNoteDuration = 60 / bpm;
        const durationMap = [
            { duration: quarterNoteDuration * 4, name: 'w' },
            { duration: quarterNoteDuration * 2, name: 'h' },
            { duration: quarterNoteDuration, name: 'q' },
            { duration: quarterNoteDuration / 2, name: '8' },
            { duration: quarterNoteDuration / 4, name: '16' },
        ];

        let closest = durationMap[0];
        for (const d of durationMap) {
            if (Math.abs(d.duration - durationInSeconds) < Math.abs(closest.duration - durationInSeconds)) {
                closest = d;
            }
        }
        return closest.name;
    }
});