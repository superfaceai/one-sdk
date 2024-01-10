export * from './lib/error';

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

export class ValidationError extends BaseError {
  constructor(message: string) {
    super(ValidationError.name, message);
  }
}

export class UnexpectedError extends BaseError {
  constructor(name: string, message: string) {
    super(name, message);
  }
}

export class UninitializedError extends BaseError {
  constructor() {
    super('Uninitialized', "OneClient isn't initialized.");
  }
}

export class HostError extends Error {
  constructor(public readonly code: ErrorCode, message: string) {
    super(message);
    this.name = code;
  }
}

/// Core counterpart in core/host_to_core_std/src/unstable/mod.rs
export enum ErrorCode {
  NetworkError = 'network:error', // generic network error
  NetworkConnectionRefused = 'network:ECONNREFUSED',
  NetworkHostNotFound = 'network:ENOTFOUND',
  NetworkInvalidUrl = 'network:invalid_url'
}