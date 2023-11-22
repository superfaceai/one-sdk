/** Async mutex allows us to synchronize multiple async tasks.
 * 
 * For example, if a perform is in-flight but is waiting for I/O the async task is suspended. If at the same time
 * the periodic timer fires, this could cause core to be invoked twice within the same asyncify context, causing undefined behavior.
 * 
 * We can avoid this by synchronizing over core.
 * 
 * Note that this is not thread safe (concurrent), but merely task safe (asynchronous).
 */
export class AsyncMutex<T> {
  /** Promise to be awaited to synchronize between tasks. */
  private condvar: Promise<void>;
  /** Indicator of whether the mutex is currently locked. */
  private isLocked: boolean;
  private value: T;

  constructor(value: T) {
    this.condvar = Promise.resolve();
    this.isLocked = false;
    this.value = value;
  }

  /**
   * Get the protected value without respecting the lock.
   * 
   * This is unsafe, but it is needed to get access to memory in sf_host imports.
   */
  get unsafeValue(): T {
    return this.value;
  }

  public async withLock<R>(fn: (value: T) => R): Promise<Awaited<R>> {
    do {
      // Under the assumption that we do not have concurrency it can never happen that two tasks
      // pass over the condition of this loop and think they both have a lock - that would imply there exists task preemption in synchronous code.
      //
      // If there ever is threading or task preemption, we will need to use other means (atomics, spinlocks).
      await this.condvar;
    } while (this.isLocked);

    this.isLocked = true;
    let notify: () => void;
    this.condvar = new Promise((resolve) => { notify = resolve; });

    try {
      return await fn(this.value);
    } finally {
      this.isLocked = false;
      notify!();
    }
  }
}