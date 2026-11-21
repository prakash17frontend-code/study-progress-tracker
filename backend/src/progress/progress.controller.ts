
import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';

import { ProgressService } from './progress.service';
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

@Controller('progress')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgressController {
  constructor(
    private readonly progressService: ProgressService,
  ) {}

  // Get progress for all goals belonging to the learner
  @Get()
  @Roles(UserRole.LEARNER)
  getMyProgress(@Req() req: AuthenticatedRequest) {
    return this.progressService.getLearnerProgress(
      req.user.id,
    );
  }

  // Get progress for one specific goal
  @Get('goal/:goalId')
  @Roles(UserRole.LEARNER, UserRole.MENTOR)
  getGoalProgress(
    @Param('goalId') goalId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.progressService.getGoalProgress(
      goalId,
      req.user,
    );
  }

  // Mentor can view progress for a particular learner
  @Get('learner/:learnerId')
  @Roles(UserRole.MENTOR)
  getLearnerProgress(
    @Param('learnerId') learnerId: string,
  ) {
    return this.progressService.getLearnerProgress(
      learnerId,
    );
  }
}
