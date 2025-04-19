import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  isAuthenticated = false;
  userName: string | null = null;
  darkMode = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private themeService: ThemeService
  ) { }

  ngOnInit(): void {
    // Check authentication status
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.userName = user?.name ?? null;
    });

    // Check initial dark mode setting
    this.darkMode = this.themeService.isDarkMode();
  }

  login(): void {
    this.authService.initiateGoogleLogin();
  }

  logout(): void {
    alert('Logout functionality is not implemented yet.'); // Placeholder for logout functionality
    // this.authService.logout().subscribe(() => {
    //   this.router.navigate(['/']);
    // });
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    this.themeService.toggleDarkMode();
  }
}
