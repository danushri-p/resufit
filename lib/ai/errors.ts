export class AIUnavailableError extends Error {
  constructor() {
    super("The AI provider is not reachable.");
    this.name = "AIUnavailableError";
  }
}

export class AIRequestError extends Error {
  constructor(
    readonly status: number,
    message = "The AI provider could not complete the request.",
  ) {
    super(message);
    this.name = "AIRequestError";
  }
}

export class AITimeoutError extends Error {
  constructor() {
    super("The AI provider took too long to respond.");
    this.name = "AITimeoutError";
  }
}

export class InvalidAIOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAIOutputError";
  }
}
