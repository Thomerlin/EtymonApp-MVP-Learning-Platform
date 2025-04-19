import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgressExercisesComponent } from './progress-exercises.component';

describe('ProgressExercisesComponent', () => {
  let component: ProgressExercisesComponent;
  let fixture: ComponentFixture<ProgressExercisesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressExercisesComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(ProgressExercisesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
