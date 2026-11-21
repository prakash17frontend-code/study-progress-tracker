
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Topic } from '../database/entities/topic.entity';
import { Goal } from '../database/entities/goal.entity';
import { TopicPrerequisite } from '../database/entities/topic-prerequisite.entity';
import { UserRole } from '../database/entities/user.entity';
import { AppSetting } from '../database/entities/app-setting.entity';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,

    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,

    @InjectRepository(TopicPrerequisite)
    private readonly prerequisiteRepository: Repository<TopicPrerequisite>,

    @InjectRepository(AppSetting)
private readonly settingRepository: Repository<AppSetting>,
  ) {}

  // Verify that the logged-in learner owns the goal
  private async verifyGoalOwnership(goalId: string, learnerId: string) {
    const goal = await this.goalRepository.findOne({
      where: { id: goalId },
      relations: { learner: true },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (goal.learner.id !== learnerId) {
      throw new ForbiddenException('You cannot access this goal');
    }

    return goal;
  }

  // Verify topic ownership
  private async getOwnedTopic(topicId: string, learnerId: string) {
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
      throw new ForbiddenException('You cannot access this topic');
    }

    return topic;
  }

  // Calculate lock status from prerequisite completion
  private async getTopicStatus(topic: Topic) {
    const links = await this.prerequisiteRepository.find({
      where: { topic: { id: topic.id } },
      relations: { prerequisiteTopic: true },
    });

    const missingPrerequisites = links
      .filter((link) => !link.prerequisiteTopic.isCompleted)
      .map((link) => ({
        id: link.prerequisiteTopic.id,
        title: link.prerequisiteTopic.title,
      }));

    return {
      isLocked: missingPrerequisites.length > 0,
      missingPrerequisites,
    };
  }

  // Create a topic inside a goal
  async create(
    goalId: string,
    learnerId: string,
    data: { title: string; description?: string },
  ) {
    const goal = await this.verifyGoalOwnership(goalId, learnerId);

    if (!data.title?.trim()) {
      throw new BadRequestException('Topic title is required');
    }

    const count = await this.topicRepository.count({
      where: { goal: { id: goalId } },
    });

    const topic = this.topicRepository.create({
      title: data.title.trim(),
      description: data.description,
      goal,
      orderIndex: count,
    });

    return this.topicRepository.save(topic);
  }

  // Get all topics belonging to a goal
  async findByGoal(
    goalId: string,
    user: { id: string; role: UserRole },
  ) {
    const goal = await this.goalRepository.findOne({
      where: { id: goalId },
      relations: { learner: true },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (
      user.role === UserRole.LEARNER &&
      goal.learner.id !== user.id
    ) {
      throw new ForbiddenException('You cannot access this goal');
    }

    const topics = await this.topicRepository.find({
      where: { goal: { id: goalId } },
      order: { orderIndex: 'ASC' },
    });

    return Promise.all(
      topics.map(async (topic) => ({
        ...topic,
        ...(await this.getTopicStatus(topic)),
      })),
    );
  }

  // Get one topic
  async findOne(
    id: string,
    user: { id: string; role: UserRole },
  ) {
    const topic = await this.topicRepository.findOne({
      where: { id },
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
      throw new ForbiddenException('You cannot access this topic');
    }

    const links = await this.prerequisiteRepository.find({
      where: { topic: { id } },
      relations: { prerequisiteTopic: true },
    });

    return {
      ...topic,
      prerequisites: links.map((link) => ({
        id: link.prerequisiteTopic.id,
        title: link.prerequisiteTopic.title,
        isCompleted: link.prerequisiteTopic.isCompleted,
      })),
      ...(await this.getTopicStatus(topic)),
    };
  }

  // Update topic details
  async update(
    id: string,
    learnerId: string,
    data: { title?: string; description?: string },
  ) {
    const topic = await this.getOwnedTopic(id, learnerId);

    if (data.title !== undefined) {
      if (!data.title.trim()) {
        throw new BadRequestException('Topic title cannot be empty');
      }
      topic.title = data.title.trim();
    }

    if (data.description !== undefined) {
      topic.description = data.description;
    }

    return this.topicRepository.save(topic);
  }

  // Complete or reopen a topic
  async updateCompletion(
    id: string,
    learnerId: string,
    isCompleted: boolean,
  ) {
    const topic = await this.getOwnedTopic(id, learnerId);

    if (typeof isCompleted !== 'boolean') {
      throw new BadRequestException('isCompleted must be true or false');
    }

    if (isCompleted) {
      const status = await this.getTopicStatus(topic);

      if (status.isLocked) {
        throw new BadRequestException({
          message: 'This topic is locked',
          missingPrerequisites: status.missingPrerequisites,
        });
      }
    }

    topic.isCompleted = isCompleted;
    topic.completedAt = isCompleted ? new Date() : null;

    const savedTopic = await this.topicRepository.save(topic);

    return {
      message: isCompleted
        ? 'Topic completed successfully'
        : 'Topic reopened successfully',
      topic: savedTopic,
    };
  }

  // Check whether adding a dependency would create a cycle
  private async createsCycle(
    topicId: string,
    prerequisiteTopicId: string,
  ) {
    const links = await this.prerequisiteRepository.find({
      relations: {
        topic: true,
        prerequisiteTopic: true,
      },
    });

    const graph = new Map<string, string[]>();

    for (const link of links) {
      const dependencies = graph.get(link.topic.id) ?? [];
      dependencies.push(link.prerequisiteTopic.id);
      graph.set(link.topic.id, dependencies);
    }

    const visited = new Set<string>();

    const search = (currentId: string): boolean => {
      if (currentId === topicId) {
        return true;
      }

      if (visited.has(currentId)) {
        return false;
      }

      visited.add(currentId);

      for (const dependencyId of graph.get(currentId) ?? []) {
        if (search(dependencyId)) {
          return true;
        }
      }

      return false;
    };

    return search(prerequisiteTopicId);
  }

  // Add a prerequisite
  async addPrerequisite(
    id: string,
    learnerId: string,
    prerequisiteTopicId: string,
  ) {
    const topic = await this.getOwnedTopic(id, learnerId);
    const prerequisiteTopic = await this.getOwnedTopic(
      prerequisiteTopicId,
      learnerId,
    );

    if (id === prerequisiteTopicId) {
      throw new BadRequestException(
        'A topic cannot be its own prerequisite',
      );
    }

    if (topic.goal.id !== prerequisiteTopic.goal.id) {
      throw new BadRequestException(
        'Prerequisites must belong to the same goal',
      );
    }

    const existing = await this.prerequisiteRepository.findOne({
      where: {
        topic: { id },
        prerequisiteTopic: { id: prerequisiteTopicId },
      },
    });

    if (existing) {
      throw new BadRequestException('Prerequisite already exists');
    }
    // Get configurable maximum prerequisite limit
const setting = await this.settingRepository.findOne({
  where: { key: 'max_prerequisites_per_topic' },
});

const maxPrerequisites = Number(
  setting?.value?.value ?? 5,
);

// Count existing prerequisites
const prerequisiteCount = await this.prerequisiteRepository.count({
  where: { topic: { id } },
});

if (prerequisiteCount >= maxPrerequisites) {
  throw new BadRequestException(
    `A topic can have a maximum of ${maxPrerequisites} prerequisites`,
  );
}

    if (await this.createsCycle(id, prerequisiteTopicId)) {
      throw new BadRequestException(
        'This prerequisite would create a circular dependency',
      );
    }

    const link = this.prerequisiteRepository.create({
      topic,
      prerequisiteTopic,
    });

    await this.prerequisiteRepository.save(link);

    return {
      message: 'Prerequisite added successfully',
    };
  }

  // Remove a prerequisite
  async removePrerequisite(
    id: string,
    learnerId: string,
    prerequisiteId: string,
  ) {
    await this.getOwnedTopic(id, learnerId);

    const link = await this.prerequisiteRepository.findOne({
      where: {
        topic: { id },
        prerequisiteTopic: { id: prerequisiteId },
      },
    });

    if (!link) {
      throw new NotFoundException('Prerequisite not found');
    }

    await this.prerequisiteRepository.remove(link);

    return {
      message: 'Prerequisite removed successfully',
    };
  }

  // Delete a topic
  async remove(id: string, learnerId: string) {
    const topic = await this.getOwnedTopic(id, learnerId);

    await this.topicRepository.remove(topic);

    return {
      message: 'Topic deleted successfully',
    };
  }
}
