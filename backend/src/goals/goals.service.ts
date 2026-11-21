
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Goal } from '../database/entities/goal.entity';
import { User, UserRole } from '../database/entities/user.entity';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
  ) {}

  // Create a goal for the logged-in learner
  async create(
    learnerId: string,
    data: { title: string; description?: string },
  ) {
    const goal = this.goalRepository.create({
      title: data.title,
      description: data.description,
      learner: { id: learnerId } as User,
    });

    const savedGoal = await this.goalRepository.save(goal);

    return {
      id: savedGoal.id,
      title: savedGoal.title,
      description: savedGoal.description,
      createdAt: savedGoal.createdAt,
    };
  }

  // Learners see their own goals; mentors see all goals
  async findAll(user: { id: string; role: UserRole }) {
    const goals = await this.goalRepository.find({
      where:
        user.role === UserRole.LEARNER
          ? { learner: { id: user.id } }
          : {},
      relations: {
        learner: true,
        topics: true,
      },
      order: { createdAt: 'DESC' },
    });

    return goals.map((goal) => ({
      ...goal,
      learner: {
        id: goal.learner.id,
        name: goal.learner.name,
        email: goal.learner.email,
        role: goal.learner.role,
      },
    }));
  }

  // Get one goal with ownership verification
  async findOne(
    id: string,
    user: { id: string; role: UserRole },
  ) {
    const goal = await this.goalRepository.findOne({
      where: { id },
      relations: {
        learner: true,
        topics: true,
      },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (
      user.role === UserRole.LEARNER &&
      goal.learner.id !== user.id
    ) {
      throw new ForbiddenException(
        'You cannot access this goal',
      );
    }

    return {
      ...goal,
      learner: {
        id: goal.learner.id,
        name: goal.learner.name,
        email: goal.learner.email,
        role: goal.learner.role,
      },
    };
  }

  // Update a goal (owner only)
  async update(
    id: string,
    learnerId: string,
    data: { title?: string; description?: string },
  ) {
    const goal = await this.goalRepository.findOne({
      where: { id },
      relations: {
        learner: true,
      },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (goal.learner.id !== learnerId) {
      throw new ForbiddenException(
        'You cannot update this goal',
      );
    }

    if (data.title !== undefined) {
      goal.title = data.title;
    }

    if (data.description !== undefined) {
      goal.description = data.description;
    }

    const updatedGoal = await this.goalRepository.save(goal);

    return {
      id: updatedGoal.id,
      title: updatedGoal.title,
      description: updatedGoal.description,
      createdAt: updatedGoal.createdAt,
      updatedAt: updatedGoal.updatedAt,
    };
  }

  // Delete a goal (owner only)
  async remove(id: string, learnerId: string) {
    const goal = await this.goalRepository.findOne({
      where: { id },
      relations: {
        learner: true,
      },
    });

    if (!goal) {
      throw new NotFoundException('Goal not found');
    }

    if (goal.learner.id !== learnerId) {
      throw new ForbiddenException(
        'You cannot delete this goal',
      );
    }

    await this.goalRepository.remove(goal);

    return {
      message: 'Goal deleted successfully',
    };
  }
}
