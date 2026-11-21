import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MentorSettings } from './mentor-settings';

describe('MentorSettings', () => {
  let component: MentorSettings;
  let fixture: ComponentFixture<MentorSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentorSettings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MentorSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
