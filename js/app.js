import { initializeMIDI } from './midi-handler.js';
import { MusicEngine } from './music-engine.js';
import { UIManager } from './ui-manager.js';

console.log("App started. Waiting for page to load.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

    // --- Get DOM Elements ---
    const playBtn = document.getElementById('play-pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const tempoSlider = document.getElementById('tempo-slider');

    // --- Initialize Core Components ---
    const uiManager = new UIManager();
    const musicEngine = new MusicEngine(uiManager);

    // --- Define Song Data ---
    const sampleSong = [
        { keys: ["c/4"], duration: "q" }, { keys: ["d/4"], duration: "q" },
        { keys: ["e/4"], duration: "q" }, { keys: ["f/4"], duration: "q" },
        { keys: ["g/4"], duration: "q" }, { keys: ["a/4"], duration: "q" },
        { keys: ["b/4"], duration: "q" }, { keys: ["c/5"], duration: "w" },
    ];
    musicEngine.loadSong(sampleSong);

    // --- MIDI Handling ---
    const onNotePlayed = (note, velocity) => {
        if (Tone.context.state !== 'running') {
            Tone.start();
        }
        musicEngine.handleNoteInput(note, velocity);
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