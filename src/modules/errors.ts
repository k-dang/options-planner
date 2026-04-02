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
