import { Component, OnInit } from '@angular/core';
import { ArticleService } from '../../services/article.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  appName = 'Learning Platform';
  articlesSummary: any[] = [];
  randomLevel: any = null;
  isLoading = true;
  
  constructor(private articleService: ArticleService) {}
  
  ngOnInit(): void {
    this.fetchArticlesSummary();
    this.fetchRandomLevel();
  }
  
  fetchArticlesSummary(): void {
    this.articleService.getArticlesSummary().subscribe({
      next: (data) => {
        this.articlesSummary = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching article summaries:', error);
        this.isLoading = false;
      }
    });
  }
  
  fetchRandomLevel(): void {
    this.articleService.getRandomLevel().subscribe({
      next: (data) => {
        this.randomLevel = data;
      },
      error: (error) => {
        console.error('Error fetching random level:', error);
      }
    });
  }
}
