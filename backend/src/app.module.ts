
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GoalsModule } from './goals/goals.module';
import { TopicsModule } from './topics/topics.module';
import { SessionsModule } from './sessions/sessions.module';
import { ProgressModule } from './progress/progress.module';
import { SettingsModule } from './settings/settings.module';
import { AIModule } from './ai/ai.module';

dotenv.config({
  path: resolve(__dirname, '../../.env.local'),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolve(__dirname, '../../.env.local'),
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      ssl: {
        rejectUnauthorized: true,
      },
    }),

    AuthModule,

    UsersModule,

    GoalsModule,

    TopicsModule,

    SessionsModule,

    ProgressModule,

    SettingsModule,

    AIModule,
  ],
})
export class AppModule {}
