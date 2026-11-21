
import {
  IsIn,
  IsInt,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class GenerateQuizDto {
  @IsUUID()
  topicId: string;

  @IsIn(['easy', 'medium', 'hard'])
  difficulty: 'easy' | 'medium' | 'hard';

  @IsInt()
  @Min(5)
  @Max(15)
  questionCount: number;
}
