
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Api } from '../../services/api';

interface AppSettings {
  minSessionMinutes: number;
  maxSessionMinutes: number;
  maxPrerequisitesPerTopic: number;
}

@Component({
  selector: 'app-mentor-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mentor-settings.html',
  styleUrl: './mentor-settings.css'
})
export class MentorSettings implements OnInit {
  settings: AppSettings = {
    minSessionMinutes: 5,
    maxSessionMinutes: 480,
    maxPrerequisitesPerTopic: 5
  };

  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';

  constructor(private api: Api) {}

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading = true;
    this.errorMessage = '';

    this.api.get<AppSettings>('/settings').subscribe({
      next: (data) => {
        this.settings = data;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'Unable to load settings.';
        this.loading = false;
      }
    });
  }

  saveSettings(): void {
    this.successMessage = '';
    this.errorMessage = '';

    const min = Number(this.settings.minSessionMinutes);
    const max = Number(this.settings.maxSessionMinutes);
    const prerequisites = Number(this.settings.maxPrerequisitesPerTopic);

    if (
      !Number.isInteger(min) ||
      !Number.isInteger(max) ||
      !Number.isInteger(prerequisites) ||
      min < 1 ||
      max < 1 ||
      prerequisites < 1
    ) {
      this.errorMessage = 'All settings must be positive whole numbers.';
      return;
    }

    if (min > max) {
      this.errorMessage =
        'Minimum session minutes cannot exceed maximum session minutes.';
      return;
    }

    this.saving = true;

    this.api.patch<any>('/settings', {
      minSessionMinutes: min,
      maxSessionMinutes: max,
      maxPrerequisitesPerTopic: prerequisites
    }).subscribe({
      next: (response) => {
        this.settings = response.settings;
        this.successMessage = 'Settings updated successfully!';
        this.saving = false;
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'Unable to save settings.';
        this.saving = false;
      }
    });
  }

  backToDashboard(): void {
    window.location.href = '/mentor-dashboard';
  }
}
