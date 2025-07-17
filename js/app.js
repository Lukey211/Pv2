import { initializeMIDI } from './midi-handler.js';
import { MusicEngine } from './music-engine.js';
import { UIManager } from './ui-manager.js';
import { KeyboardManager } from './keyboard-manager.js';

let musicEngine;
let allLessons = [];

async function startExercise(lessonData) {
    if (lessonData.type === 'song') {
        try {
            const response = await fetch(lessonData.path);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const songData = await response.json();
            musicEngine.startExercise({ ...lessonData, notes: songData.notes });
        } catch (error) {
            console.error("Could not load song:", error);
        }
    } else {
        musicEngine.startExercise(lessonData);
    }
}

async function initializeApp() {
    console.log("DOM fully loaded and parsed.");

    const playBtn = document.getElementById('play-pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const tempoSlider = document.getElementById('tempo-slider');
    const handSelector = document.getElementById('hand-selector');
    const lessonSelector = document.getElementById('lesson-selector');

    const onNoteSelected = (noteIndex) => musicEngine.handleNoteSelection(noteIndex);

    const uiManager = new UIManager(onNoteSelected);
    const keyboardManager = new KeyboardManager();
    musicEngine = new MusicEngine(uiManager, keyboardManager);

    const onNoteEvent = (note, isNoteOn) => {
        if (Tone.context.state !== 'running') Tone.start();
        musicEngine.handleUserKeyPress(note, isNoteOn);
        if (isNoteOn) musicEngine.handleNoteInput(note);
    };
    initializeMIDI(onNoteEvent);

    try {
        const response = await fetch('assets/lessons.json');
        if (!response.ok) throw new Error(`HTTP error!`);
        allLessons = await response.json();

        allLessons.forEach((lesson, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = lesson.title;
            lessonSelector.appendChild(option);
        });

        if (allLessons.length > 0) await startExercise(allLessons[0]);

    } catch (error) {
        console.error("Could not initialize lessons:", error);
    }

    playBtn.addEventListener('click', async () => {
        if (Tone.context.state !== 'running') await Tone.start();
        musicEngine.play();
    });
    stopBtn.addEventListener('click', () => musicEngine.stop());
    tempoSlider.addEventListener('input', () => musicEngine.setTempo(parseFloat(tempoSlider.value)));
    handSelector.addEventListener('change', () => musicEngine.setPracticeHand(handSelector.value));
    lessonSelector.addEventListener('change', (e) => {
        const selectedLesson = allLessons[e.target.value];
        startExercise(selectedLesson);
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);