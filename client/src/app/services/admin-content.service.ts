import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

// Define Article interface (matching with the component's interface)
interface Article {
  id: number;
  title: string;
  summary: string;
  created_date: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminContentService {
  private apiUrl = `${environment.apiUrl}/api/admin`;
  private getHeaders(): HttpHeaders {
    return new HttpHeaders().set("Authorization", "Bearer " + (localStorage.getItem("token") || ""));
  }

  constructor(private http: HttpClient) { }

  /**
   * Submit new article content to the API
   * @param contentData The JSON content data for the new article
   */
  submitContent(contentData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/content`, contentData, { headers: this.getHeaders() });
  }

  /**
   * Check admin status by calling the admin status endpoint
   * Returns an observable that resolves to true if the user is admin, false otherwise
   */
  checkAdminStatus(): Observable<boolean> {
    return this.http.get<any>(`${this.apiUrl}/status`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Admin status check failed:', error);
          return of(false);
        })
      );
  }

  /**
   * Get articles summary for admin management
   */
  getArticlesSummary(): Observable<Article[]> {
    return this.http.get<Article[]>(`${environment.apiUrl}/api/article/articles-summary`, { headers: this.getHeaders() });
  }

  /**
   * Delete an article by its ID
   * @param articleId The ID of the article to delete
   */
  deleteArticle(articleId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/article/${articleId}`, { headers: this.getHeaders() });
  }
}
