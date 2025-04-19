import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ProgressService } from '../../services/progress.service';

interface Course {
  id: string;
  title: string;
  level: string; // Language level: A1, A2, B1, B2, C1, C2
  progress: number;
  lastAccessed: Date;
}

interface UserProgressRecord {
  id: number;
  user_id: number;
  article_id: number;
  level: string;
  exercise_type: string;
  exercise_number: number;
  score: number;
  created_at?: string;
  updated_at?: string;
}

interface UserProgressStats {
  completedExercises: number;
  completedArticles: number;
  totalTimeSpent: number; // in minutes
}

interface LevelProgress {
  level: string;
  description: string;
  totalExercises: number;
  completedExercises: number;
  progress: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  userData: any = null;
  progressRecords: UserProgressRecord[] = [];
  userStats: UserProgressStats = {
    completedExercises: 0,
    completedArticles: 0,
    totalTimeSpent: 0
  };
  recentCourses: Course[] = [];
  levelProgressData: LevelProgress[] = [];
  isLoading = true;

  // Language level descriptions
  levelDescriptions = {
    'A1': 'Iniciante',
    'A2': 'Básico',
    'B1': 'Intermediário',
    'B2': 'Intermediário Alto',
    'C1': 'Avançado',
    'C2': 'Proficiente'
  };

  constructor(
    private authService: AuthService,
    private progressService: ProgressService
  ) { }

  ngOnInit(): void {
    this.loadUserData();
    this.loadUserProgress();
  }

  loadUserData(): void {
    this.userData = this.authService.getCurrentUser();
    // If we don't have user data in the service, attempt to reload it
    if (!this.userData) {
      this.authService.validateToken().subscribe(user => {
        this.userData = user;
      });
    }
  }

  loadUserProgress(): void {
    this.progressService.getUserProgress().subscribe(
      data => {
        // Process user progress data
        if (data && Array.isArray(data)) {
          this.progressRecords = data;
          
          // Calculate user statistics from progress records
          this.calculateUserStats();
          
          // Generate course data from progress records
          this.generateCourseData();
        } else {
          // If API doesn't return expected format, use mock data
          this.setMockData();
        }
        this.isLoading = false;
      },
      error => {
        console.error('Error fetching user progress:', error);
        // Set mock data in case of error
        this.setMockData();
        this.isLoading = false;
      }
    );
  }

  calculateUserStats(): void {
    // Group exercises by article to count completed articles
    const completedArticles = new Set();
    
    // Count exercises
    let exerciseCount = 0;
    
    // Calculate estimated time spent (this would be more accurate if actual time tracking exists in the API)
    let estimatedTimeSpent = 0;
    
    this.progressRecords.forEach(record => {
      // Add to completed articles set
      if (record.score > 0) {
        completedArticles.add(record.article_id);
      }
      
      // Count exercises with score (completed exercises)
      if (record.score > 0) {
        exerciseCount++;
        
        // Estimate time spent (average 5 minutes per exercise)
        estimatedTimeSpent += 5;
      }
    });
    
    this.userStats = {
      completedExercises: exerciseCount,
      completedArticles: completedArticles.size,
      totalTimeSpent: estimatedTimeSpent
    };

    // Additional code to calculate level progress
    this.calculateLevelProgress();
  }

  calculateLevelProgress(): void {
    // Group progress records by level
    const levelStats = new Map<string, {total: number, completed: number}>();
    
    // Initialize all levels with zero values
    Object.keys(this.levelDescriptions).forEach(level => {
      levelStats.set(level, {total: 0, completed: 0});
    });
    
    // Process progress records to count by level
    this.progressRecords.forEach(record => {
      const level = record.level;
      if (levelStats.has(level)) {
        const stats = levelStats.get(level)!;
        stats.total++;
        if (record.score > 0) {
          stats.completed++;
        }
      }
    });
    
    // Convert the map to the LevelProgress array
    this.levelProgressData = Array.from(levelStats.entries()).map(([level, stats]) => {
      return {
        level,
        description: this.levelDescriptions[level as keyof typeof this.levelDescriptions] || level,
        totalExercises: stats.total,
        completedExercises: stats.completed,
        progress: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      };
    });
    
    // Sort by level
    this.levelProgressData.sort((a, b) => {
      const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
      return levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level);
    });
  }

  generateCourseData(): void {
    // Group courses by language level using the progress records
    const coursesByLevel = new Map<string, any[]>();
    
    // In a real app, this would use real data from the API
    // For now, we'll create mock courses distributed by levels
    
    this.recentCourses = [
      {
        id: '1',
        title: 'Vocabulário Básico',
        level: 'A1',
        progress: 90,
        lastAccessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
      },
      {
        id: '2',
        title: 'Gramática para Iniciantes',
        level: 'A1',
        progress: 75,
        lastAccessed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      },
      {
        id: '3',
        title: 'Conversação Básica',
        level: 'A2',
        progress: 60,
        lastAccessed: new Date()
      },
      {
        id: '4',
        title: 'Leitura e Compreensão',
        level: 'A2',
        progress: 45,
        lastAccessed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
      },
      {
        id: '5',
        title: 'Expressões Idiomáticas',
        level: 'B1',
        progress: 30,
        lastAccessed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      {
        id: '6',
        title: 'Gramática Intermediária',
        level: 'B1',
        progress: 20,
        lastAccessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
      }
    ];
  }

  setMockData(): void {
    this.userStats = {
      completedExercises: 42,
      completedArticles: 15,
      totalTimeSpent: 1230 // ~20 hours
    };

    // Create mock level progress data
    this.levelProgressData = [
      {
        level: 'A1',
        description: 'Iniciante',
        totalExercises: 50,
        completedExercises: 45,
        progress: 90
      },
      {
        level: 'A2',
        description: 'Básico',
        totalExercises: 60,
        completedExercises: 30,
        progress: 50
      },
      {
        level: 'B1',
        description: 'Intermediário',
        totalExercises: 80,
        completedExercises: 20,
        progress: 25
      },
      {
        level: 'B2',
        description: 'Intermediário Alto',
        totalExercises: 70,
        completedExercises: 5,
        progress: 7
      },
      {
        level: 'C1',
        description: 'Avançado',
        totalExercises: 40,
        completedExercises: 0,
        progress: 0
      },
      {
        level: 'C2',
        description: 'Proficiente',
        totalExercises: 30,
        completedExercises: 0,
        progress: 0
      }
    ];
    
    // Generate mock courses
    this.generateCourseData();
  }

  getCoursesByLevel(level: string): Course[] {
    return this.recentCourses.filter(course => course.level === level);
  }

  hasCourses(level: string): boolean {
    return this.recentCourses.some(course => course.level === level);
  }

  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }
}
