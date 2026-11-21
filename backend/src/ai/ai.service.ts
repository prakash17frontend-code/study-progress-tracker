
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  BadGatewayException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Goal } from '../database/entities/goal.entity';
import { GenerateStudyPlanDto } from './dto/generate-study-plan.dto';

@Injectable()
export class AIService {
  constructor(
    private readonly configService: ConfigService,

    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
  ) {}

  async generateStudyPlan(
    learnerId: string,
    data: GenerateStudyPlanDto,
  ) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException(
        'Groq API key is not configured',
      );
    }

    // Validate target date
    const today = new Date();

    const todayUTC = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
      ),
    );

    const target = new Date(`${data.targetDate}T00:00:00.000Z`);

    if (Number.isNaN(target.getTime()) || target < todayUTC) {
      throw new BadRequestException(
        'Target date must be today or in the future',
      );
    }

    const totalDays =
      Math.floor(
        (target.getTime() - todayUTC.getTime()) /
          (1000 * 60 * 60 * 24),
      ) + 1;

    if (totalDays > 60) {
      throw new BadRequestException(
        'Please choose a target date within 60 days',
      );
    }

    // Get learner goals and topics
    const goals = await this.goalRepository.find({
      where: {
        learner: { id: learnerId },
        ...(data.goalId ? { id: data.goalId } : {}),
      },
      relations: {
        topics: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });

    if (data.goalId && goals.length === 0) {
      throw new NotFoundException(
        'Goal not found in your account',
      );
    }

    if (goals.length === 0) {
      throw new BadRequestException(
        'Create a learning goal before generating a study plan',
      );
    }

    const learningGoals = goals.map((goal) => ({
      goalTitle: goal.title,
      description: goal.description,
      topics: goal.topics
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .filter((topic) => !topic.isCompleted)
        .map((topic) => ({
          title: topic.title,
          description: topic.description,
          order: topic.orderIndex,
        })),
    }));

    const pendingTopicCount = learningGoals.reduce(
      (total, goal) => total + goal.topics.length,
      0,
    );

    if (pendingTopicCount === 0) {
      throw new BadRequestException(
        'All topics are already completed. Create new topics to generate another plan.',
      );
    }

    // AI prompt
    const prompt = `
You are StudyFlow AI, an expert personal study planner.

Create a realistic study schedule using the learner's actual goals and pending topics.

LEARNER DATA:
${JSON.stringify(learningGoals, null, 2)}

AVAILABLE HOURS PER DAY:
${data.availableHoursPerDay}

START DATE:
${todayUTC.toISOString().slice(0, 10)}

TARGET COMPLETION DATE:
${data.targetDate}

TOTAL DAYS:
${totalDays}

PENDING TOPICS:
${pendingTopicCount}

STRICT SCHEDULING RULES:

1. Include only the pending topics provided.
2. Follow the existing topic order within each goal.
3. Never invent additional topics.
4. Do not teach the same topic from scratch on multiple days.
5. Schedule initial learning once per topic.
6. Use later days for different activities such as exercises, practical application, quizzes, revision and mock tests.
7. Activities must clearly describe what the learner should do.
8. Do not repeat identical activities on different days.
9. Use realistic study durations, preferably 30 to 60 minutes per activity.
10. Do not exceed the available daily study hours.
11. Include breaks where appropriate.
12. Use the available days sensibly. Do not fill every day with unnecessary repeated activities.
13. Include final revision or assessment before the target date.
14. If there is only one pending topic, create different stages of learning and practice for that topic.
15. Return valid JSON only.
16. Generate exactly one dailyPlan entry for each scheduled day.
17. Use a maximum of 2 activities per day.
18. Do not include breaks as activities or invent a topic called Break.
19. Keep task descriptions short and specific.
20. Always include the tips array with at least 3 useful tips.
21. Ensure totalMinutes equals the sum of activity durations.
22. Include the complete schedule through the target date.

OUTPUT FORMAT:
{
  "goalTitle": "Goal name",
  "targetDate": "${data.targetDate}",
  "totalDays": ${totalDays},
  "dailyPlan": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "focus": "Learning",
      "activities": [
        {
          "topicTitle": "Existing topic title",
          "durationMinutes": 60,
          "task": "Specific learning activity"
        }
      ],
      "totalMinutes": 60
    }
  ],
  "tips": ["Study tip 1", "Study tip 2"]
}
`;

    // Call Groq API
    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-20b',
            messages: [
              {
                role: 'system',
                content:
                  'You are StudyFlow AI, an expert learning planner. Create realistic, structured study plans. Return valid JSON with goalTitle, targetDate, totalDays, dailyPlan and tips. Each dailyPlan item must contain day, date, focus, activities and totalMinutes. Each activity must contain topicTitle, durationMinutes and task.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            response_format: {
  type: 'json_schema',
  json_schema: {
    name: 'study_plan',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        goalTitle: {
          type: 'string',
        },
        targetDate: {
          type: 'string',
        },
        totalDays: {
          type: 'integer',
        },
        dailyPlan: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              day: {
                type: 'integer',
              },
              date: {
                type: 'string',
              },
              focus: {
                type: 'string',
              },
              activities: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    topicTitle: {
                      type: 'string',
                    },
                    durationMinutes: {
                      type: 'integer',
                    },
                    task: {
                      type: 'string',
                    },
                  },
                  required: [
                    'topicTitle',
                    'durationMinutes',
                    'task',
                  ],
                  additionalProperties: false,
                },
              },
              totalMinutes: {
                type: 'integer',
              },
            },
            required: [
              'day',
              'date',
              'focus',
              'activities',
              'totalMinutes',
            ],
            additionalProperties: false,
          },
        },
        tips: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
      required: [
        'goalTitle',
        'targetDate',
        'totalDays',
        'dailyPlan',
        'tips',
      ],
      additionalProperties: false,
    },
  },
},
            temperature: 0.3,
            max_completion_tokens: 6000,
          }),
          signal: AbortSignal.timeout(45000),
        },
      );

      if (!response.ok) {
        const errorBody = await response.text();

        console.error('Groq API error:', response.status, errorBody);

        if (response.status === 429) {
          throw new ServiceUnavailableException(
            'AI service is busy. Please try again later.',
          );
        }

        throw new BadGatewayException(
          'Unable to generate the AI study plan',
        );
      }

      const result = await response.json();

      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        throw new BadGatewayException(
          'AI returned an empty study plan',
        );
      }

      let studyPlan: any;

      try {
        studyPlan = JSON.parse(content);
      } catch {
        throw new BadGatewayException(
          'AI returned an invalid study plan format',
        );
      }

      // Validate basic AI response structure
      if (
        !studyPlan ||
        !Array.isArray(studyPlan.dailyPlan) ||
        !Array.isArray(studyPlan.tips)
      ) {
        throw new BadGatewayException(
          'AI returned an incomplete study plan',
        );
      }

      return {
        message: 'AI study plan generated successfully',
        learnerGoals: learningGoals.length,
        pendingTopics: pendingTopicCount,
        availableHoursPerDay: data.availableHoursPerDay,
        studyPlan,
      };

    } catch (error) {
      if (
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new ServiceUnavailableException(
          'AI request timed out. Please try again.',
        );
      }

      console.error('AI study plan error:', error);

      throw new ServiceUnavailableException(
        'Unable to connect to the AI service',
      );
    }
  }
}
