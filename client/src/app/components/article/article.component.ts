import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, NavigationExtras } from '@angular/router';
import { Location } from '@angular/common'; // Add Location import
import { TtsService } from '../../services/tts.service';
import { AuthService } from '../../services/auth.service';
import { ArticleService } from '../../services/article.service';
import { Article, Level } from '../../interfaces/article.interface';

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
  selector: 'app-article',
  templateUrl: './article.component.html',
  styleUrls: ['./article.component.scss']
})
export class ArticleComponent implements OnInit {
  article: Article | null = null;

  userId: number = 0;

  level: string = "A1";
  currentLevel: string = "A1";
  selectedLevel: string = "A1"; // Add selectedLevel property
  currentLevelId: number | null = null; // Track current level ID for audio
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
    private authService: AuthService,
    private location: Location // Add Location service
  ) { }

  ngOnInit() {
    // Check authentication status
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      this.userId = user ? user.id : 0;
    });

    // Subscribe to both params and queryParams changes
    this.route.params.subscribe(params => {
      const id = +params['id'];
      if (id) {
        this.isLoading = true; // Set loading state when initially loading the article
        this.route.queryParams.subscribe(queryParams => {
          this.level = queryParams['level'] || this.level;
          this.currentLevel = this.level;
          this.getArticleById(id);
        });
      }
    });
    
    // Watch for changes to query params separately (for when only level changes)
    this.route.queryParams.subscribe(queryParams => {
      if (queryParams['level'] && queryParams['level'] !== this.currentLevel) {
        this.level = queryParams['level'];
        this.currentLevel = this.level;
        
        // Only reload if we already have an article
        if (this.article && this.article.id) {
          this.isLoading = true;
          this.loadLevel();
          
          // Add a delay before setting loading to false to show the animation
          setTimeout(() => {
            this.isLoading = false;
          }, 800);
        }
      }
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
        this.article = res;
        this.title = res.title;
        this.createdDate = res.created_date;
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
        
        // Store the level ID for audio playback
        this.currentLevelId = level.id;
        
        // Update the TTS service with the current level ID
        this.ttsService.setCurrentLevelId(level.id);

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
              words: wordPairs,
              index: this.sentences.length // Add index to each sentence
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
    this.selectedLevel = level; // Update selectedLevel too
    
    // Stop any playing audio when changing levels
    this.ttsService.stopAudio('article');
    
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

  // Simplified playArticleAudio method that just toggles play/pause
  playArticleAudio() {
    if (this.isArticlePlaying) {
      // If playing, pause it
      this.ttsService.pauseAudio('article');
    } else {
      // If not playing, either start new or resume
      if (this.isArticlePaused) {
        this.ttsService.resumeAudio('article');
      } else {
        // Start new playback
        if (this.currentLevelId && this.text) {
          this.ttsService.playLevelAudio(this.currentLevelId, this.text);
        } else {
          this.ttsService.speak(this.text, 'article');
        }
      }
    }
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

  // Method to reload the article when an exercise is validated correctly
  reloadArticle() {
    // No longer reloading the entire article
    // Just update the parts needed or do nothing
    console.log('Exercise validated successfully');
    
    // If specific UI updates are needed without reloading the whole article:
    // this.updateSpecificUI();
  }

  // Add handleExerciseValidated method
  handleExerciseValidated(): void {
    console.log('Exercise validated successfully');
    // We can use this to update UI elements or progress if needed
    // without reloading the whole article
  }

  // Add a method to handle level changes from exercises component
  changeLevel(newLevel: string): void {
    // Update the selected level
    this.selectedLevel = newLevel;
    this.level = newLevel;
    this.currentLevel = newLevel;
    
    // Update the URL to reflect the new level without reloading the page
    if (this.article && this.article.id) { // Use article.id instead of slug
      const urlTree = this.router.createUrlTree([], {
        relativeTo: this.route,
        queryParams: { level: newLevel },
        queryParamsHandling: 'merge',
      });
      
      this.location.go(urlTree.toString());
    }

    // Load the content for the new level
    this.loadLevel();
    
    // Scroll to exercises section
    setTimeout(() => {
      const exercisesElement = document.querySelector('.exercises-container');
      if (exercisesElement) {
        exercisesElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }
}