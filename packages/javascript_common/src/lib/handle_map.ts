export class HandleMap<T> {
  private index: number = 1;
  private data: Record<number, T> = {};

  insert(value: T): number {
    const handle = this.index;
    this.index += 1;
    this.data[handle] = value;

    return handle;
  }

  get(handle: number): T | undefined {
    return this.data[handle];
  }

  remove(handle: number): T | undefined {
    const value = this.get(handle);
    if (value !== undefined) {
      delete this.data[handle];
    }

    return value;
  }
}
