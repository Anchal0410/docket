import { ValidationPipe } from "@nestjs/common";

export function globalValidationPipe(): ValidationPipe {
    return new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    });
}
