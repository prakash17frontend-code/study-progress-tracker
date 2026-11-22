
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn((data) => Promise.resolve(data)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: 'AppSettingRepository',
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return default application settings', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.find.mockResolvedValue([]);

    const result = await service.getSettings();

    expect(result).toEqual({
      minSessionMinutes: 5,
      maxSessionMinutes: 480,
      maxPrerequisitesPerTopic: 5,
    });
  });

  it('should reject empty settings updates', async () => {
    await expect(service.updateSettings({})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject minimum session time greater than maximum', async () => {
    mockRepository.findOne.mockResolvedValue(null);
    mockRepository.find.mockResolvedValue([]);

    await expect(
      service.updateSettings({
        minSessionMinutes: 100,
        maxSessionMinutes: 50,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
