/** Errors carry a plain-language message a 13-year-old can read. */
export class ApiError extends Error {
  status: number;
  /** stable machine code so the client can branch (e.g. NO_PROFILE) */
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
