
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StudySession } from '../database/entities/study-session.entity';
import { Topic } from '../database/entities/topic.entity';
import { AppSetting } from '../database/entities/app-setting.entity';
import { User, UserRole } from '../database/entities/user.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(StudySession)
    private readonly sessionRepository: Repository<StudySession>,

    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,

    @InjectRepository(AppSetting)
    private readonly settingRepository: Repository<AppSetting>,
  ) {}

  // Get configurable session limits
    private async getSessionLimits() {
  const minSetting = await this.settingRepository.findOne({
    where: { key: 'min_session_minutes' },
  });

  const maxSetting = await this.settingRepository.findOne({
    where: { key: 'max_session_minutes' },
  });

  return {
    min: Number(minSetting?.value?.value ?? 5),
    max: Number(maxSetting?.value?.value ?? 480),
  };
}

  // Validate session duration
  private async validateMinutes(minutes: number) {
    if (!Number.isInteger(minutes)) {
      throw new BadRequestException(
        'Minutes must be a whole number',
      );
    }

    const limits = await this.getSessionLimits();

    if (minutes < limits.min || minutes > limits.max) {
      throw new BadRequestException(
        `Session duration must be between ${limits.min} and ${limits.max} minutes`,
      );
    }
  }

  // Validate session date
  private validateDate(dateString: string): string {
    if (
      typeof dateString !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ) {
      throw new BadRequestException(
        'Date must use YYYY-MM-DD format',
      );
    }

    const date = new Date(`${dateString}T00:00:00.000Z`);

    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dateString
    ) {
      throw new BadRequestException('Invalid session date');
    }

    const today = new Date().toISOString().slice(0, 10);

    if (dateString > today) {
      throw new BadRequestException(
        'Future session dates are not allowed',
      );
    }

    return dateString;
  }

  // Verify topic ownership and prerequisite completion
  private async getAvailableTopic(
    topicId: string,
    learnerId: string,
  ) {
    const topic = await this.topicRepository.findOne({
      where: { id: topicId },
      relations: {
        goal: { learner: true },
      },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (topic.goal.learner.id !== learnerId) {
      throw new ForbiddenException(
        'You cannot access this topic',
      );
    }

    const prerequisites = await this.topicRepository.manager
      .createQueryBuilder()
      .select('prerequisiteTopic.isCompleted', 'isCompleted')
      .from('topic_prerequisites', 'link')
      .innerJoin(
        'topics',
        'prerequisiteTopic',
        'prerequisiteTopic.id = link."prerequisiteTopicId"',
      )
      .where('link."topicId" = :topicId', { topicId })
      .getRawMany();

    const isLocked = prerequisites.some(
      (item) => !item.isCompleted,
    );

    if (isLocked) {
      throw new BadRequestException(
        'This topic is locked. Complete its prerequisites first.',
      );
    }

    return topic;
  }

  // Create a study session
  async create(
    learnerId: string,
    data: {
      topicId: string;
      sessionDate: string;
      minutes: number;
      note?: string;
    },
  ) {
    if (!data.topicId) {
      throw new BadRequestException('Topic ID is required');
    }

    const topic = await this.getAvailableTopic(
      data.topicId,
      learnerId,
    );

    await this.validateMinutes(data.minutes);

    const sessionDate = this.validateDate(data.sessionDate);

    const session = this.sessionRepository.create({
      learner: { id: learnerId } as User,
      topic,
      sessionDate,
      minutes: data.minutes,
      note: data.note,
    });

    return this.sessionRepository.save(session);
  }

  // Get all sessions
  async findAll(user: { id: string; role: UserRole }) {
    const query = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.learner', 'learner')
      .leftJoinAndSelect('session.topic', 'topic')
      .leftJoinAndSelect('topic.goal', 'goal')
      .orderBy('session.sessionDate', 'DESC');

    if (user.role === UserRole.LEARNER) {
      query.where('learner.id = :userId', {
        userId: user.id,
      });
    }

    const sessions = await query.getMany();

    return sessions.map((session) => ({
      id: session.id,
      sessionDate: session.sessionDate,
      minutes: session.minutes,
      note: session.note,
      topic: {
        id: session.topic.id,
        title: session.topic.title,
      },
      goal: {
        id: session.topic.goal.id,
        title: session.topic.goal.title,
      },
      learner: {
        id: session.learner.id,
        name: session.learner.name,
      },
    }));
  }

  // Get sessions for one topic
  async findByTopic(
    topicId: string,
    user: { id: string; role: UserRole },
  ) {
    const topic = await this.topicRepository.findOne({
      where: { id: topicId },
      relations: {
        goal: { learner: true },
      },
    });

    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    if (
      user.role === UserRole.LEARNER &&
      topic.goal.learner.id !== user.id
    ) {
      throw new ForbiddenException(
        'You cannot access this topic',
      );
    }

    const sessions = await this.sessionRepository.find({
      where: { topic: { id: topicId } },
      relations: { learner: true },
      order: { sessionDate: 'DESC' },
    });

    return sessions.map((session) => ({
      id: session.id,
      sessionDate: session.sessionDate,
      minutes: session.minutes,
      note: session.note,
      learner: {
        id: session.learner.id,
        name: session.learner.name,
      },
    }));
  }

  // Find a session belonging to the learner
  private async getOwnedSession(
    id: string,
    learnerId: string,
  ) {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: { learner: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.learner.id !== learnerId) {
      throw new ForbiddenException(
        'You cannot modify this session',
      );
    }

    return session;
  }

  // Update a study session
  async update(
    id: string,
    learnerId: string,
    data: {
      sessionDate?: string;
      minutes?: number;
      note?: string;
    },
  ) {
    const session = await this.getOwnedSession(
      id,
      learnerId,
    );

    if (data.minutes !== undefined) {
      await this.validateMinutes(data.minutes);
      session.minutes = data.minutes;
    }

    if (data.sessionDate !== undefined) {
      session.sessionDate = this.validateDate(
        data.sessionDate,
      );
    }

    if (data.note !== undefined) {
      session.note = data.note;
    }

    return this.sessionRepository.save(session);
  }

  // Delete a study session
  async remove(id: string, learnerId: string) {
    const session = await this.getOwnedSession(
      id,
      learnerId,
    );

    await this.sessionRepository.remove(session);

    return {
      message: 'Study session deleted successfully',
    };
  }
}
