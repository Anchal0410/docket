import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsIn,
    IsInt,
    IsISO8601,
    IsObject,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from "class-validator";

// ── Request DTOs ─────────────────────────────────────────────────────────────

export class SubmitJobDto {
    @ApiProperty({ example: "send_email" })
    @IsString()
    type!: string;

    @ApiProperty({ example: { to: "user@example.com" } })
    @IsObject()
    payload!: Record<string, unknown>;

    @ApiPropertyOptional({
        description: "0 = LOW, 1 = MEDIUM, 2 = HIGH",
        default: 1,
        enum: [0, 1, 2],
    })
    @IsOptional()
    @IsIn([0, 1, 2])
    priority?: 0 | 1 | 2;

    @ApiPropertyOptional({
        description: "Seconds to wait before the job becomes claimable.",
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    delay?: number;

    @ApiPropertyOptional({
        description:
            "ISO-8601 timestamp to run at. Takes precedence over `delay`.",
    })
    @IsOptional()
    @IsISO8601()
    runAt?: string;

    @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 50 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(50)
    maxAttempts?: number;

    @ApiPropertyOptional({
        description: "Submitting the same key twice returns the same job.",
    })
    @IsOptional()
    @IsString()
    idempotencyKey?: string;
}

export class ClaimJobsDto {
    @ApiProperty({ example: "worker-1" })
    @IsString()
    workerId!: string;

    @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 100 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    batchSize?: number;
}

export class AckJobDto {
    @ApiProperty({ example: "worker-1" })
    @IsString()
    workerId!: string;

    @ApiPropertyOptional({ description: "Handler result, stored on the job." })
    @IsOptional()
    @IsObject()
    result?: Record<string, unknown>;
}

export class FailJobDto {
    @ApiProperty({ example: "worker-1" })
    @IsString()
    workerId!: string;

    @ApiProperty({ example: "SMTP connection timed out" })
    @IsString()
    @MaxLength(2000)
    error!: string;
}

export class RenewLeaseDto {
    @ApiProperty({ example: "worker-1" })
    @IsString()
    workerId!: string;
}

// ── Response DTOs ────────────────────────────────────────────────────────────

export class JobResponseDto {
    @ApiProperty() id!: string;
    @ApiProperty() type!: string;
    @ApiProperty() payload!: Record<string, unknown>;
    @ApiProperty() priority!: number;
    @ApiProperty({
        enum: [
            "PENDING",
            "QUEUED",
            "PROCESSING",
            "COMPLETED",
            "DEAD_LETTER",
            "CANCELLED",
        ],
    })
    status!: string;
    @ApiProperty() runAt!: string;
    @ApiProperty() attempts!: number;
    @ApiProperty() maxAttempts!: number;
    @ApiPropertyOptional({ nullable: true }) lastError!: string | null;
    @ApiPropertyOptional({ nullable: true }) result!: Record<
        string,
        unknown
    > | null;
    @ApiProperty() createdAt!: string;
    @ApiPropertyOptional({ nullable: true }) startedAt!: string | null;
    @ApiPropertyOptional({ nullable: true }) completedAt!: string | null;
}
