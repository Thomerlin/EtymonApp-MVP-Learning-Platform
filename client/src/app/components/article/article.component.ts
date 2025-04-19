import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, NavigationExtras } from '@angular/router';
import { TtsService } from '../../services/tts.service';
import { AuthService } from '../../services/auth.service';
import { ArticleService } from '../../services/article.service';

interface Sentence {
  text: string;
  phonetic: string;
  visible: boolean;
  words: {
    text: string;
    phonetic: string;
  }[];
}

interface Level {
  id: number;
  level: string;
  content: string;
  phonetics: string;
}

interface Article {
  id: number;
  title: string;
  articleLink: string;
  createdDate: string;
  summary: string;
  levels: Level[];
}

@Component({
  selector: 'app-article',
  templateUrl: './article.component.html',
  styleUrls: ['./article.component.scss']
})
export class ArticleComponent implements OnInit {
  article: Article | null = null;
  level: string = "A1";
  currentLevel: string = "A1";
  text: string = "";
  phonetics: string = "";
  title: string = "";
  createdDate: string = "";
  summary: string = "";
  sentences: Sentence[] = [];
  popupVisible: boolean = false;
  popupContent: { text: string; phonetic: string } | null = null;
  isArticlePlaying: boolean = false;
  isArticlePaused: boolean = false;
  currentArticleText: string = '';
  isPopupPlaying: boolean = false;
  isPopupPaused: boolean = false;
  currentPopupText: string = '';
  isLoading: boolean = false; // Add this loading state property
  
  // Authentication properties
  isAuthenticated = false;
  showAuthModal = false;

  constructor(
    private articleService: ArticleService,
    private route: ActivatedRoute,
    private router: Router,
    private ttsService: TtsService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    // Check authentication status
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });

    this.route.params.subscribe(params => {
      const id = +params['id'];
      this.isLoading = true; // Set loading state when initially loading the article
      this.route.queryParams.subscribe(queryParams => {
        this.level = queryParams['level'] || this.level;
        this.currentLevel = this.level;
        this.getArticleById(id);
      });
    });
    document.addEventListener('click', this.closePopupOnOutsideClick.bind(this));

    // Subscribe to TTS service's playing/paused status for article
    this.ttsService.isArticlePlaying$.subscribe(isPlaying => {
      this.isArticlePlaying = isPlaying;
    });

    this.ttsService.isArticlePaused$.subscribe(isPaused => {
      this.isArticlePaused = isPaused;
    });

    this.ttsService.articleText$.subscribe(text => {
      this.currentArticleText = text;
    });

    // For popup audio
    this.ttsService.isPopupPlaying$.subscribe(isPlaying => {
      this.isPopupPlaying = isPlaying;
    });

    this.ttsService.isPopupPaused$.subscribe(isPaused => {
      this.isPopupPaused = isPaused;
    });

    this.ttsService.popupText$.subscribe(text => {
      this.currentPopupText = text;
    });
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.closePopupOnOutsideClick.bind(this));
  }

  getArticleById(id: number) {
    this.articleService.getArticle(id).subscribe(
      (res: Article) => {
        console.log(res);
        this.article = res;
        this.title = res.title;
        this.createdDate = res.createdDate;
        this.summary = res.summary;
        this.loadLevel();
        this.isLoading = false; // Set loading state to false after content is loaded
      },
      (err: { status: number; message?: string }) => {
        if (err.status === 404) {
          console.log(`Article with ID ${id} not found.`);
          alert('The requested article was not found.');
        } else {
          console.log('Error loading article:', err);
        }
        this.isLoading = false; // Set loading state to false on error
      }
    );
  }

  loadLevel() {
    if (this.article) {
      const level = this.article.levels.find(l => l.level === this.level);
      if (level) {
        this.text = level.content;
        this.phonetics = level.phonetics;

        // Divide o conteúdo em parágrafos e sentenças
        const paragraphs = this.text.split('\n\n ').map(p => p.trim()).filter(p => p);
        const phoneticParagraphs = this.phonetics.split('\n\n ').map(p => p.trim()).filter(p => p);

        // Processa cada parágrafo
        this.sentences = [];
        paragraphs.forEach((paragraph, paragraphIndex) => {
          const phoneticParagraph = phoneticParagraphs[paragraphIndex] || '';

          // Divida o parágrafo em sentenças, preservando os pontos finais
          const paragraphSentences = paragraph.match(/[^.?!]+[.?!]/g) || [];
          const phoneticSentences = phoneticParagraph.match(/[^.?!]+[.?!]/g) || [];

          // Processe cada sentença do parágrafo
          paragraphSentences.forEach((sentenceText, sentenceIndex) => {
            const phoneticText = phoneticSentences[sentenceIndex] || '';

            // Divida a sentença em palavras, preservando os pontos finais
            const words = sentenceText.match(/\S+|\./g) || [];
            const phoneticWords = phoneticText.match(/\S+|\./g) || [];

            // Crie os pares de palavra/fonética
            const wordPairs = words.map((word, wordIndex) => {
              return {
                text: word,
                phonetic: phoneticWords[wordIndex] || ''
              };
            });

            // Adicione a sentença processada ao array
            this.sentences.push({
              text: sentenceText,
              phonetic: phoneticText,
              visible: false,
              words: wordPairs
            });
          });
        });
      } else {
        console.log('Level not found:', this.level);
      }
    }
  }

  selectLevel(level: string) {
    if (this.currentLevel === level) return; // Don't reload if it's the same level
    
    this.isLoading = true; // Set loading state to true
    this.level = level;
    this.currentLevel = level;
    
    // Add a delay to ensure the loading animation is visible
    setTimeout(() => {
      this.loadLevel();
      this.updateUrl();
      this.isLoading = false; // Set loading state to false after content is loaded
    }, 800); // Keep the same delay for consistent experience
  }

  updateUrl() {
    const navigationExtras: NavigationExtras = {
      queryParams: { level: this.level },
      replaceUrl: true
    };
    this.router.navigate([], navigationExtras);
  }

  togglePhonetics(index: number) {
    this.sentences[index].visible = !this.sentences[index].visible;
  }

  togglePopup(index: number): void {
    if (index < 0 || index >= this.sentences.length) {
      console.error(`Invalid index: ${index}`);
      return;
    }

    this.popupContent = this.sentences[index];
    this.popupVisible = true;
  }

  closePopup() {
    this.popupVisible = false;
    this.popupContent = null;
    this.ttsService.stopAudio('popup');
  }

  closePopupOnOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.popupVisible && !target.closest('.popup-content') && !target.closest('.toggle-phonetics-btn')) {
      this.popupVisible = false;
      this.popupContent = null;
      this.ttsService.stopAudio('popup');
    }
  }

  replaceHyphensWithSpaces(text: string): string {
    return text.replace(/-/g, ' ');
  }

  playAudio(text: string | undefined) {
    if (!text) {
      console.warn('No text provided for audio playback.');
      return;
    }

    if (this.currentPopupText === text) {
      this.ttsService.toggleAudio(text, 'popup');
    } else {
      this.ttsService.speak(text, 'popup');
    }
  }

  playArticleAudio() {
    this.ttsService.toggleAudio(this.text, 'article');
  }

  pauseArticleAudio() {
    this.ttsService.pauseAudio('article');
  }

  resumeArticleAudio() {
    this.ttsService.resumeAudio('article');
  }

  stopArticleAudio() {
    this.ttsService.stopAudio('article');
  }

  // Method to open auth modal
  openAuthModal(): void {
    this.showAuthModal = true;
  }

  // Method to close auth modal
  closeAuthModal(): void {
    this.showAuthModal = false;
  }
}