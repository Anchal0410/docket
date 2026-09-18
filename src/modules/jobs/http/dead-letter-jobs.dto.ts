import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Max, Min } from "class-validator";

import { JobResponseDto } from "./jobs.dto.js";

export class ListDeadLetterJobsDto {
    @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @ApiPropertyOptional({ default: 0, minimum: 0 })
    @IsOptional()
    @IsInt()
    @Min(0)
    offset?: number;
}

export class DeadLetterJobsResponseDto {
    @ApiProperty({ type: [JobResponseDto] }) jobs!: JobResponseDto[];
    @ApiProperty() total!: number;
}
