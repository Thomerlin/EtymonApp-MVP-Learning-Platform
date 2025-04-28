import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {
  private apiUrl = `${environment.apiUrl}/api/exercise`;
  private getHeaders(): HttpHeaders {
    return new HttpHeaders().set("Authorization", "Bearer " + (localStorage.getItem("token") || ""));
  }

  constructor(private http: HttpClient) { }

  getExercises(levelId: number, type: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${levelId}/${type}`);
  }

  validateExercise(exerciseId: number, answer: string, type: string, articleId: number, level: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate`, {
      exerciseId,
      answer,
      type,
      articleId,
      level
    }, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  updateReadingTime(articleId: number, level: string, seconds: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/reading-time`, {
      articleId,
      level,
      seconds
    }, { headers: this.getHeaders() }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    // Preserve the full error response including correctAnswer
    return throwError(error);
  }
}
