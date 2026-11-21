
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../../services/ai';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ai-planner',
  standalone: true,
  imports: [CommonModule, FormsModule,RouterLink],
  templateUrl: './ai-planner.html',
  styleUrl: './ai-planner.css',
})
export class AiPlanner {
  private aiService = inject(AiService);

  availableHoursPerDay = 2;
  targetDate = '2026-12-05';

  loading = false;
  errorMessage = '';
  studyPlan: any = null;

  generatePlan() {
    this.loading = true;
    this.errorMessage = '';
    this.studyPlan = null;

    this.aiService.generateStudyPlan({
      availableHoursPerDay: this.availableHoursPerDay,
      targetDate: this.targetDate
    }).subscribe({
      next: (response) => {
        this.studyPlan = response.studyPlan;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'Unable to generate study plan.';
        this.loading = false;
      }
    });
  }
}
