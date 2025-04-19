import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ArticleService } from '../../services/article.service';

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

  // Add missing properties
  randomExerciseLevel: any = null;
  sentences: any[] = [];
  popupVisible: boolean = false;
  popupContent: { text: string; phonetic: string | null } | null = null;
  darkMode: boolean = false;

  constructor(
    private authService: AuthService,
    private articleService: ArticleService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Always load articles regardless of authentication status
    this.loadArticles();

    // Check authentication status
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.userName = user?.name ?? null;
      this.loggedIn = this.isAuthenticated;
    });

    // Load a random exercise level for the demo
    this.loadRandomExercise();
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

          const paragraphSentences = paragraph.match(/[^.?!]+[.?!]/g) || [];
          const phoneticSentences = phoneticParagraph.match(/[^.?!]+[.?!]/g) || [];

          paragraphSentences.forEach((sentenceText: string, sentenceIndex: number) => {
            const phoneticText = phoneticSentences[sentenceIndex] || '';
            const words = sentenceText.match(/\S+|\./g) || [];
            const phoneticWords = phoneticText.match(/\S+|\./g) || [];

            const wordPairs = words.map((word: string, wordIndex: number) => ({
              text: word,
              phonetic: phoneticWords[wordIndex] || ''
            }));

            this.sentences.push({
              text: sentenceText,
              phonetic: phoneticText,
              visible: false,
              words: wordPairs
            });
          });
        });
      },
      (error) => {
        console.error('Error fetching random exercise level:', error);
      }
    );
  }

  // Add missing methods
  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    document.body.classList.toggle('dark-mode', this.darkMode);
  }

  togglePopup(sentenceIndex: number): void {
    const sentence = this.sentences[sentenceIndex];
    if (sentence) {
      this.popupContent = {
        text: sentence.text,
        phonetic: sentence.words.map((w: any) => w.phonetic).join(' '),
      };
      this.popupVisible = true;
    }
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

  login(): void {
    this.authService.initiateGoogleLogin();
  }

  viewArticle(articleId: number): void {
    this.router.navigate(['/article', articleId]);
  }

  redirectToArticle(articleId: number, level: string): void {
    this.router.navigate(['/article', articleId], { queryParams: { level } });
  }
}