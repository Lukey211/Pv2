import { initializeMIDI } from './midi-handler.js';
import { MusicEngine } from './music-engine.js';
import { UIManager } from './ui-manager.js';
import { KeyboardManager } from './keyboard-manager.js';

console.log("App started. Waiting for page to load.");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed.");

    const playBtn = document.getElementById('play-pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const tempoSlider = document.getElementById('tempo-slider');
    const handSelector = document.getElementById('hand-selector');

    const uiManager = new UIManager();
    const keyboardManager = new KeyboardManager();
    const musicEngine = new MusicEngine(uiManager, keyboardManager);

    const sampleSong = [
        { keys: ["c/4"], duration: "q", hand: "right" }, { keys: ["c/3"], duration: "q", hand: "left" },
        { keys: ["d/4"], duration: "q", hand: "right" }, { keys: ["d/3"], duration: "q", hand: "left" },
        { keys: ["e/4"], duration: "q", hand: "right" }, { keys: ["e/3"], duration: "q", hand: "left" },
        { keys: ["f/4"], duration: "q", hand: "right" }, { keys: ["f/3"], duration: "q", hand: "left" },
    ];
    musicEngine.loadSong(sampleSong);

    const onNoteEvent = (note, isNoteOn) => {
        if (Tone.context.state !== 'running') Tone.start();
        musicEngine.handleUserKeyPress(note, isNoteOn);
        if (isNoteOn) musicEngine.handleNoteInput(note);
    };
    initializeMIDI(onNoteEvent);

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
});