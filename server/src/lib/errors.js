export class AppError extends Error {
  constructor(code, message, httpStatus = 400) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
