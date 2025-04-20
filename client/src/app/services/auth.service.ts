import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';

interface User {
  id: number;
  email: string;
  display_name?: string;
  profile_picture?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser$: Observable<User | null>;
  private tokenExpirationTimer: any;

  constructor(private http: HttpClient, private router: Router) {
    this.currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromLocalStorage());
    this.currentUser$ = this.currentUserSubject.asObservable();

    // Auto login if token exists
    if (this.getToken()) {
      this.validateToken().subscribe();
    }
  }

  autoLogin(): void {
    const userData = this.getUserFromLocalStorage();
    if (!userData) {
      return;
    }

    this.currentUserSubject.next(userData);
  }

  logout(): void {
    // First, clear local data
    const clearLocalData = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('tokenExpiration');
      this.currentUserSubject.next(null);
      if (this.tokenExpirationTimer) {
        clearTimeout(this.tokenExpirationTimer);
      }
      this.tokenExpirationTimer = null;
      this.router.navigate(['/login']);
    };

    // Then attempt to notify the server
    this.http.get(`${this.apiUrl}/auth/logout`).pipe(
      catchError(error => {
        console.error('Logout error:', error);
        return of(null);
      }),
      finalize(() => {
        clearLocalData();
      })
    ).subscribe();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  handleGoogleCallback(token: string): void {
    localStorage.setItem('token', token);
    this.validateToken().subscribe(user => {
      if (user) {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  validateToken(): Observable<User | null> {
    return this.http.get<User>(`${this.apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    }).pipe(
      tap(user => {
        const userData = {
          id: user.id,
          email: user.email,
          display_name: user.display_name || user.email.split('@')[0],
          profile_picture: user.profile_picture
        };
        localStorage.setItem('user', JSON.stringify(userData));
        this.currentUserSubject.next(userData);
      }),
      catchError(error => {
        console.error('Token validation error', error);
        this.logout();
        return of(null);
      })
    );
  }

  initiateGoogleLogin(): void {
    window.location.href = `${this.apiUrl}/auth/google`;
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value; // Returns true if a user is logged in
  }

  private setAutoLogout(expirationDuration: number): void {
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, expirationDuration);
  }

  private getUserFromLocalStorage(): User | null {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      return null;
    }

    try {
      const user = JSON.parse(userJson);
      // Ensure display_name exists
      if (!user.display_name && user.email) {
        user.display_name = user.email.split('@')[0];
      }
      return user;
    } catch (e) {
      localStorage.removeItem('user');
      return null;
    }
  }
}
