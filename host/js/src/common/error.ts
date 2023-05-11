export abstract class BaseError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
  }
}

export class PerformError extends BaseError {
  constructor(public readonly errorResult: unknown) {
    super(PerformError.name, JSON.stringify(errorResult)); // TODO: get reasonable error message
  }
}

export class UnexpectedError extends BaseError {
  constructor(name: string, message: string) {
    super(name, message);
  }
}