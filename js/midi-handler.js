// This file will handle all MIDI communication.

let noteCallback = null;

export function initializeMIDI(callback) {
    noteCallback = callback;
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
            .then(onMIDISuccess, onMIDIFailure);
    } else {
        console.warn("Web MIDI API is not supported in this browser.");
    }
}

function onMIDISuccess(midiAccess) {
    console.log("MIDI ready!");
    const midiInputSelector = document.getElementById('midi-input-selector');
    const inputs = midiAccess.inputs.values();

    for (let input of inputs) {
        const option = document.createElement('option');
        option.value = input.id;
        option.textContent = input.name;
        midiInputSelector.appendChild(option);
        console.log(`Found MIDI input: ${input.name}`);
    }

    midiAccess.inputs.forEach(input => {
        input.onmidimessage = getMIDIMessage;
    });
}

function onMIDIFailure() {
    console.error("Could not access your MIDI devices.");
}

function getMIDIMessage(message) {
    const [command, note, velocity] = message.data;

    // command 144 = noteOn, command 128 = noteOff
    if (command === 144 && velocity > 0) {
        if (noteCallback) {
            noteCallback(note, true); // Note On
        }
    } else if (command === 128 || (command === 144 && velocity === 0)) {
        if (noteCallback) {
            noteCallback(note, false); // Note Off
        }
    }
}