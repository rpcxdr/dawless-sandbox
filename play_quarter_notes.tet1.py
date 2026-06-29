import threading
import time

import numpy as np
from pedalboard import Gain
from pedalboard.io import AudioStream

is_ascending = True


def frequency_from_midi(midi_note: int) -> float:
    """Convert a MIDI note number to frequency in Hz."""
    return 440.0 * 2 ** ((midi_note - 69) / 12.0)


def make_sine_tone(frequency: float, duration_s: float, sample_rate: int) -> np.ndarray:
    """Generate a stereo sine tone buffer."""
    t = np.linspace(0.0, duration_s, int(duration_s * sample_rate), endpoint=False)
    sine = np.sin(2.0 * np.pi * frequency * t)
    envelope = np.ones_like(sine)
    fade_len = int(sample_rate * 0.01)
    if fade_len > 0:
        envelope[:fade_len] = np.linspace(0.0, 1.0, fade_len)
        envelope[-fade_len:] = np.linspace(1.0, 0.0, fade_len)
    stereo = np.stack([sine * envelope, sine * envelope], axis=-1)
    return stereo.astype(np.float32)


def make_note_sequence_audio(notes: list[int], sample_rate: int, quarter_duration: float) -> np.ndarray:
    buffers = [
        make_sine_tone(frequency_from_midi(midi_note), quarter_duration, sample_rate)
        for midi_note in notes
    ]
    audio = np.concatenate(buffers, axis=0)
    audio *= 0.05  # reduce overall playback volume by 20x
    return audio


def main() -> None:
    sample_rate = 48000
    bpm = 120
    quarter_duration = 60.0 / bpm

    ascending_notes = [60, 64, 67, 72]  # C4, E4, G4, C5
    descending_notes = list(reversed(ascending_notes))

    audio_up = make_note_sequence_audio(ascending_notes, sample_rate, quarter_duration)
    audio_down = make_note_sequence_audio(descending_notes, sample_rate, quarter_duration)

    output_device = AudioStream.default_output_device_name
    print(f"Playing through output device: {output_device}")

    stop_event = threading.Event()

    def play_loop() -> None:
        while not stop_event.is_set():
            audio = audio_up if is_ascending else audio_down
            stream.write(audio, sample_rate)

    def toggle_direction_loop() -> None:
        global is_ascending
        while not stop_event.is_set():
            time.sleep(5.0)
            is_ascending = not is_ascending
            direction = "ascending" if is_ascending else "descending"
            print(f"Direction changed: {direction}")

    with AudioStream(output_device_name=output_device, sample_rate=sample_rate, num_output_channels=2) as stream:
        player_thread = threading.Thread(target=play_loop, daemon=True)
        toggler_thread = threading.Thread(target=toggle_direction_loop, daemon=True)
        player_thread.start()
        toggler_thread.start()

        print("Playing forever in a background thread. Press Ctrl-C to stop.")
        try:
            while not stop_event.is_set():
                time.sleep(1.0)
        except KeyboardInterrupt:
            print("Stopping playback...")
            stop_event.set()
            player_thread.join()
            toggler_thread.join()


if __name__ == "__main__":
    main()
