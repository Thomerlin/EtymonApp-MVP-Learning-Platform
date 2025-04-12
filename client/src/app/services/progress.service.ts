import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private apiUrl = `${environment.apiUrl}/api/progress`;

  constructor(private http: HttpClient) { }

  getUserProgress(): Observable<any> {
    return this.http.get(`${this.apiUrl}/article`);
  }

  getArticleLevelProgress(): Observable<any> {
    return this.http.get(`${this.apiUrl}/exercise`);
  }
}
