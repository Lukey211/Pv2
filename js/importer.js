document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const titleInput = document.getElementById('lesson-title');
    const fileInput = document.getElementById('midi-file-input');
    
    const livePreviewContainer = document.getElementById('live-preview-container');
    const previewContainer = document.getElementById('preview-container');
    const editorTableContainer = document.getElementById('editor-table-container');
    const notesTbody = document.getElementById('notes-tbody');
    
    const jsonOutputContainer = document.getElementById('json-output-container');
    const jsonOutputTextarea = document.getElementById('json-output');
    const downloadBtn = document.getElementById('download-btn');

    const manifestOutputContainer = document.getElementById('manifest-output-container');
    const manifestOutputPre = document.getElementById('manifest-output');
    const copyManifestBtn = document.getElementById('copy-manifest-btn');

    let parsedNotesData = [];
    let generatedFilename = 'lesson.json';

    // --- Event Listeners ---
    fileInput.addEventListener('change', handleFileSelect);
    downloadBtn.addEventListener('click', generateAndDownloadJson);
    copyManifestBtn.addEventListener('click', copyManifestEntry);
    notesTbody.addEventListener('change', handleDataChange);

    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        notesTbody.innerHTML = '<tr><td colspan="4">Processing...</td></tr>';
        livePreviewContainer.style.display = 'block';
        editorTableContainer.style.display = 'block';
        jsonOutputContainer.style.display = 'none';
        manifestOutputContainer.style.display = 'none';
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const midi = new Midi(arrayBuffer);
            const bpm = midi.header.tempos[0]?.bpm || 120;
            const splitPoint = 60;

            const timeMap = new Map();
            midi.tracks.forEach((track, trackIndex) => {
                track.notes.forEach(note => {
                    const time = note.time;
                    if (!timeMap.has(time)) timeMap.set(time, []);
                    let hand = (midi.tracks.length > 1 && trackIndex === 1) ? 'left' : 'right';
                    if (midi.tracks.length === 1) hand = (note.midi < splitPoint) ? 'left' : 'right';
                    timeMap.get(time).push({ midi: note.midi, duration: note.duration, hand });
                });
            });

            const sortedTimes = Array.from(timeMap.entries()).sort((a, b) => a[0] - b[0]);
            
            parsedNotesData = [];
            sortedTimes.forEach(([time, notesAtTime]) => {
                const rightHandNotes = notesAtTime.filter(n => n.hand === 'right');
                const leftHandNotes = notesAtTime.filter(n => n.hand === 'left');
                if (rightHandNotes.length > 0) {
                    rightHandNotes.sort((a, b) => a.midi - b.midi);
                    parsedNotesData.push({ keys: rightHandNotes.map(n => midiToVexflow(n.midi)), duration: quantizeDuration(rightHandNotes[0].duration, bpm), hand: 'right' });
                }
                if (leftHandNotes.length > 0) {
                    leftHandNotes.sort((a, b) => a.midi - b.midi);
                    parsedNotesData.push({ keys: leftHandNotes.map(n => midiToVexflow(n.midi)), duration: quantizeDuration(leftHandNotes[0].duration, bpm), hand: 'left' });
                }
            });

            renderTable();
            renderPreview(parsedNotesData);
            jsonOutputContainer.style.display = 'block';
            manifestOutputContainer.style.display = 'block';
            copyManifestBtn.textContent = 'Copy Entry';

        } catch (e) {
            notesTbody.innerHTML = `<tr><td colspan="4">Error parsing MIDI file: ${e.message}</td></tr>`;
            console.error(e);
        }
    }

    function renderTable() {
        notesTbody.innerHTML = '';
        parsedNotesData.forEach((noteData, index) => {
            const row = document.createElement('tr');
            const durationOptions = ['w', 'h', 'q', '8', '16'].map(d => `<option value="${d}" ${d === noteData.duration ? 'selected' : ''}>${d}</option>`).join('');
            const handOptions = ['right', 'left'].map(h => `<option value="${h}" ${h === noteData.hand ? 'selected' : ''}>${h}</option>`).join('');
            row.innerHTML = `<td>${index + 1}</td><td>${noteData.keys.join(', ')}</td><td><select data-index="${index}" data-field="duration">${durationOptions}</select></td><td><select data-index="${index}" data-field="hand">${handOptions}</select></td>`;
            notesTbody.appendChild(row);
        });
    }

    function handleDataChange(event) {
        const target = event.target;
        if (target.tagName !== 'SELECT') return;
        const index = parseInt(target.dataset.index, 10);
        const field = target.dataset.field;
        const value = target.value;
        if (parsedNotesData[index]) {
            parsedNotesData[index][field] = value;
            renderPreview(parsedNotesData);
        }
    }

    function renderPreview(notes) {
        previewContainer.innerHTML = '';
        if (!notes || notes.length === 0) return;
        const VF = Vex.Flow;
        const trebleVexNotes = getVexNotes(notes, 'right');
        const bassVexNotes = getVexNotes(notes, 'left');
        const totalBeats = getTotalBeats(notes);
        if (totalBeats === 0) return;
        const voiceConfig = { num_beats: totalBeats, beat_value: 4 };
        const trebleVoice = new VF.Voice(voiceConfig).addTickables(trebleVexNotes);
        const bassVoice = new VF.Voice(voiceConfig).addTickables(bassVexNotes);
        const voices = [trebleVoice, bassVoice];
        const minWidth = new VF.Formatter().joinVoices(voices).preCalculateMinTotalWidth(voices);
        const renderer = new VF.Renderer(previewContainer, VF.Renderer.Backends.SVG);
        renderer.resize(minWidth + 50, 280);
        const context = renderer.getContext();
        const trebleStave = new VF.Stave(10, 40, minWidth + 20).addClef("treble").addTimeSignature("4/4").setContext(context).draw();
        const bassStave = new VF.Stave(10, 140, minWidth + 20).addClef("bass").addTimeSignature("4/4").setContext(context).draw();
        new VF.StaveConnector(trebleStave, bassStave).setType('brace').setContext(context).draw();
        const trebleBeams = VF.Beam.generateBeams(trebleVexNotes.filter(n => !n.isRest()));
        const bassBeams = VF.Beam.generateBeams(bassVexNotes.filter(n => !n.isRest()));
        new VF.Formatter().joinVoices(voices).format(voices, minWidth);
        trebleVoice.draw(context, trebleStave);
        bassVoice.draw(context, bassStave);
        trebleBeams.forEach(b => b.setContext(context).draw());
        bassBeams.forEach(b => b.setContext(context).draw());
    }
    
    function generateAndDownloadJson() {
        const title = titleInput.value.trim();
        if (!title) {
            alert("Please enter a title for the lesson.");
            return;
        }
        const lessonJson = { title: title, notes: parsedNotesData };
        jsonOutputTextarea.value = JSON.stringify(lessonJson, null, 2);
        generatedFilename = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '.json';
        const blob = new Blob([jsonOutputTextarea.value], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
a.href = url;
a.download = generatedFilename;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
const manifestEntry = { title: title, type: "song", path: `assets/lessons/${generatedFilename}` };
manifestOutputPre.textContent = JSON.stringify(manifestEntry, null, 2) + ',';
}
function copyManifestEntry() {
    navigator.clipboard.writeText(manifestOutputPre.textContent).then(() => {
        copyManifestBtn.textContent = 'Copied!';
    });
}
function getVexNotes(notes, hand) {
    const vexNotes = [];
    notes.forEach((note) => {
        const clef = hand === 'left' ? 'bass' : 'treble';
        if (note.hand === hand) {
            vexNotes.push(new Vex.Flow.StaveNote({ keys: note.keys, duration: note.duration, clef }));
        } else {
            const restKey = hand === 'left' ? "d/3" : "b/4";
            vexNotes.push(new Vex.Flow.StaveNote({ keys: [restKey], duration: note.duration + 'r' }));
        }
    });
    return vexNotes;
}
function getTotalBeats(notes) {
    const beatValues = { 'w': 4, 'h': 2, 'q': 1, '8': 0.5, '16': 0.25, '32': 0.125 };
    return notes.reduce((total, note) => {
        const duration = note.duration.replace('d', '');
        let beatValue = beatValues[duration] || 0;
        if (note.duration.includes('d')) beatValue *= 1.5;
        return total + beatValue;
    }, 0);
}
function midiToVexflow(midiNote) {
    const noteNames = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return `${noteName}/${octave}`;
}
function quantizeDuration(durationInSeconds, bpm) {
    const quarterNoteDuration = 60 / bpm;
    const durationMap = [
        { duration: quarterNoteDuration * 4, name: 'w' }, { duration: quarterNoteDuration * 2, name: 'h' },
        { duration: quarterNoteDuration, name: 'q' }, { duration: quarterNoteDuration / 2, name: '8' },
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