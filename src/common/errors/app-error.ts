export class AppError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly details?: unknown;

    constructor(
        code: string,
        statusCode: number,
        message: string,
        details?: unknown,
    ) {
        super(message);
        this.name = "AppError";
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }

    static notFound(resource: string): AppError {
        return new AppError("NOT_FOUND", 404, `${resource} not found`);
    }

    static conflict(message: string): AppError {
        return new AppError("CONFLICT", 409, message);
    }

    static badRequest(message: string, details?: unknown): AppError {
        return new AppError("BAD_REQUEST", 400, message, details);
    }

    static internal(message = "Internal server error"): AppError {
        return new AppError("INTERNAL_ERROR", 500, message);
    }
}
