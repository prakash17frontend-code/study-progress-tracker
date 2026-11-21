
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StudySession } from '../database/entities/study-session.entity';
import { Topic } from '../database/entities/topic.entity';
import { AppSetting } from '../database/entities/app-setting.entity';

import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StudySession,
      Topic,
      AppSetting,
      AuthModule,
    ]),
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
