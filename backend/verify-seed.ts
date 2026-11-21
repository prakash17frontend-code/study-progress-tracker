
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';

import { User } from './src/database/entities/user.entity';
import { Goal } from './src/database/entities/goal.entity';
import { Topic } from './src/database/entities/topic.entity';
import { StudySession } from './src/database/entities/study-session.entity';
import { TopicPrerequisite } from './src/database/entities/topic-prerequisite.entity';
import { AppSetting } from './src/database/entities/app-setting.entity';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

async function verify() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User, Goal, Topic, StudySession, TopicPrerequisite, AppSetting],
    synchronize: false,
    ssl: { rejectUnauthorized: true },
  });

  await ds.initialize();

  try {
    const user = await ds.getRepository(User).findOne({
      where: { email: 'seed.learner@studyflow.com' },
    });

    if (!user) throw new Error('Demo learner not found');

    const goals = await ds.getRepository(Goal).find({
      where: { learner: { id: user.id } },
      relations: {
        topics:true,
      },
    });

    const topics = goals.flatMap(goal => goal.topics);

    const sessions = await ds.getRepository(StudySession).count({
      where: { learner: { id: user.id } },
    });

    const prerequisites = await ds.getRepository(TopicPrerequisite)
      .createQueryBuilder('p')
      .innerJoin('p.topic', 'topic')
      .innerJoin('topic.goal', 'goal')
      .where('goal.learnerId = :id', { id: user.id })
      .getCount();

    console.log('\n--- SEED VERIFICATION ---');
    console.log('Learner:', user.email);
    console.log('Goals:', goals.length);
    console.log('Topics:', topics.length);
    console.log('Prerequisite links:', prerequisites);
    console.log('Sessions:', sessions);
    console.log('-------------------------\n');
  } finally {
    await ds.destroy();
  }
}

verify().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
