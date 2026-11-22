
import { Test, TestingModule } from '@nestjs/testing';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { TopicRecommendationService } from './topic-recommendation.service';

describe('AIController', () => {
  let controller: AIController;

  const mockAIService = {
    generateStudyPlan: jest.fn(),
  };

  const mockRecommendationService = {
    getRecommendations: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIController],
      providers: [
        {
          provide: AIService,
          useValue: mockAIService,
        },
        {
          provide: TopicRecommendationService,
          useValue: mockRecommendationService,
        },
      ],
    }).compile();

    controller = module.get<AIController>(AIController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should generate a study plan for the logged-in learner', async () => {
    const request = { user: { id: 1 }, } as any;
    const body = {
      goalId: 1,
      availableHoursPerDay: 2,
      targetDate: '2026-12-05',
    };
    const expected = { plan: 'Generated study plan' };

    mockAIService.generateStudyPlan.mockResolvedValue(expected);

    await expect(
      controller.generateStudyPlan(request, body),
    ).resolves.toEqual(expected);

    expect(mockAIService.generateStudyPlan).toHaveBeenCalledWith(1, body);
  });

  it('should return topic recommendations for the logged-in learner', async () => {
    const request = { user: { id: 1 } };
    const expected = [{ topic: 'CSS Fundamentals' }];

    mockRecommendationService.getRecommendations.mockResolvedValue(expected);

    await expect(
      controller.getTopicRecommendations(request),
    ).resolves.toEqual(expected);

    expect(mockRecommendationService.getRecommendations).toHaveBeenCalledWith(1);
  });
});
