
export abstract class ModeBase {
  protected abstract modeName: string;

  constructor(protected readonly containerHeight: number) {}

  abstract play(box: any, boxes: any): Promise<void>;

  dispose() {
    // subclasses may override if needed
  }
}