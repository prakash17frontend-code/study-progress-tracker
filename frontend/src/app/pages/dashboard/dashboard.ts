
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../services/api';
import { Auth } from '../../services/auth';
import { RouterLink } from '@angular/router';
import { AiService } from '../../services/ai';

interface Goal {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
}

interface Topic {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  isCompleted: boolean;
  isLocked?: boolean;
  missingPrerequisites?: string[];
}

interface GoalProgress {
  goal: {
    id: string;
    title: string;
    description?: string;
  };
  summary: {
    totalTopics: number;
    completedTopics: number;
    pendingTopics: number;
    completionPercentage: number;
    totalMinutes: number;
    totalHours: number;
  };
  chartData: {
    topic: string;
    completed: number;
    pending: number;
  }[];
}

interface TopicRecommendation {
  topicId: string;
  topicTitle: string;
  description?: string;
  goalTitle: string;
  orderIndex: number;
  reason: string;
  suggestedAction: string;
}

interface BlockedTopic {
  topicId: string;
  topicTitle: string;
  goalTitle: string;
  missingPrerequisites: {
    id: string;
    title: string;
  }[];
}

interface StudySession {
  id: string;
  sessionDate: string;
  minutes: number;
  note?: string | null;
  topic: {
    id: string;
    title: string;
  };
  goal?: {
    id: string;
    title: string;
  };
  learner?: {
    id: string;
    name: string;
  };
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {

  // =========================
  // GOALS AND TOPICS
  // =========================

  goals: Goal[] = [];

  topicsByGoal: Record<string, Topic[]> = {};

  progressByGoal: Record<string, GoalProgress> = {};

  expandedGoalId: string | null = null;

  // =========================
  // STUDY SESSIONS
  // =========================

  sessions: StudySession[] = [];

  sessionsByTopic: Record<string, StudySession[]> = {};

  sessionDate = this.getTodayDate();

  todayDate = this.getTodayDate();

  sessionMinutes: number | null = null;

  sessionNote = '';

  editingSessionId: string | null = null;

  sessionFormTopicId: string | null = null;

  // =========================
  // GOAL FORM
  // =========================

  title = '';

  description = '';

  editingId: string | null = null;

  // =========================
  // TOPIC FORM
  // =========================

  topicTitle = '';

  topicDescription = '';

  editingTopicId: string | null = null;

  // =========================
  // LOADING AND MESSAGES
  // =========================

  loading = false;

  loadingTopics = false;

  loadingSessions = false;

  saving = false;

  errorMessage = '';

  successMessage = '';

  // =========================
  // AI TOPIC RECOMMENDATIONS
  // =========================

  recommendations: TopicRecommendation[] = [];

  blockedTopics: BlockedTopic[] = [];

  recommendationTip = '';

  loadingRecommendations = false;

  recommendationError = '';

  constructor(
    private api: Api,
    private aiService: AiService,
    public auth: Auth
  ) {}

  ngOnInit(): void {
    this.loadGoals();
    this.loadSessions();
    this.loadRecommendations();
  }

  // =========================
  // AI RECOMMENDATION METHODS
  // =========================

  loadRecommendations(): void {
    this.loadingRecommendations = true;
    this.recommendationError = '';

    this.aiService.getTopicRecommendations().subscribe({
      next: (response) => {
        this.recommendations = response.recommendations || [];
        this.blockedTopics = response.blockedTopics || [];
        this.recommendationTip = response.generalTip || '';
        this.loadingRecommendations = false;
      },
      error: (error) => {
        this.loadingRecommendations = false;
        this.recommendationError =
          error.error?.message ||
          'Unable to load topic recommendations.';
      }
    });
  }

  // =========================
  // DATE METHOD
  // =========================

  private getTodayDate(): string {
    const today = new Date();

    const year = today.getFullYear();

    const month = String(today.getMonth() + 1).padStart(2, '0');

    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // =========================
  // GOAL METHODS
  // =========================

  loadGoals(): void {
    this.loading = true;

    this.errorMessage = '';

    this.api.get<Goal[]>('/goals').subscribe({
      next: response => {
        this.goals = response;

        this.loading = false;

        response.forEach(goal => {
          this.loadGoalProgress(goal.id);
        });
      },
      error: error => {
        this.loading = false;

        this.errorMessage =
          error.error?.message || 'Unable to load goals.';
      }
    });
  }

  saveGoal(): void {
    if (!this.title.trim()) {
      this.errorMessage = 'Goal title is required.';
      return;
    }

    this.saving = true;

    this.errorMessage = '';

    this.successMessage = '';

    const data = {
      title: this.title.trim(),
      description: this.description.trim()
    };

    const request = this.editingId
      ? this.api.patch(`/goals/${this.editingId}`, data)
      : this.api.post('/goals', data);

    request.subscribe({
      next: () => {
        this.saving = false;

        this.successMessage = this.editingId
          ? 'Goal updated successfully!'
          : 'Goal created successfully!';

        this.resetForm();

        this.loadGoals();

        this.loadRecommendations();
      },
      error: error => {
        this.saving = false;

        this.errorMessage =
          error.error?.message || 'Unable to save goal.';
      }
    });
  }

  editGoal(goal: Goal): void {
    this.editingId = goal.id;

    this.title = goal.title;

    this.description = goal.description || '';

    this.errorMessage = '';

    this.successMessage = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteGoal(id: string): void {
    if (!confirm('Are you sure you want to delete this goal?')) {
      return;
    }

    this.api.delete(`/goals/${id}`).subscribe({
      next: () => {
        this.successMessage = 'Goal deleted successfully!';

        delete this.topicsByGoal[id];

        delete this.progressByGoal[id];

        if (this.expandedGoalId === id) {
          this.expandedGoalId = null;
        }

        this.loadGoals();

        this.loadSessions();

        this.loadRecommendations();
      },
      error: error => {
        this.errorMessage =
          error.error?.message || 'Unable to delete goal.';
      }
    });
  }

  resetForm(): void {
    this.title = '';

    this.description = '';

    this.editingId = null;
  }

  // =========================
  // TOPIC METHODS
  // =========================

  toggleTopics(goalId: string): void {
    if (this.expandedGoalId === goalId) {
      this.expandedGoalId = null;

      this.resetTopicForm();

      this.cancelSessionEdit();

      return;
    }

    this.expandedGoalId = goalId;

    this.resetTopicForm();

    this.cancelSessionEdit();

    this.loadTopics(goalId);

    this.loadGoalProgress(goalId);
  }

  loadTopics(goalId: string): void {
    this.loadingTopics = true;

    this.errorMessage = '';

    this.api.get<Topic[]>(`/topics/goal/${goalId}`).subscribe({
      next: response => {
        this.topicsByGoal[goalId] = response;

        this.loadingTopics = false;

        response.forEach(topic => {
          this.loadTopicSessions(topic.id);
        });
      },
      error: error => {
        this.loadingTopics = false;

        this.errorMessage =
          error.error?.message || 'Unable to load topics.';
      }
    });
  }

  saveTopic(goalId: string): void {
    if (!this.topicTitle.trim()) {
      this.errorMessage = 'Topic title is required.';
      return;
    }

    this.saving = true;

    this.errorMessage = '';

    this.successMessage = '';

    const data = {
      title: this.topicTitle.trim(),
      description: this.topicDescription.trim()
    };

    const request = this.editingTopicId
      ? this.api.patch(`/topics/${this.editingTopicId}`, data)
      : this.api.post(`/topics/${goalId}`, data);

    request.subscribe({
      next: () => {
        this.saving = false;

        this.successMessage = this.editingTopicId
          ? 'Topic updated successfully!'
          : 'Topic created successfully!';

        this.resetTopicForm();

        this.loadTopics(goalId);

        this.loadGoalProgress(goalId);

        this.loadRecommendations();
      },
      error: error => {
        this.saving = false;

        this.errorMessage =
          error.error?.message || 'Unable to save topic.';
      }
    });
  }

  editTopic(topic: Topic): void {
    this.editingTopicId = topic.id;

    this.topicTitle = topic.title;

    this.topicDescription = topic.description || '';

    this.errorMessage = '';

    this.successMessage = '';
  }

  deleteTopic(topicId: string, goalId: string): void {
    if (!confirm('Are you sure you want to delete this topic?')) {
      return;
    }

    this.api.delete(`/topics/${topicId}`).subscribe({
      next: () => {
        this.successMessage = 'Topic deleted successfully!';

        delete this.sessionsByTopic[topicId];

        this.loadTopics(goalId);

        this.loadGoalProgress(goalId);

        this.loadSessions();

        this.loadRecommendations();
      },
      error: error => {
        this.errorMessage =
          error.error?.message || 'Unable to delete topic.';
      }
    });
  }

  toggleCompletion(topic: Topic, goalId: string): void {
    this.errorMessage = '';

    this.successMessage = '';

    this.api.patch(`/topics/${topic.id}/completion`, {
      isCompleted: !topic.isCompleted
    }).subscribe({
      next: () => {
        this.successMessage = topic.isCompleted
          ? 'Topic marked as incomplete.'
          : 'Topic completed successfully!';

        this.loadTopics(goalId);

        this.loadGoalProgress(goalId);

        this.loadRecommendations();
      },
      error: error => {
        const message = error.error?.message;

        this.errorMessage = Array.isArray(message)
          ? message.join(', ')
          : message || 'Unable to update topic completion.';
      }
    });
  }

  resetTopicForm(): void {
    this.topicTitle = '';

    this.topicDescription = '';

    this.editingTopicId = null;
  }

  // =========================
  // PROGRESS METHODS
  // =========================

  loadGoalProgress(goalId: string): void {
    if (!goalId) {
      return;
    }

    this.api.get<GoalProgress>(
      `/progress/goal/${goalId}`
    ).subscribe({
      next: response => {
        this.progressByGoal[goalId] = response;
      },
      error: error => {
        this.errorMessage =
          error.error?.message || 'Unable to load progress.';
      }
    });
  }

  // =========================
  // OVERALL SESSION HISTORY
  // =========================

  loadSessions(): void {
    this.loadingSessions = true;

    this.api.get<StudySession[]>('/sessions').subscribe({
      next: response => {
        this.sessions = response;

        this.loadingSessions = false;
      },
      error: error => {
        this.loadingSessions = false;

        this.errorMessage =
          error.error?.message || 'Unable to load study sessions.';
      }
    });
  }

  // =========================
  // TOPIC SESSION HISTORY
  // =========================

  loadTopicSessions(topicId: string): void {
    this.api.get<StudySession[]>(
      `/sessions/topic/${topicId}`
    ).subscribe({
      next: response => {
        this.sessionsByTopic[topicId] = response;
      },
      error: error => {
        this.errorMessage =
          error.error?.message || 'Unable to load topic sessions.';
      }
    });
  }

  // =========================
  // ADD / EDIT SESSION
  // =========================

  toggleSessionForm(topicId: string): void {
    if (this.sessionFormTopicId === topicId) {
      this.cancelSessionEdit();

      return;
    }

    this.cancelSessionEdit();

    this.sessionFormTopicId = topicId;
  }

  saveSession(topicId: string): void {
    if (!this.sessionDate) {
      this.errorMessage = 'Session date is required.';

      return;
    }

    if (
      this.sessionMinutes === null ||
      !Number.isInteger(Number(this.sessionMinutes)) ||
      this.sessionMinutes < 5 ||
      this.sessionMinutes > 480
    ) {
      this.errorMessage =
        'Session duration must be a whole number between 5 and 480 minutes.';

      return;
    }

    if (this.sessionDate > this.todayDate) {
      this.errorMessage = 'Future session dates are not allowed.';

      return;
    }

    this.saving = true;

    this.errorMessage = '';

    this.successMessage = '';

    const data = {
      sessionDate: this.sessionDate,
      minutes: Number(this.sessionMinutes),
      note: this.sessionNote.trim()
    };

    const request = this.editingSessionId
      ? this.api.patch(
          `/sessions/${this.editingSessionId}`,
          data
        )
      : this.api.post('/sessions', {
          ...data,
          topicId
        });

    request.subscribe({
      next: () => {
        this.saving = false;

        this.successMessage = this.editingSessionId
          ? 'Study session updated successfully!'
          : 'Study session recorded successfully!';

        this.cancelSessionEdit();

        this.loadSessions();

        this.loadTopicSessions(topicId);

        if (this.expandedGoalId) {
          this.loadGoalProgress(this.expandedGoalId);
        }
      },
      error: error => {
        this.saving = false;

        const message = error.error?.message;

        this.errorMessage = Array.isArray(message)
          ? message.join(', ')
          : message || 'Unable to save study session.';
      }
    });
  }

  editSession(session: StudySession, topicId: string): void {
    this.sessionFormTopicId = topicId;

    this.editingSessionId = session.id;

    this.sessionDate = session.sessionDate.slice(0, 10);

    this.sessionMinutes = session.minutes;

    this.sessionNote = session.note || '';

    this.errorMessage = '';

    this.successMessage = '';
  }

  // =========================
  // DELETE SESSION
  // =========================

  deleteSession(sessionId: string, topicId: string): void {
    if (!confirm('Are you sure you want to delete this study session?')) {
      return;
    }

    this.api.delete(`/sessions/${sessionId}`).subscribe({
      next: () => {
        this.successMessage = 'Study session deleted successfully!';

        this.loadSessions();

        this.loadTopicSessions(topicId);

        if (this.expandedGoalId) {
          this.loadGoalProgress(this.expandedGoalId);
        }
      },
      error: error => {
        this.errorMessage =
          error.error?.message || 'Unable to delete study session.';
      }
    });
  }

  // =========================
  // RESET SESSION FORM
  // =========================

  cancelSessionEdit(): void {
    this.sessionFormTopicId = null;

    this.editingSessionId = null;

    this.sessionDate = this.getTodayDate();

    this.sessionMinutes = null;

    this.sessionNote = '';
  }

  // =========================
  // STUDY TIME CALCULATIONS
  // =========================

  get totalStudyMinutes(): number {
    return this.sessions.reduce(
      (total, session) => total + Number(session.minutes || 0),
      0
    );
  }

  get totalStudyHours(): number {
    return Math.floor(this.totalStudyMinutes / 60);
  }

  get remainingStudyMinutes(): number {
    return this.totalStudyMinutes % 60;
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);

    const remaining = minutes % 60;

    if (hours === 0) {
      return `${remaining} min`;
    }

    if (remaining === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${remaining} min`;
  }

  // =========================
  // LOGOUT
  // =========================

  logout(): void {
    this.auth.logout();
  }
}
