import { Component, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { ProgressService } from '../../services/progress.service';

@Component({
  selector: 'app-progress-exercises',
  templateUrl: './progress-exercises.component.html',
  styleUrls: ['./progress-exercises.component.scss']
})
export class ProgressExercisesComponent implements OnChanges, OnInit {
  @Input() articleId: string = ''; // Dynamically passed article ID
  @Input() level: string = ''; // Dynamically passed level
  @Input() userId: number = 1; // Replace with dynamic user ID if needed
  progressData: any = null;
  isAccordionOpen = false;
  progressCelebration: string | null = null;
  previousPercentage: number = 0;

  constructor(private progressService: ProgressService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['articleId'] || changes['level']) {
      this.fetchExercisesProgress();
    }
  }

  ngOnInit(): void {
    // Initialization logic if needed
  }

  public getData(articleId: string, level: string): void {
    this.articleId = articleId;
    this.level = level;
    this.fetchExercisesProgress();
  }

  public fetchExercisesProgress(): void {
    if (this.articleId && this.level) {
      this.progressService.getArticleLevelProgress(this.userId, this.articleId, this.level).subscribe({
        next: (data) => {
          // Store previous percentage for comparison
          const prevPercentage = this.progressData?.totalPercentage || 0;

          this.progressData = {
            articleId: data.articleId,
            level: data.level,
            exercises: data.exercises.map((ex: any) => ({
              type: ex.type.replace(/_/g, ' '), // Replace underscores with spaces
              completed: ex.completed,
              total: ex.total,
              percentage: ex.percentage,
              averageScore: ex.averageScore
            })),
            totalCompleted: data.totalCompleted,
            totalExercises: data.totalExercises,
            totalPercentage: data.totalPercentage
          };

          // Check if we crossed a milestone
          this.checkProgressMilestone(prevPercentage, this.progressData.totalPercentage);
        },
        error: (err) => {
          if (err.status === 404) {
            console.warn('No progress found for the specified article and level.');
          } else {
            console.error('Error fetching exercises progress:', err);
          }
        }
      });
    }
  }

  // Check for progress milestones to trigger animations
  private checkProgressMilestone(previous: number, current: number): void {
    // Only celebrate increasing progress
    if (current <= previous) return;

    // Check for milestone crossing
    const milestones = [25, 50, 75, 100];

    for (const milestone of milestones) {
      if (previous < milestone && current >= milestone) {
        // We crossed a milestone - celebrate!
        this.progressCelebration = `celebrate-${milestone}`;

        // Reset celebration after animation completes
        setTimeout(() => {
          this.progressCelebration = null;
        }, 1500);

        break; // Only celebrate one milestone at a time
      }
    }
  }

  public toggleAccordion(): void {
    this.isAccordionOpen = !this.isAccordionOpen;
  }
}
