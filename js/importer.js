document.addEventListener('DOMContentLoaded', () => {
    const titleInput = document.getElementById('lesson-title');
    const fileInput = document.getElementById('midi-file-input');
    const outputContainer = document.getElementById('output-container');
    const jsonOutputTextarea = document.getElementById('json-output');
    const downloadBtn = document.getElementById('download-btn');
    const manifestOutputPre = document.getElementById('manifest-output');
    const copyManifestBtn = document.getElementById('copy-manifest-btn');
    let generatedFilename = 'lesson.json';

    fileInput.addEventListener('change', handleFileSelect, false);

    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        jsonOutputTextarea.value = "Processing...";
        manifestOutputPre.textContent = "";
        outputContainer.style.display = 'block';

        try {
            const arrayBuffer = await file.arrayBuffer();
            const midi = new Midi(arrayBuffer);
            const bpm = midi.header.tempos[0]?.bpm || 120;
            const splitPoint = 60; // C4

            const timeMap = new Map();
            midi.tracks.forEach((track, trackIndex) => {
                track.notes.forEach(note => {
                    const time = note.time;
                    if (!timeMap.has(time)) timeMap.set(time, []);
                    
                    let hand;
                    if (midi.tracks.length > 1) {
                        hand = (trackIndex === 1) ? 'left' : 'right';
                    } else {
                        hand = (note.midi < splitPoint) ? 'left' : 'right';
                    }

                    timeMap.get(time).push({
                        midi: note.midi,
                        duration: note.duration,
                        hand: hand
                    });
                });
            });

            const sortedTimes = Array.from(timeMap.entries()).sort((a, b) => a[0] - b[0]);
            
            const lessonNotes = [];
            sortedTimes.forEach(([time, notesAtTime]) => {
                // Separate notes by hand for this specific time event
                const rightHandNotes = notesAtTime.filter(n => n.hand === 'right');
                const leftHandNotes = notesAtTime.filter(n => n.hand === 'left');

                if (rightHandNotes.length > 0) {
                    lessonNotes.push({
                        keys: rightHandNotes.map(n => midiToVexflow(n.midi)).sort(),
                        duration: quantizeDuration(rightHandNotes[0].duration, bpm),
                        hand: 'right'
                    });
                }
                if (leftHandNotes.length > 0) {
                    lessonNotes.push({
                        keys: leftHandNotes.map(n => midiToVexflow(n.midi)).sort(),
                        duration: quantizeDuration(leftHandNotes[0].duration, bpm),
                        hand: 'left'
                    });
                }
            });

            const title = titleInput.value.trim() || midi.header.name || "Imported Song";
            generatedFilename = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.json';

            const lessonJson = { title: title, notes: lessonNotes };
            jsonOutputTextarea.value = JSON.stringify(lessonJson, null, 2);

            const manifestEntry = { title: title, type: "song", path: `assets/lessons/${generatedFilename}` };
            manifestOutputPre.textContent = JSON.stringify(manifestEntry, null, 2) + ',';

            downloadBtn.style.display = 'inline-block';
            copyManifestBtn.style.display = 'inline-block';
            copyManifestBtn.textContent = 'Copy Entry';

        } catch (e) {
            outputTextarea.value = `Error parsing MIDI file: \n${e.toString()}`;
            console.error(e);
        }
    }
    
    downloadBtn.addEventListener('click', () => {
        const blob = new Blob([jsonOutputTextarea.value], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = generatedFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    copyManifestBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(manifestOutputPre.textContent).then(() => {
            copyManifestBtn.textContent = 'Copied!';
        });
    });

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