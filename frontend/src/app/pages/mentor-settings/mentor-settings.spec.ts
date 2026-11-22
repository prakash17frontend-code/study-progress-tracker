import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MentorSettings } from './mentor-settings';

describe('MentorSettings', () => {
  let component: MentorSettings;
  let fixture: ComponentFixture<MentorSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentorSettings],
      providers: [
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MentorSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
