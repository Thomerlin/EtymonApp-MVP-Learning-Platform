import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProgressService {
  private apiUrl = `${environment.apiUrl}/api/progress`;

  private getHeaders(): HttpHeaders {
    return new HttpHeaders().set("Authorization", "Bearer " + (localStorage.getItem("token") || ""));
  }

  constructor(private http: HttpClient) { }

  getUserProgress(): Observable<any> {
    return this.http.get(`${this.apiUrl}/article`);
  }

  getArticleLevelProgress(userId: number, articleId: string, level: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/exercise`, {
      headers: this.getHeaders(),
      params: { userId: userId.toString(), articleId, level }
    });
  }
}
