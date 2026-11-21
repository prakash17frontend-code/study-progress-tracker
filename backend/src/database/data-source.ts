
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

import { User } from './entities/user.entity';
import { Goal } from './entities/goal.entity';
import { Topic } from './entities/topic.entity';
import { TopicPrerequisite } from './entities/topic-prerequisite.entity';
import { StudySession } from './entities/study-session.entity';
import { AppSetting } from './entities/app-setting.entity';

dotenv.config({
  path: resolve(__dirname, '../../../.env.local'),
});

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL_UNPOOLED,
  entities: [
    User,
    Goal,
    Topic,
    TopicPrerequisite,
    StudySession,
    AppSetting,
  ],
  migrations: [resolve(__dirname, 'migrations/*{.js,.ts}')],
  synchronize: false,
  ssl: {
    rejectUnauthorized: true,
  },
  logging: true,
});
