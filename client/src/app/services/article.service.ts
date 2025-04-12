import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ArticleService {
  private apiUrl = `${environment.apiUrl}/api/article`;

  constructor(private http: HttpClient) { }

  getArticle(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/articles/${id}`);
  }

  getArticlesSummary(): Observable<any> {
    return this.http.get(`${this.apiUrl}/articles-summary`);
  }

  getRandomLevel(): Observable<any> {
    return this.http.get(`${this.apiUrl}/random-level`);
  }
}
