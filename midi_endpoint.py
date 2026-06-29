import atexit
import threading
import time
from dataclasses import dataclass

import numpy as np
from flask import Flask, jsonify, request
from pedalboard import Gain
from pedalboard.io import AudioStream

app = Flask(__name__)

SAMPLE_RATE = 48000
CHUNK_SIZE = 2048
PLAYBACK_GAIN_DB = -6.0
VOICE_VELOCITY = 0.5

stream_lock = threading.Lock()
stream = None
stream_error = None
voice_pool: list["Voice"] = []
voice_lock = threading.Lock()
stop_event = threading.Event()


@dataclass
class Voice:
    frequency: float
    started_at: float
    duration_s: float = 1.0
    velocity: float = VOICE_VELOCITY
    attack_s: float = 0.01
    release_s: float = 0.15
    phase: float = 0.0
    sample_index: int = 0

    def is_active(self, sample_rate: int) -> bool:
        return (self.sample_index / sample_rate) < self.duration_s

    def envelope(self, elapsed_s: float) -> float:
        if elapsed_s < self.attack_s:
            return elapsed_s / self.attack_s
        if elapsed_s < self.duration_s - self.release_s:
            return 1.0
        release_progress = (elapsed_s - (self.duration_s - self.release_s)) / self.release_s
        return max(0.0, 1.0 - release_progress)

    def render(self, chunk: np.ndarray, sample_rate: int) -> None:
        for index in range(len(chunk)):
            elapsed_s = self.sample_index / sample_rate
            if elapsed_s >= self.duration_s:
                continue

            env = self.envelope(elapsed_s)
            sample = np.sin(self.phase)
            chunk[index] += sample * env * self.velocity

            # Advance phase in radians: dtheta = 2*pi*freq / sample_rate
            self.phase += 2 * np.pi * self.frequency / sample_rate
            self.sample_index += 1


def frequency_from_midi(midi_note: int) -> float:
    return 440.0 * 2 ** ((midi_note - 69) / 12.0)


def render_audio_loop() -> None:
    global stream, stream_error

    if stream is None:
        if stream_error is not None:
            print(f"Audio stream unavailable: {stream_error}")
        return

    while not stop_event.is_set():
        chunk = np.zeros((CHUNK_SIZE, 2), dtype=np.float32)

        with voice_lock:
            active_voices = [voice for voice in voice_pool if voice.is_active(SAMPLE_RATE)]
            voice_pool[:] = active_voices

        for voice in active_voices:
            voice.render(chunk, SAMPLE_RATE)

        with stream_lock:
            stream.write(chunk, SAMPLE_RATE)

        time.sleep(0.001)


def initialize_audio_stream() -> None:
    global stream, stream_error
    try:
        # Prefer a "Speakers" device when available (avoids HDMI/display audio)
        preferred = None
        for name in AudioStream.output_device_names:
            if "speaker" in name.lower():
                preferred = name
                break

        output_name = preferred or AudioStream.default_output_device_name

        stream = AudioStream(
            output_device_name=output_name,
            sample_rate=SAMPLE_RATE,
            num_output_channels=2,
        )
        stream.plugins.append(Gain(gain_db=PLAYBACK_GAIN_DB))
        print(f"Audio stream ready on {output_name}")
        # Ensure the render loop is allowed to run
        stop_event.clear()
        audio_thread = threading.Thread(target=render_audio_loop, daemon=True)
        audio_thread.start()
    except Exception as exc:
        stream_error = exc
        print(f"Could not initialize AudioStream: {exc}")


initialize_audio_stream()
atexit.register(lambda: stop_event.set() or (stream.close() if stream is not None else None))


@app.post("/notes")
def receive_notes():
    payload = request.get_json(silent=True) or {}
    notes = payload.get("notes", [])

    if not isinstance(notes, list):
        return jsonify({"error": "Expected a JSON object with a 'notes' list."}), 400

    print(f"Received notes: {notes}")

    for midi_note in notes:
        if not isinstance(midi_note, (int, float)):
            continue

        with voice_lock:
            voice_pool.append(
                Voice(
                    frequency=frequency_from_midi(int(midi_note)),
                    started_at=time.time(),
                )
            )

    return jsonify({"received": notes})


@app.post("/test")
def play_test_tone():
    """Play a single test note (middle C) once by writing directly to the stream."""
    test_midi = 60

    if stream is None:
        return jsonify({"error": "Audio stream not initialized"}), 503

    freq = frequency_from_midi(test_midi)
    duration = 1.0
    t = np.linspace(0.0, duration, int(duration * SAMPLE_RATE), endpoint=False)
    sine = np.sin(2.0 * np.pi * freq * t)
    fade_len = max(1, int(SAMPLE_RATE * 0.01))
    envelope = np.ones_like(sine)
    envelope[:fade_len] = np.linspace(0.0, 1.0, fade_len)
    envelope[-fade_len:] = np.linspace(1.0, 0.0, fade_len)

    stereo = np.stack([sine * envelope * VOICE_VELOCITY, sine * envelope * VOICE_VELOCITY], axis=-1).astype(np.float32)

    with stream_lock:
        stream.write(stereo, SAMPLE_RATE)

    print(f"Played test note: {test_midi} directly to stream")
    return jsonify({"played": test_midi})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
