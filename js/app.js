import { initializeMIDI } from './midi-handler.js';
import { MusicEngine } from './music-engine.js';
import { UIManager } from './ui-manager.js';

console.log("App started. Waiting for page to load.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");
    
    // --- DOM Element References ---
    const playBtn = document.getElementById('play-pause-btn');
    const stopBtn = document.getElementById('stop-btn');

    // --- Initialize Core Components ---
    const uiManager = new UIManager();
    const musicEngine = new MusicEngine(uiManager);

    // --- Define Sample Song ---
    const sampleSong = [
        { keys: ["c/4"], duration: "q" },
        { keys: ["d/4"], duration: "q" },
        { keys: ["e/4"], duration: "q" },
        { keys: ["f/4"], duration: "q" },
        { keys: ["g/4"], duration: "q" },
        { keys: ["a/4"], duration: "q" },
        { keys: ["b/4"], duration: "q" },
        { keys: ["c/5"], duration: "w" },
    ];

    // --- Load Initial Song after Sampler is ready ---
    // The MusicEngine constructor now takes a callback for when the sampler is loaded
    musicEngine.sampler.onload = () => {
        console.log("Sampler loaded, loading song...");
        musicEngine.loadSong(sampleSong);
    };

    // --- MIDI Input Handler ---
    const onNotePlayed = (note, velocity) => {
        // Resume AudioContext on user interaction
        if (Tone.context.state !== 'running') {
            Tone.context.resume();
        }
        musicEngine.handleNoteInput(note, velocity);
    };
    initializeMIDI(onNotePlayed);

    // --- UI Event Listeners ---
    playBtn.addEventListener('click', () => {
        // Resume AudioContext on user interaction
        if (Tone.context.state !== 'running') {
            Tone.context.resume();
        }
        musicEngine.play();
    });

    stopBtn.addEventListener('click', () => {
        musicEngine.stop();
    });
});