import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    ArrayNotEmpty,
    IsArray,
    IsInt,
    IsOptional,
    IsString,
    Matches,
    Max,
    Min,
} from "class-validator";

export class RegisterWorkerDto {
    @ApiProperty({ example: "worker-1" })
    @IsString()
    @Matches(/^[\w.-]{1,64}$/, {
        message:
            "workerId must be 1-64 characters of letters, digits, dot, dash or underscore",
    })
    workerId!: string;

    @ApiProperty({ example: ["send_email"], type: [String] })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    capabilities!: string[];

    @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 100 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    concurrency?: number;
}

export class WorkerResponseDto {
    @ApiProperty() workerId!: string;
    @ApiProperty({ type: [String] }) capabilities!: string[];
    @ApiProperty() concurrency!: number;
    @ApiProperty({ enum: ["ONLINE", "DEAD"] }) status!: string;
    @ApiProperty() currentJobCount!: number;
    @ApiProperty() registeredAt!: string;
    @ApiProperty() lastHeartbeatAt!: string;
}
