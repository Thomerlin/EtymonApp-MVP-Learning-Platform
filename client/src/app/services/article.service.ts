import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  private apiUrl = `${environment.apiUrl}/api/article`;
  private getHeaders(): HttpHeaders {
    return new HttpHeaders().set("Authorization", "Bearer " + (localStorage.getItem("token") || ""));
  }

  constructor(private http: HttpClient) { }

  getArticle(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/articles/${id}`,
      { headers: this.getHeaders() });
  }

  getArticlesSummary(): Observable<any> {
    return this.http.get(`${this.apiUrl}/articles-summary`);
  }

  getRandomLevel(): Observable<any> {
    return this.http.get(`${this.apiUrl}/random-level`);
  }
}
