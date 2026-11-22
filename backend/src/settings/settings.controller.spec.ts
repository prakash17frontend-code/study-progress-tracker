
import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

describe('SettingsController', () => {
  let controller: SettingsController;

  const mockSettingsService = {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
      ],
    }).compile();

    controller = module.get<SettingsController>(SettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return application settings', async () => {
    const settings = {
      minSessionMinutes: 5,
      maxSessionMinutes: 480,
      maxPrerequisitesPerTopic: 5,
    };

    mockSettingsService.getSettings.mockResolvedValue(settings);

    await expect(controller.getSettings()).resolves.toEqual(settings);
    expect(mockSettingsService.getSettings).toHaveBeenCalled();
  });

  it('should update application settings', async () => {
    const updateData = {
      minSessionMinutes: 10,
      maxSessionMinutes: 300,
      maxPrerequisitesPerTopic: 4,
    };

    const response = {
      message: 'Settings updated successfully',
      settings: updateData,
    };

    mockSettingsService.updateSettings.mockResolvedValue(response);

    await expect(controller.updateSettings(updateData)).resolves.toEqual(response);
    expect(mockSettingsService.updateSettings).toHaveBeenCalledWith(updateData);
  });
});
