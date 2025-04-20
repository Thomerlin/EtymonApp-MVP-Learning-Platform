import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ProgressService } from '../../services/progress.service';


// Updated interface to match actual API response
interface UserProgressStats {
  totalExercises: number;
  solvedExercises: number;
  exercisesByLevel: LevelExercises[];
  readArticles: {
    count: number;
    details: ReadArticle[];
  };
  totalReadingTime: number;
  readingTimeFormatted: string;
}

interface LevelExercises {
  level: string;
  totalExercises: number;
  solvedExercises: number;
}

interface ReadArticle {
  id: number;
  title: string;
  level: string;
  readingTime: number;
  readDate: Date;
}

interface UserData {
  id: number;
  email: string,
  display_name?: string,
  profile_picture?: string
};
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  userData: UserData = {
    id: 0,
    email: '',
    display_name: '',
    profile_picture: ''
  };
  userStats: UserProgressStats = {
    totalExercises: 0,
    solvedExercises: 0,
    exercisesByLevel: [],
    readArticles: {
      count: 0,
      details: []
    },
    totalReadingTime: 0,
    readingTimeFormatted: "0 minutes"
  };
  levelProgressData: LevelExercises[] = [];
  isLoading = true;

  constructor(
    private authService: AuthService,
    private progressService: ProgressService
  ) { }

  ngOnInit(): void {
    this.loadUserData();
    this.loadUserProgress();
  }

  loadUserData(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userData = {
        ...currentUser,
        display_name: currentUser.display_name || currentUser.email.split('@')[0],
        profile_picture: currentUser.profile_picture || ''
      };
    } else {
      // If we don't have user data in the service, attempt to reload it
      this.authService.validateToken().subscribe(user => {
        if (user) {
          this.userData = {
            ...user,
            display_name: user.display_name || user.email.split('@')[0],
            profile_picture: user.profile_picture || ''
          };
        }
      });
    }
  }

  loadUserProgress(): void {
    this.progressService.getUserProgress().subscribe(
      (data: UserProgressStats) => {
        if (data) {
          this.userStats = data;
          this.processProgressData(this.userStats.exercisesByLevel);
        }
        this.isLoading = false;
      },
      error => {
        console.error('Error fetching user progress:', error);
        this.isLoading = false;
      }
    );
  }

  processProgressData(data: any): void {
    this.levelProgressData = data
  }


  formatTime(minutes: number): string {
    if (this.userStats.readingTimeFormatted) {
      return this.userStats.readingTimeFormatted;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return hours > 0 ? `${hours}h ${remainingMinutes}min` : `${remainingMinutes}min`;
  }
}
