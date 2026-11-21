
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { Api } from '../../services/api';

interface Learner {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface GoalProgress {
  goal: {
    id: string;
    title: string;
    description: string;
  };
  learner: {
    id: string;
    name: string;
    email: string;
  };
  summary: {
    totalTopics: number;
    completedTopics: number;
    pendingTopics: number;
    completionPercentage: number;
    totalMinutes: number;
    totalHours: number;
  };
  pendingTopicList: {
    id: string;
    title: string;
  }[];
  chartData: {
    topic: string;
    completed: number;
    pending: number;
  }[];
}

interface LearnerOverview {
  learner: Learner;
  progress: GoalProgress[];
}

@Component({
  selector: 'app-mentor-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mentor-dashboard.html',
  styleUrl: './mentor-dashboard.css'
})
export class MentorDashboard implements OnInit {
  learners: Learner[] = [];
  learnerOverviews: LearnerOverview[] = [];

  selectedLearner: Learner | null = null;
  selectedProgress: GoalProgress[] = [];

  loading = false;
  loadingDetails = false;
  errorMessage = '';

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.loadLearners();
  }

  loadLearners(): void {
    this.loading = true;
    this.errorMessage = '';

    this.api.get<Learner[]>('/users').subscribe({
      next: (users) => {
        this.learners = users.filter(
          user => user.role === 'learner'
        );

        this.loading = false;
        this.loadAllLearnerProgress();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.error?.message || 'Unable to load learners.';
      }
    });
  }

  loadAllLearnerProgress(): void {
    if (this.learners.length === 0) {
      this.learnerOverviews = [];
      return;
    }

    const requests = this.learners.map(learner =>
      this.api.get<GoalProgress[]>(
        `/progress/learner/${learner.id}`
      )
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        this.learnerOverviews = this.learners.map(
          (learner, index) => ({
            learner,
            progress: results[index]
          })
        );
      },
      error: () => {
        this.errorMessage =
          'Learners loaded, but progress could not be retrieved.';
      }
    });
  }

  viewLearner(learner: Learner): void {
    this.selectedLearner = learner;
    this.loadingDetails = true;
    this.selectedProgress = [];

    this.api.get<GoalProgress[]>(
      `/progress/learner/${learner.id}`
    ).subscribe({
      next: (progress) => {
        this.selectedProgress = progress;
        this.loadingDetails = false;
      },
      error: () => {
        this.loadingDetails = false;
        this.errorMessage = 'Unable to load learner progress.';
      }
    });
  }

  closeLearnerDetails(): void {
    this.selectedLearner = null;
    this.selectedProgress = [];
    this.errorMessage = '';
  }

  get totalGoals(): number {
    return this.learnerOverviews.reduce(
      (total, item) => total + item.progress.length,
      0
    );
  }

  get totalTopics(): number {
    return this.learnerOverviews.reduce(
      (total, item) =>
        total + item.progress.reduce(
          (sum, goal) => sum + goal.summary.totalTopics,
          0
        ),
      0
    );
  }

  get completedTopics(): number {
    return this.learnerOverviews.reduce(
      (total, item) =>
        total + item.progress.reduce(
          (sum, goal) => sum + goal.summary.completedTopics,
          0
        ),
      0
    );
  }

  get totalStudyMinutes(): number {
    return this.learnerOverviews.reduce(
      (total, item) =>
        total + item.progress.reduce(
          (sum, goal) => sum + goal.summary.totalMinutes,
          0
        ),
      0
    );
  }

  get totalStudyHours(): string {
    return (this.totalStudyMinutes / 60).toFixed(1);
  }

  get overallCompletion(): number {
    if (this.totalTopics === 0) {
      return 0;
    }

    return Math.round(
      (this.completedTopics / this.totalTopics) * 100
    );
  }

  getLearnerCompletion(progress: GoalProgress[]): number {
    const total = progress.reduce(
      (sum, goal) => sum + goal.summary.totalTopics,
      0
    );

    const completed = progress.reduce(
      (sum, goal) => sum + goal.summary.completedTopics,
      0
    );

    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }

  getLearnerStudyHours(progress: GoalProgress[]): string {
    const minutes = progress.reduce(
      (sum, goal) => sum + goal.summary.totalMinutes,
      0
    );

    return (minutes / 60).toFixed(1);
  }

  // Navigate to mentor settings
  openSettings(): void {
    window.location.href = '/mentor-settings';
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}
