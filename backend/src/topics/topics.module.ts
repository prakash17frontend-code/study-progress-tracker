
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Topic } from '../database/entities/topic.entity';
import { Goal } from '../database/entities/goal.entity';
import { TopicPrerequisite } from '../database/entities/topic-prerequisite.entity';

import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';
import { AppSetting } from '../database/entities/app-setting.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Topic,
      Goal,
      TopicPrerequisite,
      AppSetting,
      AuthModule,
    ]),
  ],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
