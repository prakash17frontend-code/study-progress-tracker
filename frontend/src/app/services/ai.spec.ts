import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { AiService } from './ai';

describe('AiService', () => {
  let service: AiService;
  let httpMock: HttpTestingController;

  const apiUrl = 'https://studyflow-backend-1bxh.onrender.com/ai';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AiService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.setItem('access_token', 'test-token');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('access_token');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send a request to generate an AI study plan', () => {
    const studyData = {
      availableHoursPerDay: 2,
      targetDate: '2026-12-05',
      goalId: '1',
    };

    service.generateStudyPlan(studyData).subscribe();

    const request = httpMock.expectOne(`${apiUrl}/study-plan`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(studyData);
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer test-token',
    );

    request.flush({ message: 'AI study plan generated successfully' });
  });

  it('should request AI topic recommendations', () => {
    service.getTopicRecommendations().subscribe();

    const request = httpMock.expectOne(`${apiUrl}/topic-recommendations`);

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization')).toBe(
      'Bearer test-token',
    );

    request.flush([{ topic: 'CSS Fundamentals' }]);
  });
});
