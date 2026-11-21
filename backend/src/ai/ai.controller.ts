
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AIService } from './ai.service';
import { TopicRecommendationService } from './topic-recommendation.service';
import { GenerateStudyPlanDto } from './dto/generate-study-plan.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly topicRecommendationService: TopicRecommendationService,
  ) {}

  @Post('study-plan')
  @Roles(UserRole.LEARNER)
  generateStudyPlan(
    @Req() req: { user: { id: string } },
    @Body() body: GenerateStudyPlanDto,
  ) {
    return this.aiService.generateStudyPlan(
      req.user.id,
      body,
    );
  }

  @Get('topic-recommendations')
  @Roles(UserRole.LEARNER)
  getTopicRecommendations(
    @Req() req: { user: { id: string } },
  ) {
    return this.topicRecommendationService.getRecommendations(
      req.user.id,
    );
  }
}
