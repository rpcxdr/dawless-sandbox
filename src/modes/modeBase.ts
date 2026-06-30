import { Box } from '../box';

export abstract class ModeBase {
  protected abstract modeName: string;

  constructor(protected readonly containerHeight: number) {}

  abstract play(box: Box, boxes: Box[]): Promise<void>;

  dispose() {
    // subclasses may override if needed
  }
}