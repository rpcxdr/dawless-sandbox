
export abstract class ModeBase {
  protected abstract modeName: string;

  constructor(protected readonly containerHeight: number) {}

  abstract play(key: string, stackHeight: number, boxCenterY: number): Promise<void>;

  dispose() {
    // subclasses may override if needed
  }
}