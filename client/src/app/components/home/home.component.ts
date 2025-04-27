import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ArticleService } from '../../services/article.service';
import { ThemeService } from '../../services/theme.service';


interface Sentence {
  text: string;
  phonetic: string;
  visible: boolean;
  words: {
    text: string;
    phonetic: string;
  }[];
  index: number; // Add this new property
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  isAuthenticated = false;
  articles: any[] = [];
  userName: string | null = null;
  isLoading = true;
  error: string | null = null;
  loggedIn: boolean = false;
  showArticlesUpTo: number = 5;
  sentences: Sentence[] = [];

  // Properties
  randomExerciseLevel: any = null;
  popupVisible: boolean = false;
  popupContent: { text: string; phonetic: string | null } | null = null;
  darkMode: boolean = false;

  constructor(
    private authService: AuthService,
    private articleService: ArticleService,
    private router: Router,
    private themeService: ThemeService
  ) { }

  ngOnInit(): void {
    // Always load articles regardless of authentication status
    this.loadArticles();

    // Check authentication status
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.userName = user?.display_name ?? null;
      this.loggedIn = this.isAuthenticated;
    });

    // Load a random exercise level for the demo
    this.loadRandomExercise();

    // Subscribe to theme changes
    this.themeService.darkMode$.subscribe(isDark => {
      this.darkMode = isDark;
    });
  }

  loadArticles(): void {
    this.isLoading = true;
    this.articleService.getArticlesSummary().subscribe(
      (data) => {
        this.articles = data;
        this.isLoading = false;
      },
      (error) => {
        console.error('Error fetching articles:', error);
        this.error = 'Failed to load articles. Please try again later.';
        this.isLoading = false;
      }
    );
  }

  // Add method to load random exercise
  loadRandomExercise(): void {
    this.articleService.getRandomLevel().subscribe(
      (data) => {
        this.randomExerciseLevel = data;

        // Process sentences from the random exercise level
        const paragraphs = data.content.split('\n\n ').map((p: string) => p.trim()).filter((p: string) => p);
        const phoneticParagraphs = data.phonetics.split('\n\n ').map((p: string) => p.trim()).filter((p: string) => p);

        this.sentences = [];
        paragraphs.forEach((paragraph: string, paragraphIndex: number) => {
          const phoneticParagraph = phoneticParagraphs[paragraphIndex] || '';

          // Divida o parágrafo em sentenças, preservando os pontos finais
          const paragraphSentences = paragraph.match(/[^.?!]+[.?!]/g) || [];
          const phoneticSentences = phoneticParagraph.match(/[^.?!]+[.?!]/g) || [];

          // Processe cada sentença do parágrafo
          paragraphSentences.forEach((sentenceText: string, sentenceIndex: number) => {
            const phoneticText = phoneticSentences[sentenceIndex] || '';

            // Divida a sentença em palavras, preservando os pontos finais
            const words = sentenceText.match(/\S+|\./g) || [];
            const phoneticWords = phoneticText.match(/\S+|\./g) || [];

            // Crie os pares de palavra/fonética
            const wordPairs = words.map((word: string, wordIndex: number) => {
              return {
                text: word,
                phonetic: phoneticWords[wordIndex] || ''
              };
            });

            // Adicione a sentença processada ao array com um índice único
            this.sentences.push({
              text: sentenceText,
              phonetic: phoneticText,
              visible: false,
              words: wordPairs,
              index: this.sentences.length // Add a unique index to each sentence
            });

          });
        });
      },
      (error) => {
        console.error('Error fetching random exercise level:', error);
      }
    );
  }

  toggleDarkMode(): void {
    this.themeService.toggleDarkMode();
  }

  togglePopup(index: number): void {
    if (index < 0 || index >= this.sentences.length) {
      console.error(`Invalid index: ${index}`);
      return;
    }

    this.popupContent = this.sentences[index];
    this.popupVisible = true;
  }

  closePopup(): void {
    this.popupVisible = false;
    this.popupContent = null;
  }

  playAudio(text: string | undefined): void {
    if (!text) return;

    // Using Web Speech API for text-to-speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }

  replaceHyphensWithSpaces(text: string | null): string {
    if (!text) return '';
    return text.replace(/-/g, ' ');
  }

  seeMoreArticles(): void {
    this.showArticlesUpTo += 5; // Load 5 more articles
  }

  viewArticle(articleId: number): void {
    this.router.navigate(['/article', articleId]);
  }

  redirectToArticle(articleId: number, level: string): void {
    this.router.navigate(['/article', articleId], { queryParams: { level } });
  }

  sortLevels(levels: any[]): any[] {
    const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    return [...levels].sort((a, b) => {
      return levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level);
    });
  }
}