import * as Tone from 'tone';
import { ModeBase } from './modeBase';
import { Box } from '../box';
import { findMostRecentBox } from '../boxUtils';

const circleOfFifths = [60, 67, 62, 69, 64, 71, 66, 61, 68, 63, 70, 65];

/*const modes = [
  [0,2,4,5,7,9,11], // 0 Ionian
  [0,2,3,5,7,9,10], // 1 Dorian
  [0,1,3,5,7,8,10], // 2 Phrygian
  [0,2,4,6,7,9,11], // 3 Lydian
  [0,2,4,5,7,9,10], // 4 Mixolydian
  [0,2,3,5,7,8,10], // 5 Aeolian
  [0,1,3,5,6,8,10]  // 6 Locrian
];*/
const modes = [ // Ordered by popularity in Western music
  [0,2,4,5,7,9,10], // 4 Mixolydian
  [0,2,4,5,7,9,11], // 0 Ionian
  [0,2,3,5,7,8,10], // 5 Aeolian
  [0,2,3,5,7,9,10], // 1 Dorian
  [0,1,3,5,7,8,10], // 2 Phrygian
  [0,2,4,6,7,9,11], // 3 Lydian
  [0,1,3,5,6,8,10]  // 6 Locrian
];

const harmonyScaleDegrees = [0, 2, 4, 5, 7, 9, 11];


export class KeyAndModeControlMode  extends ModeBase {
  private melodySynth: Tone.PolySynth<Tone.Synth> | null = null;
  private harmonySynth: Tone.PolySynth<Tone.Synth> | null = null;
  private bassSynth: Tone.PolySynth<Tone.Synth> | null = null;
  private rhythmSynth: Tone.PolySynth<Tone.Synth> | null = null;
  protected readonly modeName = 'KeyAndModeControl';

  constructor(containerHeight: number) {
    super(containerHeight);

    this.melodySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.4, sustain: 0.2, release: 0.2 },
    }).toDestination();

    this.harmonySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 2.0, sustain: 0.01, release: 0.2 },
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

  async play(box: Box, boxes: Box[]) {
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }

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

    if (trackIndex === 0 ) {
      const bassStackHeight = findMostRecentBox(boxes, box, 2, this.containerHeight)?.stackHeight || 1;
      const bassRootMidi = circleOfFifths[(bassStackHeight-1) % 12];

      const harmonyStackHeight = findMostRecentBox(boxes, box, 1, this.containerHeight)?.stackHeight || 1;
      const harmonyScaleDegrees = modes[(harmonyStackHeight-1) % 7];


      const degreeOffset = Math.max(stackHeight - 1, 0);
      const semitoneOffset = harmonyScaleDegrees[degreeOffset % 7] + Math.floor(degreeOffset / 7) * 12;
      
      const targetMidi = bassRootMidi + semitoneOffset;

      const targetNote = Tone.Frequency(targetMidi, 'midi').toNote();
      synth.triggerAttackRelease(targetNote, '8n');
    } else if (trackIndex === 1) {
      const bassStackHeight = findMostRecentBox(boxes, box, 2, this.containerHeight)?.stackHeight || 1;
      const bassRootMidi = circleOfFifths[(bassStackHeight-1) % 12];

      const harmonyScaleDegrees = modes[(stackHeight-1) % 7];

      const chordDegrees = [0, 2, 4]; // Triad: root, third, fifth
      //const chordDegrees = [0, 2, 4, 6, 8]; // Triad: root, third, fifth
      for(const chordDegree of chordDegrees) {
        const semitoneOffset = harmonyScaleDegrees[chordDegree % 7] + Math.floor(chordDegree / 7) * 12;
        const targetMidi = bassRootMidi + semitoneOffset;
        const targetNote = Tone.Frequency(targetMidi, 'midi').toNote();
        synth.triggerAttackRelease(targetNote, '2n');
      }
    } else {
      const targetMidi = circleOfFifths[(stackHeight-1) % 12];
      const targetNote = Tone.Frequency(targetMidi, 'midi').toNote();
      synth.triggerAttackRelease(targetNote, '8n');
    }

 
  }
}
