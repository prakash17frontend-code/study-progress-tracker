
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';

import { TopicsService } from './topics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

@Controller('topics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  // Create a topic inside a goal
  @Post(':goalId')
  @Roles(UserRole.LEARNER)
  create(
    @Param('goalId') goalId: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { title: string; description?: string },
  ) {
    return this.topicsService.create(goalId, req.user.id, body);
  }

  // Get topics belonging to a goal
  @Get('goal/:goalId')
  @Roles(UserRole.LEARNER, UserRole.MENTOR)
  findByGoal(
    @Param('goalId') goalId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.topicsService.findByGoal(goalId, req.user);
  }

  // Get one topic and its prerequisite information
  @Get(':id')
  @Roles(UserRole.LEARNER, UserRole.MENTOR)
  findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.topicsService.findOne(id, req.user);
  }

  // Update a topic
  @Patch(':id')
  @Roles(UserRole.LEARNER)
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { title?: string; description?: string },
  ) {
    return this.topicsService.update(id, req.user.id, body);
  }

  // Mark topic completed or reopen it
  @Patch(':id/completion')
  @Roles(UserRole.LEARNER)
  updateCompletion(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { isCompleted: boolean },
  ) {
    return this.topicsService.updateCompletion(
      id,
      req.user.id,
      body.isCompleted,
    );
  }

  // Add a prerequisite to a topic
  @Post(':id/prerequisites')
  @Roles(UserRole.LEARNER)
  addPrerequisite(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { prerequisiteTopicId: string },
  ) {
    return this.topicsService.addPrerequisite(
      id,
      req.user.id,
      body.prerequisiteTopicId,
    );
  }

  // Remove a prerequisite
  @Delete(':id/prerequisites/:prerequisiteId')
  @Roles(UserRole.LEARNER)
  removePrerequisite(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Param('prerequisiteId') prerequisiteId: string,
  ) {
    return this.topicsService.removePrerequisite(
      id,
      req.user.id,
      prerequisiteId,
    );
  }

  // Delete a topic
  @Delete(':id')
  @Roles(UserRole.LEARNER)
  remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.topicsService.remove(id, req.user.id);
  }
}
