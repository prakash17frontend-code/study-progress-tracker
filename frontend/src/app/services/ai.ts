
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private http = inject(HttpClient);
  private apiUrl = 'https://studyflow-backend-1bxh.onrender.com/ai';

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');

    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  // Generate AI study plan
  generateStudyPlan(data: {
    availableHoursPerDay: number;
    targetDate: string;
    goalId?: string;
  }): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/study-plan`,
      data,
      { headers: this.getHeaders() }
    );
  }

  // Get AI smart topic recommendations
  getTopicRecommendations(): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/topic-recommendations`,
      { headers: this.getHeaders() }
    );
  }
}
