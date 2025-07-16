import { initializeMIDI } from './midi-handler.js';
import { MusicEngine } from './music-engine.js';
import { UIManager } from './ui-manager.js';

console.log("App started. Waiting for page to load.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

    // Initialize all the core components
    const uiManager = new UIManager();
    const musicEngine = new MusicEngine(uiManager);

    // Define our sample song
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

    // Load the song into the engine
    musicEngine.loadSong(sampleSong);

    // The MIDI handler will call this function whenever a note is played
    const onNotePlayed = (note, velocity) => {
        musicEngine.handleNoteInput(note, velocity);
    };

    // Initialize MIDI and pass the callback function
    initializeMIDI(onNotePlayed);

    // TODO: Set up UI event listeners (buttons, sliders)
});