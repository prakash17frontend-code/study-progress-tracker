
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Goal } from '../database/entities/goal.entity';
import { Topic } from '../database/entities/topic.entity';
import { StudySession } from '../database/entities/study-session.entity';
import { UserRole } from '../database/entities/user.entity';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,

    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,

    @InjectRepository(StudySession)
    private readonly sessionRepository: Repository<StudySession>,
  ) {}

  // Calculate progress for one goal
  async getGoalProgress(
    goalId: string,
    user: { id: string; role: UserRole },
  ) {
    const goal = await this.goalRepository.findOne({
      where: { id: goalId },
      relations: {
        learner: true,
        topics: true,
      },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    // Learners can only view their own goals
    if (
      user.role === UserRole.LEARNER &&
      goal.learner.id !== user.id
    ) {
      throw new ForbiddenException(
        'You cannot access this progress',
      );
    }

    // Get all topics belonging to this goal
    const topics = await this.topicRepository.find({
      where: { goal: { id: goalId } },
      order: { orderIndex: 'ASC' },
    });

    const totalTopics = topics.length;

    const completedTopics = topics.filter(
      (topic) => topic.isCompleted,
    ).length;

    const pendingTopics = topics
      .filter((topic) => !topic.isCompleted)
      .map((topic) => ({
        id: topic.id,
        title: topic.title,
      }));

    const completionPercentage =
      totalTopics === 0
        ? 0
        : Math.round(
            (completedTopics / totalTopics) * 100,
          );

    // Calculate total study minutes for this goal
    const result = await this.sessionRepository
      .createQueryBuilder('session')
      .innerJoin('session.topic', 'topic')
      .where('topic.goalId = :goalId', { goalId })
      .select(
        'COALESCE(SUM(session.minutes), 0)',
        'totalMinutes',
      )
      .getRawOne();

    const totalMinutes = Number(
      result?.totalMinutes ?? 0,
    );

    // Prepare chart-ready data
    const chartData = topics.map((topic) => ({
      topic: topic.title,
      completed: topic.isCompleted ? 1 : 0,
      pending: topic.isCompleted ? 0 : 1,
    }));

    return {
      goal: {
        id: goal.id,
        title: goal.title,
        description: goal.description,
      },

      learner: {
        id: goal.learner.id,
        name: goal.learner.name,
        email: goal.learner.email,
      },

      summary: {
        totalTopics,
        completedTopics,
        pendingTopics: totalTopics - completedTopics,
        completionPercentage,
        totalMinutes,
        totalHours: Number(
          (totalMinutes / 60).toFixed(2),
        ),
      },

      pendingTopicList: pendingTopics,
      chartData,
    };
  }

  // Get progress for all goals belonging to a learner
  async getLearnerProgress(learnerId: string) {
    const goals = await this.goalRepository.find({
      where: {
        learner: { id: learnerId },
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return Promise.all(
      goals.map((goal) =>
        this.getGoalProgress(goal.id, {
          id: learnerId,
          role: UserRole.LEARNER,
        }),
      ),
    );
  }
}
