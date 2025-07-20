document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const titleInput = document.getElementById('lesson-title');
    const fileInput = document.getElementById('music-file-input');
    
    const livePreviewContainer = document.getElementById('live-preview-container');
    const previewContainer = document.getElementById('preview-container');
    const editorTableContainer = document.getElementById('editor-table-container');
    const notesTbody = document.getElementById('notes-tbody');
    
    const jsonOutputContainer = document.getElementById('json-output-container');
    const jsonOutputTextarea = document.getElementById('json-output');
    const downloadBtn = document.getElementById('download-btn');

    let parsedNotesData = [];
    const osmd = new opensheetmusicdisplay.OpenSheetMusicDisplay(previewContainer);

    // --- Event Listeners ---
    fileInput.addEventListener('change', handleFileSelect);
    downloadBtn.addEventListener('click', generateAndDownloadJson);
    notesTbody.addEventListener('change', handleDataChange);

    /**
     * Main function to handle MusicXML file parsing.
     */
    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        notesTbody.innerHTML = '<tr><td colspan="4">Processing...</td></tr>';
        livePreviewContainer.style.display = 'block';

        try {
            const fileText = await file.text();
            await osmd.load(fileText);
            await osmd.render(); 

            // --- NEW, ROBUST PARSING LOGIC from the Source Data Model ---
            parsedNotesData = [];
            const sheet = osmd.sheet;
            let noteData = [];

            // 1. Iterate through the stable SourceMeasures data model.
            sheet.SourceMeasures.forEach(measure => {
                if (measure.VerticalSourceStaffEntryContainers) {
                    measure.VerticalSourceStaffEntryContainers.forEach(container => {
                        container.StaffEntries.forEach(staffEntry => {
                            if (staffEntry) {
                                staffEntry.VoiceEntries.forEach(voiceEntry => {
                                    const timestamp = voiceEntry.Timestamp.RealValue;
                                    voiceEntry.Notes.forEach(note => {
                                        if (note.isRest()) return;

                                        const hand = note.ParentStaff.Id === 1 ? 'right' : 'left';
                                        noteData.push({
                                            keys: [vexflowKey(note.halfTone)],
                                            duration: getVexflowDuration(note.Length),
                                            hand: hand,
                                            timestamp: timestamp
                                        });
                                    });
                                });
                            }
                        });
                    });
                }
            });

            // 2. Group notes by timestamp to combine chords correctly.
            const groupedByTimestamp = noteData.reduce((acc, note) => {
                const key = `${note.timestamp}-${note.hand}`;
                if (!acc[key]) {
                    acc[key] = { keys: [], duration: note.duration, hand: note.hand };
                }
                acc[key].keys.push(note.keys[0]);
                return acc;
            }, {});

            // 3. Create the final, clean data structure.
            parsedNotesData = Object.values(groupedByTimestamp);
            
            editorTableContainer.style.display = 'block';
            jsonOutputContainer.style.display = 'block';
            renderTable();
            updateJsonOutput();

        } catch (e) {
            notesTbody.innerHTML = `<tr><td colspan="4">Error parsing MusicXML file: ${e.message}</td></tr>`;
            console.error(e);
        }
    }

    function renderTable() {
        notesTbody.innerHTML = '';
        parsedNotesData.forEach((noteData, index) => {
            const row = document.createElement('tr');
            const durationOptions = ['w', 'h', 'qd', 'q', '8d', '8', '16'].map(d => `<option value="${d}" ${d === noteData.duration ? 'selected' : ''}>${d}</option>`).join('');
            const handOptions = ['right', 'left'].map(h => `<option value="${h}" ${h === noteData.hand ? 'selected' : ''}>${h}</option>`).join('');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><input type="text" value="${noteData.keys.join(', ')}" data-index="${index}" data-field="keys"></td>
                <td><select data-index="${index}" data-field="duration">${durationOptions}</select></td>
                <td><select data-index="${index}" data-field="hand">${handOptions}</select></td>`;
            notesTbody.appendChild(row);
        });
    }

    function handleDataChange(event) {
        const target = event.target;
        const index = parseInt(target.dataset.index, 10);
        const field = target.dataset.field;
        if (!parsedNotesData[index]) return;

        if (field === 'keys') {
            parsedNotesData[index][field] = target.value.split(',').map(k => k.trim()).filter(Boolean);
        } else {
            parsedNotesData[index][field] = target.value;
        }
        updateJsonOutput();
    }
    
    function generateAndDownloadJson() {
        const title = titleInput.value.trim();
        if (!title) return alert("Please enter a title for the lesson.");
        
        const lessonJson = { title: title, notes: parsedNotesData };
        const jsonString = JSON.stringify(lessonJson, null, 2);
        jsonOutputTextarea.value = jsonString;
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function updateJsonOutput() {
        const title = titleInput.value.trim() || "Untitled Lesson";
        const lessonJson = { title: title, notes: parsedNotesData };
        jsonOutputTextarea.value = JSON.stringify(lessonJson, null, 2);
    }

    function vexflowKey(halftone) {
        const noteNames = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
        const octave = Math.floor(halftone / 12);
        const noteName = noteNames[halftone % 12];
        return `${noteName}/${octave}`;
    }

    function getVexflowDuration(length) {
        const durationMap = {
            "1": "w", "0.75": "hd", "0.5": "h", "0.375": "qd", "0.25": "q",
            "0.1875": "8d", "0.125": "8", "0.0625": "16", "0.03125": "32"
        };
        return durationMap[length.RealValue.toString()] || "q";
    }
});