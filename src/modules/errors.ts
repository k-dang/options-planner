export class ServiceError extends Error {
  constructor(
    public readonly kind: "not-found" | "calculation",
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ServiceError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unexpected server error";
}
