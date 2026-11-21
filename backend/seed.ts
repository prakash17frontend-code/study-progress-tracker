
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { User, UserRole } from './src/database/entities/user.entity';
import { Goal } from './src/database/entities/goal.entity';
import { Topic } from './src/database/entities/topic.entity';
import { StudySession } from './src/database/entities/study-session.entity';
import { TopicPrerequisite } from './src/database/entities/topic-prerequisite.entity';
import { AppSetting } from './src/database/entities/app-setting.entity';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const learnerEmail = 'seed.learner@studyflow.com';

const goalData = [
  {
    title: 'Web Development Foundations',
    description: 'Learn the fundamentals of modern web development.',
    topics: [
      'HTML Fundamentals',
      'CSS Fundamentals',
      'JavaScript Basics',
      'Responsive Web Design',
    ],
  },
  {
    title: 'Database Management',
    description: 'Learn relational database concepts and SQL.',
    topics: [
      'Database Fundamentals',
      'SQL Queries',
      'Database Relationships',
      'Advanced SQL',
    ],
  },
  {
    title: 'Backend API Development',
    description: 'Learn server-side development and REST APIs.',
    topics: [
      'Node.js Fundamentals',
      'NestJS Basics',
      'REST API Development',
      'Authentication and Authorization',
    ],
  },
];

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing from .env.local');
  }

  const password = process.env.SEED_LEARNER_PASSWORD;

  if (!password || password.length < 8) {
    throw new Error(
      'Set SEED_LEARNER_PASSWORD to a password of at least 8 characters before running the seed.',
    );
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [
      User,
      Goal,
      Topic,
      StudySession,
      TopicPrerequisite,
      AppSetting,
    ],
    synchronize: false,
    ssl: { rejectUnauthorized: true },
  });

  await dataSource.initialize();

  try {
    await dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const goalRepository = manager.getRepository(Goal);
      const topicRepository = manager.getRepository(Topic);
      const prerequisiteRepository =
        manager.getRepository(TopicPrerequisite);
      const sessionRepository = manager.getRepository(StudySession);

      let learner = await userRepository.findOne({
        where: { email: learnerEmail },
      });

      if (!learner) {
        learner = userRepository.create({
          name: 'StudyFlow Demo Learner',
          email: learnerEmail,
          password: await bcrypt.hash(password, 10),
          role: UserRole.LEARNER,
        });

        learner = await userRepository.save(learner);
      } else if (learner.role !== UserRole.LEARNER) {
        throw new Error(
          'The seed learner email already belongs to a non-learner account.',
        );
      }

      const allTopics: Topic[][] = [];

      for (const goalItem of goalData) {
        let goal = await goalRepository.findOne({
          where: {
            title: goalItem.title,
            learner: { id: learner.id },
          },
        });

        if (!goal) {
          goal = await goalRepository.save(
            goalRepository.create({
              title: goalItem.title,
              description: goalItem.description,
              learner,
            }),
          );
        }

        const goalTopics: Topic[] = [];

        for (let index = 0; index < goalItem.topics.length; index++) {
          const title = goalItem.topics[index];

          let topic = await topicRepository.findOne({
            where: {
              title,
              goal: { id: goal.id },
            },
          });

          if (!topic) {
            topic = await topicRepository.save(
              topicRepository.create({
                title,
                description: `Study and practice ${title}.`,
                goal,
                orderIndex: index,
                isCompleted: index === 0,
                completedAt: index === 0 ? new Date() : null,
              }),
            );
          }

          goalTopics.push(topic);
        }

        allTopics.push(goalTopics);
      }

      // Add valid prerequisite chains within each goal.
      for (const topics of allTopics) {
        for (let index = 1; index < topics.length; index++) {
          const existing = await prerequisiteRepository.findOne({
            where: {
              topic: { id: topics[index].id },
              prerequisiteTopic: { id: topics[index - 1].id },
            },
          });

          if (!existing) {
            await prerequisiteRepository.save(
              prerequisiteRepository.create({
                topic: topics[index],
                prerequisiteTopic: topics[index - 1],
              }),
            );
          }
        }
      }

      // Create exactly 30 identifiable demo sessions.
      const flatTopics = allTopics.flat();
      const today = new Date();

      for (let index = 0; index < 30; index++) {
        const note = `StudyFlow seed session #${index + 1}`;

        const existing = await sessionRepository.findOne({
          where: {
            learner: { id: learner.id },
            note,
          },
        });

        if (existing) {
          continue;
        }

        const daysAgo = Math.round((index * 41) / 29);
        const sessionDate = new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate() - daysAgo,
          ),
        )
          .toISOString()
          .slice(0, 10);

        const topic = flatTopics[index % flatTopics.length];

        await sessionRepository.save(
          sessionRepository.create({
            learner,
            topic,
            sessionDate,
            minutes: 25 + (index % 5) * 10,
            note,
          }),
        );
      }

      console.log('Seed completed successfully!');
      console.log('Demo learner:', learnerEmail);
      console.log('Goals:', 3);
      console.log('Topics:', 12);
      console.log('Prerequisite chains:', 3);
      console.log('Seed sessions:', 30);
    });
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
