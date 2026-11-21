
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class GenerateStudyPlanDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(12)
  availableHoursPerDay: number;

  @IsDateString()
  targetDate: string;

  @IsOptional()
  @IsUUID()
  goalId?: string;
}
