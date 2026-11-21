
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

import { SessionsService } from './sessions.service';
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

@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  // Create a study session
  @Post()
  @Roles(UserRole.LEARNER)
  create(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      topicId: string;
      sessionDate: string;
      minutes: number;
      note?: string;
    },
  ) {
    return this.sessionsService.create(req.user.id, body);
  }

  // Get study session history
  @Get()
  @Roles(UserRole.LEARNER, UserRole.MENTOR)
  findAll(@Req() req: AuthenticatedRequest) {
    return this.sessionsService.findAll(req.user);
  }

  // Get sessions for a specific topic
  @Get('topic/:topicId')
  @Roles(UserRole.LEARNER, UserRole.MENTOR)
  findByTopic(
    @Param('topicId') topicId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.findByTopic(topicId, req.user);
  }

  // Update a session
  @Patch(':id')
  @Roles(UserRole.LEARNER)
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      sessionDate?: string;
      minutes?: number;
      note?: string;
    },
  ) {
    return this.sessionsService.update(id, req.user.id, body);
  }

  // Delete a session
  @Delete(':id')
  @Roles(UserRole.LEARNER)
  remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.sessionsService.remove(id, req.user.id);
  }
}
