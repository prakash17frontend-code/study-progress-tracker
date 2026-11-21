
import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppSetting } from '../database/entities/app-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AppSetting)
    private readonly settingRepository: Repository<AppSetting>,
  ) {}

  private readonly defaults = {
    min_session_minutes: 5,
    max_session_minutes: 480,
    max_prerequisites_per_topic: 5,
  };

  // Get settings and create defaults if missing
  async getSettings() {
    for (const [key, value] of Object.entries(this.defaults)) {
      const existing = await this.settingRepository.findOne({
        where: { key },
      });

      if (!existing) {
        await this.settingRepository.save(
          this.settingRepository.create({
            key,
            value: { value },
          }),
        );
      }
    }

    const settings = await this.settingRepository.find();

    const values: Record<string, number> = {};

    for (const setting of settings) {
      values[setting.key] = Number(setting.value?.value);
    }

    return {
      minSessionMinutes:
        values['min_session_minutes'] ??
        this.defaults.min_session_minutes,

      maxSessionMinutes:
        values['max_session_minutes'] ??
        this.defaults.max_session_minutes,

      maxPrerequisitesPerTopic:
        values['max_prerequisites_per_topic'] ??
        this.defaults.max_prerequisites_per_topic,
    };
  }

  // Update settings
  async updateSettings(data: {
    minSessionMinutes?: number;
    maxSessionMinutes?: number;
    maxPrerequisitesPerTopic?: number;
  }) {
    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'At least one setting must be provided',
      );
    }

    const current = await this.getSettings();

    const updated = {
      minSessionMinutes:
        data.minSessionMinutes ?? current.minSessionMinutes,

      maxSessionMinutes:
        data.maxSessionMinutes ?? current.maxSessionMinutes,

      maxPrerequisitesPerTopic:
        data.maxPrerequisitesPerTopic ??
        current.maxPrerequisitesPerTopic,
    };

    // Validate positive whole numbers
    for (const [key, value] of Object.entries(updated)) {
      if (!Number.isInteger(value) || value < 1) {
        throw new BadRequestException(
          `${key} must be a positive whole number`,
        );
      }
    }

    // Validate minimum and maximum session duration
    if (
      updated.minSessionMinutes >
      updated.maxSessionMinutes
    ) {
      throw new BadRequestException(
        'Minimum session minutes cannot exceed maximum session minutes',
      );
    }

    // Save updated settings
    await this.saveSetting(
      'min_session_minutes',
      updated.minSessionMinutes,
    );

    await this.saveSetting(
      'max_session_minutes',
      updated.maxSessionMinutes,
    );

    await this.saveSetting(
      'max_prerequisites_per_topic',
      updated.maxPrerequisitesPerTopic,
    );

    return {
      message: 'Settings updated successfully',
      settings: updated,
    };
  }

  // Save one setting
  private async saveSetting(key: string, value: number) {
    let setting = await this.settingRepository.findOne({
      where: { key },
    });

    if (!setting) {
      setting = this.settingRepository.create({
        key,
        value: { value },
      });
    } else {
      setting.value = { value };
    }

    return this.settingRepository.save(setting);
  }
}
