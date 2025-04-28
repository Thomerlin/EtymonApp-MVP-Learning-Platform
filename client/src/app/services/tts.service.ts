import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

// Define the possible audio contexts
export type AudioContextType = 'article' | 'exercise' | 'popup' | '';

@Injectable({
  providedIn: 'root'
})
export class TtsService {
  private apiUrl = `${environment.apiUrl}/api/tts`;
  private serverUrl = environment.apiUrl;

  // Audio elements for each context
  private audioElements: Record<AudioContextType, HTMLAudioElement> = {
    article: new Audio(),
    exercise: new Audio(),
    popup: new Audio(),
    '': new Audio() // legacy default
  };

  // Track the current level ID for server-generated audio
  private currentLevelIdSubject = new BehaviorSubject<number | null>(null);

  // Playing state for each context
  private isArticlePlayingSubject = new BehaviorSubject<boolean>(false);
  private isArticlePausedSubject = new BehaviorSubject<boolean>(false);
  private articleTextSubject = new BehaviorSubject<string>('');

  private isExercisePlayingSubject = new BehaviorSubject<boolean>(false);
  private isExercisePausedSubject = new BehaviorSubject<boolean>(false);
  private exerciseTextSubject = new BehaviorSubject<string>('');

  private isPopupPlayingSubject = new BehaviorSubject<boolean>(false);
  private isPopupPausedSubject = new BehaviorSubject<boolean>(false);
  private popupTextSubject = new BehaviorSubject<string>('');

  // Legacy subjects for backward compatibility
  private isPlayingSubject = new BehaviorSubject<boolean>(false);
  private isPausedSubject = new BehaviorSubject<boolean>(false);
  private currentTextSubject = new BehaviorSubject<string>('');
  private currentLanguageSubject = new BehaviorSubject<string>('en-US');
  private currentVoiceSubject = new BehaviorSubject<string>('');

  // Observable streams
  isPlaying$ = this.isPlayingSubject.asObservable();
  isPaused$ = this.isPausedSubject.asObservable();
  currentText$ = this.currentTextSubject.asObservable();

  // Context-specific observables
  isArticlePlaying$ = this.isArticlePlayingSubject.asObservable();
  isArticlePaused$ = this.isArticlePausedSubject.asObservable();
  articleText$ = this.articleTextSubject.asObservable();

  isExercisePlaying$ = this.isExercisePlayingSubject.asObservable();
  isExercisePaused$ = this.isExercisePausedSubject.asObservable();
  exerciseText$ = this.exerciseTextSubject.asObservable();

  isPopupPlaying$ = this.isPopupPlayingSubject.asObservable();
  isPopupPaused$ = this.isPopupPausedSubject.asObservable();
  popupText$ = this.popupTextSubject.asObservable();

  constructor(private http: HttpClient) {
    // Set up event handlers for all audio elements
    Object.keys(this.audioElements).forEach(context => {
      const audioElement = this.audioElements[context as AudioContextType];

      audioElement.onended = () => {
        this.updatePlaybackState(context as AudioContextType, false, false);
      };

      audioElement.onpause = () => {
        this.updatePlaybackState(context as AudioContextType, false, true);
      };

      audioElement.onplay = () => {
        this.updatePlaybackState(context as AudioContextType, true, false);
      };
    });
  }

