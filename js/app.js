import { initializeMIDI } from './midi-handler.js';
import { MusicEngine } from './music-engine.js';
import { UIManager } from './ui-manager.js';
import { KeyboardManager } from './keyboard-manager.js';

console.log("App started. Waiting for page to load.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

    // --- Get DOM Elements ---
    const playBtn = document.getElementById('play-pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const tempoSlider = document.getElementById('tempo-slider');

    // --- Initialize Core Components ---
    const uiManager = new UIManager();
    const keyboardManager = new KeyboardManager();
    const musicEngine = new MusicEngine(uiManager, keyboardManager);

    // --- Define Song Data with Hand Information ---
    const sampleSong = [
        { keys: ["c/4"], duration: "q", hand: "right" },
        { keys: ["c/3"], duration: "q", hand: "left" },
        { keys: ["d/4"], duration: "q", hand: "right" },
        { keys: ["d/3"], duration: "q", hand: "left" },
        { keys: ["e/4"], duration: "q", hand: "right" },
        { keys: ["e/3"], duration: "q", hand: "left" },
        { keys: ["f/4"], duration: "q", hand: "right" },
        { keys: ["f/3"], duration: "q", hand: "left" },
    ];
    musicEngine.loadSong(sampleSong);

    // --- MIDI Handling ---
    const onNotePlayed = (note, isNoteOn) => {
        if (Tone.context.state !== 'running') {
            Tone.start();
        }
        // Handle visual feedback for user presses (orange keys)
        musicEngine.handleUserKeyPress(note, isNoteOn);
        
        // Only check for correctness on "note on" events
        if (isNoteOn) {
            musicEngine.handleNoteInput(note);
        }
    };
    initializeMIDI(onNotePlayed);

    // --- UI Event Listeners ---
    playBtn.addEventListener('click', async () => {
        if (Tone.context.state !== 'running') {
            await Tone.start();
            console.log("AudioContext started!");
        }
        musicEngine.play();
    });

    stopBtn.addEventListener('click', () => {
        musicEngine.stop();
    });

    tempoSlider.addEventListener('input', () => {
        const tempoRate = parseFloat(tempoSlider.value);
        musicEngine.setTempo(tempoRate);
    });
});