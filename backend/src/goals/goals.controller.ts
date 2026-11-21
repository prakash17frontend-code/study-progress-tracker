
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

import { GoalsService } from './goals.service';
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

@Controller('goals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @Roles(UserRole.LEARNER)
  create(
    @Req() req: AuthenticatedRequest,
    @Body() body: { title: string; description?: string },
  ) {
    return this.goalsService.create(req.user.id, body);
  }

  @Get()
  @Roles(UserRole.LEARNER, UserRole.MENTOR)
  findAll(@Req() req: AuthenticatedRequest) {
    return this.goalsService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.LEARNER, UserRole.MENTOR)
  findOne(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.goalsService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.LEARNER)
  update(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() body: { title?: string; description?: string },
  ) {
    return this.goalsService.update(id, req.user.id, body);
  }

  @Delete(':id')
  @Roles(UserRole.LEARNER)
  remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.goalsService.remove(id, req.user.id);
  }
}
