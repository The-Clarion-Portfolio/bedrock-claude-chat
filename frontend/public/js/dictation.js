const dictationButton = document.querySelector('.dictation-button');
const transcriptTextarea = document.querySelector('textarea');

let websocket;
let audioContext;
let processorNode;
let sourceNode;
let mediaStream;
let isDictating = false;

function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws/transcribe`;
    websocket = new WebSocket(wsUrl);

    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const { transcript, is_final } = data;
        if (is_final) {
            transcriptTextarea.value += transcript + ' ';
        }
    };

    websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        alert('WebSocket connection error. Please try again.');
        stopDictation();
    };
}

async function initAudio() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContext = new AudioContext();

        await audioContext.audioWorklet.addModule('/js/processor.js');

        sourceNode = audioContext.createMediaStreamSource(mediaStream);

        processorNode = new AudioWorkletNode(audioContext, 'recorder-processor', {
            processorOptions: { bufferSize: 4096 }
        });

        processorNode.port.onmessage = (event) => {
            const audioData = event.data.audioData;
            const pcmData = encodePCM(audioData);
            if (websocket.readyState === WebSocket.OPEN) {
                websocket.send(pcmData);
            }
        };

        sourceNode.connect(processorNode);
    } catch (error) {
        console.error('Audio initialization error:', error);
        alert('Could not initialize audio. Please check your microphone settings.');
        stopDictation();
    }
}

function encodePCM(samples) {
    const buffer = new ArrayBuffer(samples.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < samples.length; i++) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        s = s < 0 ? s * 0x8000 : s * 0x7FFF;
        view.setInt16(i * 2, s, true); // true for little endian
    }
    return buffer;
}

async function startDictation() {
    isDictating = true;
    dictationButton.textContent = 'Stop Dictation';
    dictationButton.classList.add('active');

    initWebSocket();
    await initAudio();
}

function stopDictation() {
    isDictating = false;
    dictationButton.textContent = 'Start Dictation';
    dictationButton.classList.remove('active');

    if (processorNode) {
        processorNode.disconnect();
        processorNode = null;
    }
    if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send('END');
        websocket.close();
    }
}

dictationButton.onclick = async () => {
    if (!isDictating) {
        await startDictation();
    } else {
        stopDictation();
    }
};
