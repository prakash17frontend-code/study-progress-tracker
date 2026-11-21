
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { TopicRecommendationService } from './topic-recommendation.service';

import { Goal } from '../database/entities/goal.entity';
import { Topic } from '../database/entities/topic.entity';

import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Goal, Topic]),
    AuthModule,
  ],
  controllers: [AIController],
  providers: [
    AIService,
    TopicRecommendationService,
  ],
})
export class AIModule {}
