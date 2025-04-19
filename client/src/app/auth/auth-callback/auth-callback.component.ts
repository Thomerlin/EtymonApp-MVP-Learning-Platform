import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  template: `<div class="callback-container">
    <div class="loader"></div>
    <p>Autenticando, por favor aguarde...</p>
  </div>`,
  styles: [`
    .callback-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: Arial, sans-serif;
    }
    .loader {
      border: 5px solid #f3f3f3;
      border-top: 5px solid #4285f4;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    // Get token from query params
    this.route.queryParams.subscribe(params => {
      const token = params['token'];

      if (token) {
        // Process the OAuth callback by saving the token
        this.authService.handleGoogleCallback(token);
      } else {
        // No token found in URL, redirect to login
        this.router.navigate(['/login']);
      }
    });
  }
}
