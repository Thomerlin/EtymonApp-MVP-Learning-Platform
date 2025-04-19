import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ProgressService } from '../../services/progress.service';

@Component({
  selector: 'app-progress-exercises',
  templateUrl: './progress-exercises.component.html',
  styleUrls: ['./progress-exercises.component.scss']
})
export class ProgressExercisesComponent implements OnChanges {
  @Input() articleId: string = ''; // Dynamically passed article ID
  @Input() level: string = ''; // Dynamically passed level
  @Input() userId: number = 1; // Replace with dynamic user ID if needed
  progressData: any = null;

  constructor(private progressService: ProgressService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['articleId'] || changes['level']) {
      this.fetchExercisesProgress();
    }
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
}
