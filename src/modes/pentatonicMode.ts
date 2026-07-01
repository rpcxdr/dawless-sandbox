import * as Tone from 'tone';
import { ModeBase } from './modeBase';
import { Box } from '../box';

export class PentatonicMode extends ModeBase {
  private melodySynth: Tone.PolySynth<Tone.Synth> | null = null;
  private harmonySynth: Tone.PolySynth<Tone.Synth> | null = null;
  private bassSynth: Tone.PolySynth<Tone.Synth> | null = null;
  private rhythmSynth: Tone.PolySynth<Tone.Synth> | null = null;
  protected readonly modeName = 'PentatonicMode';

  constructor(containerHeight: number) {
    super(containerHeight);

    this.melodySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 0.2 },
    }).toDestination();

    this.harmonySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.35, sustain: 0.15, release: 0.2 },
    }).toDestination();

    this.bassSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.002, decay: 0.5, sustain: 0.25, release: 0.3 },
    }).toDestination();

    this.rhythmSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.05, release: 0.05 },
    }).toDestination();
  }

  dispose() {
    this.melodySynth?.dispose();
    this.melodySynth = null;
    this.harmonySynth?.dispose();
    this.harmonySynth = null;
    this.bassSynth?.dispose();
    this.bassSynth = null;
    this.rhythmSynth?.dispose();
    this.rhythmSynth = null;
  }

  async play(box: Box, _boxes: Box[]) {
    const key = 'C4';
    const stackHeight = box.stackHeight;
    const boxCenterY = box.y + 25;

    const trackHeight = this.containerHeight > 0 ? this.containerHeight / 4 : 0;
    const trackIndex = this.containerHeight > 0 ? Math.min(Math.max(Math.floor(boxCenterY / trackHeight), 0), 3) : 0;

    const synth =
      trackIndex === 0
        ? this.melodySynth
        : trackIndex === 1
          ? this.harmonySynth
          : trackIndex === 2
            ? this.bassSynth
            : this.rhythmSynth;

    if (!synth) {
      return;
    }

    const baseMidi = Tone.Frequency(key).toMidi();
    const scaleDegrees = [0, 2, 4, 7, 9];
    const degreeOffset = Math.max(stackHeight - 1, 0);
    const semitoneOffset = scaleDegrees[degreeOffset % 5] + Math.floor(degreeOffset / 5) * 12;
    const targetNote = Tone.Frequency(baseMidi + semitoneOffset, 'midi').toNote();
    synth.triggerAttackRelease(targetNote, '8n');
  }
}