  /**
   * Play pre-generated audio from the server for the given level
   * @param levelId The ID of the level to play audio for
   * @param text The text content (for state tracking only)
   */
  playLevelAudio(levelId: number, text: string): void {
    // Stop any playing audio first
    this.stopAudio('article');
    
    // Set current text and level ID
    this.articleTextSubject.next(text);
    this.currentLevelIdSubject.next(levelId);
    
    // Get the audio element for articles
    const audioElement = this.audioElements['article'];
    
    // Create a timestamp to prevent caching issues
    const timestamp = new Date().getTime();
    
    // Set the source to the server-side audio endpoint with a cache-busting parameter
    audioElement.src = `${this.serverUrl}/api/article/audio/${levelId}?t=${timestamp}`;
    audioElement.crossOrigin = 'anonymous'; // Try with anonymous CORS mode
    
    // Log the attempt
    console.log(`Attempting to play audio from: ${audioElement.src}`);
    
    // Play the audio
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        // Update state on successful playback start
        this.updatePlaybackState('article', true, false);
        console.log('Level audio playback started successfully');
      }).catch(error => {
        console.error('Error playing level audio:', error);
        this.updatePlaybackState('article', false, false);
        
        // Fallback to TTS if server audio fails
        console.log('Falling back to TTS synthesis');
        this.speak(text, 'article');
      });
    }
  }

  /**
   * Updates the playback state for the specified context
   */
  private updatePlaybackState(context: AudioContextType, isPlaying: boolean, isPaused: boolean): void {
    switch (context) {
      case 'article':
        this.isArticlePlayingSubject.next(isPlaying);
        this.isArticlePausedSubject.next(isPaused);
        break;
      case 'exercise':
        this.isExercisePlayingSubject.next(isPlaying);
        this.isExercisePausedSubject.next(isPaused);
        break;
      case 'popup':
        this.isPopupPlayingSubject.next(isPlaying);
        this.isPopupPausedSubject.next(isPaused);
        break;
      default:
        // Update legacy state
        this.isPlayingSubject.next(isPlaying);
        this.isPausedSubject.next(isPaused);
    }

    // Also update legacy state if this is the article (for backward compatibility)
    if (context === 'article' || context === '') {
      this.isPlayingSubject.next(isPlaying);
      this.isPausedSubject.next(isPaused);
    }
  }

  /**
   * Updates the text subject for the specified context
   */
  private updateTextState(context: AudioContextType, text: string): void {
    switch (context) {
      case 'article':
        this.articleTextSubject.next(text);
        this.currentTextSubject.next(text); // legacy
        break;
      case 'exercise':
        this.exerciseTextSubject.next(text);
        break;
      case 'popup':
        this.popupTextSubject.next(text);
        break;
      default:
        this.currentTextSubject.next(text);
    }
  }

  /**
   * Convert text to speech and play the audio
   * @param text Text to convert to speech
   * @param context The audio context ('article', 'exercise', 'popup', or '' for default)
   * @param language Language code (default: en-US)
   * @param voice Optional voice name
   * @param callback Optional callback when audio loads
   */
  speak(text: string, context: AudioContextType = '', language: string = 'en-US', voice: string = 'en-US-Casual-K', callback?: () => void): void {
    if (!text) return;

    // Special handling for articles with server-generated audio
    if (context === 'article') {
      const currentLevelId = this.currentLevelIdSubject.getValue();
      if (currentLevelId) {
        // If we have a level ID, use the pre-generated audio
        this.playLevelAudio(currentLevelId, text);
        return;
      }
    }

    const audioElement = this.audioElements[context] || this.audioElements[''];

    // Get the correct text subject based on context
    let currentText = '';
    switch (context) {
      case 'article':
        currentText = this.articleTextSubject.value;
        break;
      case 'exercise':
        currentText = this.exerciseTextSubject.value;
        break;
      case 'popup':
        currentText = this.popupTextSubject.value;
        break;
      default:
        currentText = this.currentTextSubject.value;
    }

    // Get the correct paused state based on context
    let isPaused = false;
    switch (context) {
      case 'article':
        isPaused = this.isArticlePausedSubject.value;
        break;
      case 'exercise':
        isPaused = this.isExercisePausedSubject.value;
        break;
      case 'popup':
        isPaused = this.isPopupPausedSubject.value;
        break;
      default:
        isPaused = this.isPausedSubject.value;
    }

    // If the same text is already loaded and paused, just resume playback
    if (text === currentText && isPaused) {
      this.resumeAudio(context);
      return;
    }

    this.stopAudio(context); // Stop any currently playing audio in this context

    // Update current settings
    this.updateTextState(context, text);
    if (context === '' || context === 'article') {
      this.currentLanguageSubject.next(language);
      this.currentVoiceSubject.next(voice);
    }

    // Call TTS API with appropriate headers to get audio as a blob
    this.http.post(`${this.apiUrl}/synthesize`, { text, language, voice }, {
      responseType: 'blob'
    }).subscribe({
      next: (audioBlob: Blob) => {
        const audioUrl = URL.createObjectURL(audioBlob);
        audioElement.src = audioUrl;

        audioElement.oncanplaythrough = () => {
          audioElement.play();
          this.updatePlaybackState(context, true, false);
          if (callback) callback();
        };

        audioElement.onerror = (error) => {
          this.updatePlaybackState(context, false, false);
        };
      },
      error: (error) => {
        console.error(`Error fetching audio for context '${context}':`, error);
        this.updatePlaybackState(context, false, false);
      }
    });
  }

  /**
   * Set the current level ID for server-generated article audio
   * @param levelId The level ID
   */
  setCurrentLevelId(levelId: number | null): void {
    this.currentLevelIdSubject.next(levelId);
  }

  /**
   * Pause currently playing audio for the specified context
   */
  pauseAudio(context: AudioContextType = ''): void {
    const audioElement = this.audioElements[context] || this.audioElements[''];

    // Get the correct playing state based on context
    let isPlaying = false;
    let isPaused = false;

    switch (context) {
      case 'article':
        isPlaying = this.isArticlePlayingSubject.value;
        isPaused = this.isArticlePausedSubject.value;
        break;
      case 'exercise':
        isPlaying = this.isExercisePlayingSubject.value;
        isPaused = this.isExercisePausedSubject.value;
        break;
      case 'popup':
        isPlaying = this.isPopupPlayingSubject.value;
        isPaused = this.isPopupPausedSubject.value;
        break;
      default:
        isPlaying = this.isPlayingSubject.value;
        isPaused = this.isPausedSubject.value;
    }

    if (isPlaying && !isPaused) {
      audioElement.pause();
      this.updatePlaybackState(context, false, true);
    }
  }

  /**
   * Resume paused audio for the specified context
   */
  resumeAudio(context: AudioContextType = ''): void {
    const audioElement = this.audioElements[context] || this.audioElements[''];

    // Get the correct paused state based on context
    let isPaused = false;

    switch (context) {
      case 'article':
        isPaused = this.isArticlePausedSubject.value;
        break;
      case 'exercise':
        isPaused = this.isExercisePausedSubject.value;
        break;
      case 'popup':
        isPaused = this.isPopupPausedSubject.value;
        break;
      default:
        isPaused = this.isPausedSubject.value;
    }

    if (isPaused) {
      audioElement.play();
      this.updatePlaybackState(context, true, false);
    }
  }

  /**
   * Stop currently playing audio for the specified context
   */
  stopAudio(context: AudioContextType = ''): void {
    const audioElement = this.audioElements[context] || this.audioElements[''];
    
    // First pause the audio
    audioElement.pause();
    
    // Reset the position to the beginning
    audioElement.currentTime = 0;
    
    // Release the audio source if possible
    try {
      if (audioElement.src) {
        // Clean up the object URL to prevent memory leaks
        URL.revokeObjectURL(audioElement.src);
        audioElement.src = '';
        audioElement.load(); // Force reload to clear any cached audio
      }
    } catch (e) {
      console.warn(`Error cleaning up audio resources for context ${context}:`, e);
    }
    
    // Update the playback state
    this.updatePlaybackState(context, false, false);
  }

  /**
   * Stop all audio playback
   */
  stopAllAudio(): void {
    // Stop article audio
    this.stopAudio('article');
    
    // Stop popup audio
    this.stopAudio('popup');
    
    // If you have any other audio contexts, stop them too
    // this.stopAudio('otherContext');
    
    // Reset all status observables
    this.isArticlePlayingSubject.next(false);
    this.isArticlePausedSubject.next(false);
    this.isPopupPlayingSubject.next(false);
    this.isPopupPausedSubject.next(false);
  }

  /**
   * Toggle play/pause of current audio for the specified context
   * @param text Text to speak if not currently loaded
   * @param context The audio context
   * @param language Language code
   */
  toggleAudio(text: string, context: AudioContextType = '', language: string = 'en-US'): void {
    // Get the correct text subject based on context
    let currentText = '';
    let isPlaying = false;
    let isPaused = false;

    switch (context) {
      case 'article':
        currentText = this.articleTextSubject.value;
        isPlaying = this.isArticlePlayingSubject.value;
        isPaused = this.isArticlePausedSubject.value;
        break;
      case 'exercise':
        currentText = this.exerciseTextSubject.value;
        isPlaying = this.isExercisePlayingSubject.value;
        isPaused = this.isExercisePausedSubject.value;
        break;
      case 'popup':
        currentText = this.popupTextSubject.value;
        isPlaying = this.isPopupPlayingSubject.value;
        isPaused = this.isPopupPausedSubject.value;
        break;
      default:
        currentText = this.currentTextSubject.value;
        isPlaying = this.isPlayingSubject.value;
        isPaused = this.isPausedSubject.value;
    }

    if (text === currentText) {
      if (isPlaying) {
        this.pauseAudio(context);
      } else if (isPaused) {
        this.resumeAudio(context);
      } else {
        this.speak(text, context, language);
      }
    } else {
      this.speak(text, context, language);
    }
  }

  /**
   * Get available voices from the API
   */
  getAvailableVoices(): Observable<any> {
    return this.http.get(`${this.apiUrl}/voices`);
  }
}
