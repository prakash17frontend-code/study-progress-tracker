
import {
  Injectable,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Topic } from '../database/entities/topic.entity';

@Injectable()
export class TopicRecommendationService {
  constructor(
    private readonly configService: ConfigService,

    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
  ) {}

  async getRecommendations(learnerId: string) {
    const topics = await this.topicRepository.find({
      relations: {
        goal: {
          learner: true,
        },
        prerequisites: {
          prerequisiteTopic: true,
        },
      },
    });

    // Keep only topics belonging to the logged-in learner.
    const learnerTopics = topics.filter(
      (topic) => topic.goal.learner.id === learnerId,
    );

    if (learnerTopics.length === 0) {
      return {
        message: 'Create a learning goal and topics to receive recommendations.',
        recommendations: [],
        blockedTopics: [],
      };
    }

    // Group topics by learning goal.
    const goalGroups = new Map<string, Topic[]>();

    for (const topic of learnerTopics) {
      const goalId = topic.goal.id;
      const group = goalGroups.get(goalId) ?? [];

      group.push(topic);
      goalGroups.set(goalId, group);
    }

    const recommendations: any[] = [];
    const blockedTopics: any[] = [];

    for (const goalTopics of goalGroups.values()) {
      goalTopics.sort(
        (a, b) => a.orderIndex - b.orderIndex,
      );

      const pendingTopics = goalTopics.filter(
        (topic) => !topic.isCompleted,
      );

      if (pendingTopics.length === 0) {
        continue;
      }

      // Recommend the next pending topic in the goal's order.
      const nextTopic = pendingTopics[0];

      const missingPrerequisites =
        nextTopic.prerequisites
          .filter(
            (link) => !link.prerequisiteTopic.isCompleted,
          )
          .map((link) => ({
            id: link.prerequisiteTopic.id,
            title: link.prerequisiteTopic.title,
          }));

      if (missingPrerequisites.length > 0) {
        blockedTopics.push({
          topicId: nextTopic.id,
          topicTitle: nextTopic.title,
          goalTitle: nextTopic.goal.title,
          missingPrerequisites,
        });

        continue;
      }

      recommendations.push({
        topicId: nextTopic.id,
        topicTitle: nextTopic.title,
        description: nextTopic.description,
        goalTitle: nextTopic.goal.title,
        orderIndex: nextTopic.orderIndex,
        reason:
          'This is the next pending topic in your learning order, and all its prerequisites are completed.',
        suggestedAction:
          `Start learning ${nextTopic.title} and make notes of the key concepts.`,
      });
    }

    // Sort recommendations by topic order.
    recommendations.sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );

    // Ask Groq AI to personalize explanations for valid candidates.
    const apiKey =
      this.configService.get<string>('GROQ_API_KEY');

    if (apiKey && recommendations.length > 0) {
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
                    'You are StudyFlow AI. Explain why each supplied topic is a good next topic to study. Use only the supplied topic IDs. Do not invent topics or change the recommendation order. Return valid JSON with recommendations containing topicId, reason, suggestedAction, and a generalTip.',
                },
                {
                  role: 'user',
                  content: JSON.stringify(
                    recommendations.map((item) => ({
                      topicId: item.topicId,
                      topicTitle: item.topicTitle,
                      description: item.description,
                      goalTitle: item.goalTitle,
                    })),
                  ),
                },
              ],
              response_format: {
                type: 'json_object',
              },
              temperature: 0.3,
              max_completion_tokens: 1500,
            }),
            signal: AbortSignal.timeout(20000),
          },
        );

        if (response.ok) {
          const result = await response.json();
          const content =
            result.choices?.[0]?.message?.content;

          if (content) {
            const aiResult = JSON.parse(content);

            if (Array.isArray(aiResult.recommendations)) {
              const aiRecommendations = new Map(
                aiResult.recommendations.map((item: any) => [
                  item.topicId,
                  item,
                ]),
              );

              for (const recommendation of recommendations) {
                const aiItem = aiRecommendations.get(
                  recommendation.topicId,
                ) as any;

                if (aiItem) {
                  if (typeof aiItem.reason === 'string') {
                    recommendation.reason = aiItem.reason;
                  }

                  if (
                    typeof aiItem.suggestedAction === 'string'
                  ) {
                    recommendation.suggestedAction =
                      aiItem.suggestedAction;
                  }
                }
              }
            }

            return {
              message: 'Smart recommendations generated successfully',
              recommendations,
              blockedTopics,
              generalTip:
                typeof aiResult.generalTip === 'string'
                  ? aiResult.generalTip
                  : 'Study consistently and complete one topic at a time.',
            };
          }
        }
      } catch (error) {
        // Keep the database-based recommendations available
        // even if the AI service is temporarily unavailable.
        console.error(
          'AI recommendation explanation unavailable:',
          error,
        );
      }
    }

    return {
      message: 'Smart recommendations generated successfully',
      recommendations,
      blockedTopics,
      generalTip:
        'Study consistently and complete your topics in the recommended order.',
    };
  }
}
