import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {
  private apiUrl = `${environment.apiUrl}/api/exercise`;

  constructor(private http: HttpClient) { }

  getExercises(levelId: number, type: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${levelId}/${type}`);
  }

  validateExercise(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate`, data);
  }
}
