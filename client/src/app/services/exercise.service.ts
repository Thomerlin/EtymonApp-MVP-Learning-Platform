import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
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
    return this.http.post(`${this.apiUrl}/validate`,
      { exerciseId, answer, type, articleId, level },
      { headers: this.getHeaders() });
  }
}
