
import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';

import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MENTOR)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
  ) {}

  // Get application settings
  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  // Update application settings
  @Patch()
  updateSettings(
    @Body()
    body: {
      minSessionMinutes?: number;
      maxSessionMinutes?: number;
      maxPrerequisitesPerTopic?: number;
    },
  ) {
    return this.settingsService.updateSettings(body);
  }
}
