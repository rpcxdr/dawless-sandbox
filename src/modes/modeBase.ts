import { Box } from '../box';

export abstract class ModeBase {
  public modeName: string;

  constructor(protected readonly containerHeight: number) {
    this.modeName = 'Mode';
  }

  abstract play(box: Box, boxes: Box[]): Promise<void>;

  dispose() {
    // subclasses may override if needed
  }
}