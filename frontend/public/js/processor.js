// processor.js

class RecorderProcessor extends AudioWorkletProcessor {
    process(inputs) {
        const input = inputs[0];
        if (input.length > 0) {
            const channelData = input[0];
            const audioData = new Float32Array(channelData);
            this.port.postMessage({ audioData: audioData });
        }
        return true;
    }
}

registerProcessor('recorder-processor', RecorderProcessor);
