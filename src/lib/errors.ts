export class AppError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export function asError(error: unknown) {
  if (error instanceof AppError) return error;
  if (error instanceof Error && error.message === "BAD_ORIGIN") return new AppError("BAD_ORIGIN", 403);
  return null;
}
