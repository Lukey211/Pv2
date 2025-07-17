import { initializeMIDI } from './midi-handler.js';
import { MusicEngine } from './music-engine.js';
import { UIManager } from './ui-manager.js';
import { KeyboardManager } from './keyboard-manager.js';

console.log("App started. Waiting for page to load.");

// --- Data Loading Functions ---
async function loadLesson(lessonUrl, musicEngine) {
    try {
        const response = await fetch(lessonUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const lessonData = await response.json();
        console.log(`Lesson "${lessonData.title}" loaded successfully.`);
        musicEngine.loadSong(lessonData.notes);
    } catch (error) {
        console.error("Could not load lesson:", error);
    }
}

async function initializeLessons(lessonSelector, musicEngine) {
    try {
        const response = await fetch('assets/lessons.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const lessons = await response.json();

        lessons.forEach(lesson => {
            const option = document.createElement('option');
            option.value = lesson.path;
            option.textContent = lesson.title;
            lessonSelector.appendChild(option);
        });

        // Load the first lesson by default
        if (lessons.length > 0) {
            await loadLesson(lessons[0].path, musicEngine);
        }
    } catch (error) {
        console.error("Could not initialize lessons:", error);
    }
}

// --- Main Application Setup ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed.");

    // Get DOM Elements
    const playBtn = document.getElementById('play-pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const tempoSlider = document.getElementById('tempo-slider');
    const handSelector = document.getElementById('hand-selector');
    const lessonSelector = document.getElementById('lesson-selector');

    // Initialize Core Components
    const uiManager = new UIManager();
    const keyboardManager = new KeyboardManager();
    const musicEngine = new MusicEngine(uiManager, keyboardManager);

    // Initialize MIDI
    const onNoteEvent = (note, isNoteOn) => {
        if (Tone.context.state !== 'running') Tone.start();
        musicEngine.handleUserKeyPress(note, isNoteOn);
        if (isNoteOn) musicEngine.handleNoteInput(note);
    };
    initializeMIDI(onNoteEvent);

    // Load lessons and populate the dropdown
    await initializeLessons(lessonSelector, musicEngine);

    // --- UI Event Listeners ---
    playBtn.addEventListener('click', async () => {
        if (Tone.context.state !== 'running') await Tone.start();
        musicEngine.play();
    });

    stopBtn.addEventListener('click', () => musicEngine.stop());

    tempoSlider.addEventListener('input', () => {
        musicEngine.setTempo(parseFloat(tempoSlider.value));
    });

    handSelector.addEventListener('change', () => {
        musicEngine.setPracticeHand(handSelector.value);
    });

    lessonSelector.addEventListener('change', () => {
        loadLesson(lessonSelector.value, musicEngine);
    });
});