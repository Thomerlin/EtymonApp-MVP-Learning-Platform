import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, Output, EventEmitter } from '@angular/core';
import { TtsService } from '../../services/tts.service';
import { AuthService } from '../../services/auth.service';
import { ProgressExercisesComponent } from '../progress-exercises/progress-exercises.component';
import { ExerciseService } from '../../services/exercise.service';
import { 
  Article, 
  Level, 
  MultipleChoiceExercise,
  FillInTheBlanksExercise,
  TrueFalseExercise,
  VocabularyMatchingExercise,
  WritingWithAudioExercise,
  Exercises 
} from '../../interfaces/article.interface';

// Define additional types for exercises with extra properties
interface VocabularyMatchingExerciseWithFlipped extends VocabularyMatchingExercise {
  flipped: boolean;
}

interface MultipleChoiceExerciseWithType extends MultipleChoiceExercise {
  type: 'multiple_choice';
  answeredCorrectly?: boolean;
}
interface FillInTheBlanksExerciseWithType extends FillInTheBlanksExercise {
  type: 'fill_in_the_blanks';
  answeredCorrectly?: boolean;
}
interface TrueFalseExerciseWithType extends TrueFalseExercise {
  type: 'true_false';
  answeredCorrectly?: boolean;
}
interface WritingWithAudioExerciseWithType extends WritingWithAudioExercise {
  type: 'writing_with_audio';
  answeredCorrectly?: boolean;
}

type ExerciseWithType =
  | MultipleChoiceExerciseWithType
  | FillInTheBlanksExerciseWithType
  | TrueFalseExerciseWithType
  | WritingWithAudioExerciseWithType;

@Component({
  selector: 'app-exercises',
  templateUrl: './exercises.component.html',
  styleUrls: ['./exercises.component.scss']
})
export class ExercisesComponent implements OnInit, OnChanges {
  @Input() article!: Article;
  @Input() currentLevel!: string;
  @Input() isAuthenticated = false;
  @Output() authModalRequested = new EventEmitter<void>();
  @Output() exerciseValidated = new EventEmitter<void>(); // Add new output event

  @ViewChild(ProgressExercisesComponent) progressComponent!: ProgressExercisesComponent;

  // Add userId property
  userId: number = 0;

  exerciseId: number | null = null;
  answer: string = "";
  answers: { [key: number]: string } = {};
  allExercises: any[] = [];
  incorrectExercises: any[] = [];
  currentExerciseIndex: number = 0;
  showErrorAnimation: boolean = false;
  showSuccessAnimation: boolean = false;
  correctExercises: Set<number> = new Set();
  completedExercises: Set<number> = new Set();
  isSlidingOut: boolean = false;
  vocabularyFlashcards: VocabularyMatchingExercise[] = [];
  isExercisePlaying: boolean = false;
  isExercisePaused: boolean = false;
  currentExerciseText: string = '';
  lastAttemptedExerciseData: { exerciseId: number, answer: string, type: string } | null = null;

  // Add loading state
  isLoading: boolean = false;

  constructor(
    private exerciseService: ExerciseService,
    private ttsService: TtsService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    // Subscribe to TTS service's playing/paused status for exercises
    this.ttsService.isExercisePlaying$.subscribe(isPlaying => {
      this.isExercisePlaying = isPlaying;
    });

    this.ttsService.isExercisePaused$.subscribe(isPaused => {
      this.isExercisePaused = isPaused;
    });

    this.ttsService.exerciseText$.subscribe(text => {
      this.currentExerciseText = text;
    });

    // Check authentication status
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      // Set userId when user is authenticated
      if (user) {
        this.userId = user.id;
      }

      // If user just logged in and there was a pending exercise validation
      if (this.isAuthenticated && this.lastAttemptedExerciseData) {
        const { exerciseId, answer, type } = this.lastAttemptedExerciseData;
        this.validate(exerciseId, answer, type);
        this.lastAttemptedExerciseData = null;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['article.id'] && !changes['article.id'].firstChange) ||
      (changes['currentLevel'] && !changes['currentLevel'].firstChange)) {
      this.isLoading = true; // Set loading state to true when level changes
      this.loadExercises();
    } else if (changes['article.id']?.firstChange || changes['currentLevel']?.firstChange) {
      this.isLoading = true; // Set loading state to true on first load
      this.loadExercises();
    }
  }

  loadExercises() {
    if (this.article.id) {
      const level = this.article.levels.find((l: Level) => l.level === this.currentLevel);
      if (level) {
        // Process vocabulary matching exercises
        this.vocabularyFlashcards = level.exercises?.vocabulary_matching.map((exercise: VocabularyMatchingExercise): VocabularyMatchingExerciseWithFlipped => ({
          ...exercise,
          flipped: false
        })) || [];

        this.exerciseId = level.exercises?.multiple_choice?.[0]?.id || null;

        // Format multiple choice options
        level.exercises?.multiple_choice?.forEach((exercicio: MultipleChoiceExercise) => {
          exercicio.options = exercicio.options.replace(/["[\]]/g, '');
        });

        // Combine and shuffle all exercises
        this.allExercises = this.shuffleArray([
          ...level.exercises.multiple_choice.map((ex: MultipleChoiceExercise) => ({ ...ex, type: 'multiple_choice' } as MultipleChoiceExerciseWithType)),
          ...level.exercises.fill_in_the_blanks.map((ex: FillInTheBlanksExercise) => ({ ...ex, type: 'fill_in_the_blanks' } as FillInTheBlanksExerciseWithType)),
          ...level.exercises.true_false.map((ex: TrueFalseExercise) => ({ ...ex, type: 'true_false' } as TrueFalseExerciseWithType)),
          ...level.exercises.writing_with_audio.map((ex: WritingWithAudioExercise) => ({ ...ex, type: 'writing_with_audio' } as WritingWithAudioExerciseWithType))
        ]).filter((ex: ExerciseWithType) => !ex.answeredCorrectly);

        this.currentExerciseIndex = 0;

        // Add a delay for the placeholder to be visible
        setTimeout(() => {
          this.isLoading = false; // Set loading to false after data is processed
        }, 800); // Match the delay in the article component
      }
    } else {
      this.isLoading = false; // Set loading to false if no article ID
    }
  }

  shuffleArray(array: any[]): any[] {
    return array.sort(() => Math.random() - 0.5);
  }

  validate(exerciseId: number, answer: string, type: string) {
    // Check if authenticated before proceeding
    if (!this.isAuthenticated) {
      // Save the exercise data for later validation after login
      this.lastAttemptedExerciseData = { exerciseId, answer, type };

      // Request auth modal to be shown
      this.authModalRequested.emit();
      return;
    }

    if (this.article.id) {
      const level = this.currentLevel;

      this.exerciseService.validateExercise(exerciseId, answer, type, this.article.id, level).subscribe(
        res => {
          console.log(res.message);
          if (res.message === "Correct answer! Progress saved.") {
            this.answers[exerciseId] = answer; // Save the correct answer

            // Show success animation
            this.showSuccessAnimation = true;

            if (this.progressComponent) {
              this.progressComponent.getData(this.article.id.toString(), level); // Update progress dynamically
            }

            // Emit event to notify that exercise was validated correctly
            this.exerciseValidated.emit();

            // Allow time for success animation to play
            setTimeout(() => {
              this.showSuccessAnimation = false;
              this.clearInputForExerciseType(type, exerciseId); // Clear input after success
              this.moveToNextExercise();
              this.refreshExercises();
            }, 1000);
          } else {
            this.clearInputForExerciseType(type, exerciseId); // Clear input after failure
            this.handleIncorrectAnswer(exerciseId); // Handle incorrect answer
          }
        },
        err => {
          console.log(err.error || "Error validating answer");
          this.clearInputForExerciseType(type, exerciseId); // Clear input on error
          this.handleIncorrectAnswer(exerciseId); // Ensure it moves to the next exercise even on API error
        }
      );
    } else {
      console.error("Article ID not provided. Cannot validate exercise.");
    }
  }

  // New method to clear input fields based on exercise type
  clearInputForExerciseType(type: string, exerciseId: number): void {
    switch (type) {
      case 'multiple_choice':
        // Reset the selected radio button
        this.answers[exerciseId] = "";
        // Clear any radio buttons that might be checked
        const radioButtons = document.querySelectorAll(`input[name="multiple_choice_${exerciseId}"]`) as NodeListOf<HTMLInputElement>;
        radioButtons.forEach(radio => radio.checked = false);
        break;

      case 'fill_in_the_blanks':
        // Clear the input field for this exercise
        this.answers[exerciseId] = "";
        break;

      case 'writing_with_audio':
        // Clear the textarea for this exercise
        this.answers[exerciseId] = "";
        break;

      case 'true_false':
        // No specific input to clear for true/false as it's immediate validation
        this.answers[exerciseId] = "";
        break;

      default:
        // Fallback to clear answer and answers for the current exerciseId
        this.answer = "";
        this.answers[exerciseId] = "";
    }
  }

  refreshExercises() {
    this.loadExercises();
  }

  handleIncorrectAnswer(exerciseId: number) {
    this.showErrorAnimation = true; // Trigger error animation
    setTimeout(() => {
      this.showErrorAnimation = false; // Reset animation after 500ms
      const incorrectExercise = this.allExercises[this.currentExerciseIndex];
      this.incorrectExercises.push(incorrectExercise); // Add the current exercise to the incorrectExercises array

      // Add the incorrect exercise back to the allExercises list
      this.allExercises.push(incorrectExercise);

      this.moveToNextExercise(); // Move to the next exercise
    }, 500);
  }

  moveToNextExercise() {
    if (this.currentExerciseIndex < this.allExercises.length - 1) {
      this.nextExercise();
    } else if (this.incorrectExercises.length > 0) {
      // Reintroduce incorrect exercises if all exercises are completed
      this.allExercises = this.shuffleArray([...this.incorrectExercises]);
      this.incorrectExercises = [];
      this.currentExerciseIndex = 0;
    } else {
      console.log("All exercises completed!");
    }
  }

  nextExercise() {
    this.isSlidingOut = true;
    setTimeout(() => {
      this.currentExerciseIndex = (this.currentExerciseIndex + 1) % this.allExercises.length;
      this.isSlidingOut = false;
    }, 500); // Match the animation duration
  }

  previousExercise() {
    this.isSlidingOut = true;
    setTimeout(() => {
      this.currentExerciseIndex =
        (this.currentExerciseIndex - 1 + this.allExercises.length) % this.allExercises.length;
      this.isSlidingOut = false;
    }, 500); // Match the animation duration
  }

  playWritingAudio(exerciseId: number) {
    if (this.article.id) {
      // Find the exercise by ID
      const exercise = this.allExercises.find(ex =>
        ex.type === 'writing_with_audio' && ex.id === exerciseId);

      if (exercise) {
        const text = exercise.sentence;

        if (this.currentExerciseText === text) {
          this.ttsService.toggleAudio(text, 'exercise');
        } else {
          this.ttsService.speak(text, 'exercise');
        }
      }
    }
  }

  pauseExerciseAudio() {
    this.ttsService.pauseAudio('exercise');
  }

  resumeExerciseAudio() {
    this.ttsService.resumeAudio('exercise');
  }

  stopExerciseAudio() {
    this.ttsService.stopAudio('exercise');
  }

  flipFlashcard(flashcard: VocabularyMatchingExercise): void {
    flashcard.flipped = !flashcard.flipped;
  }

  areAllExercisesCorrect(): boolean {
    return this.allExercises.every(ex => ex.answeredCorrectly);
  }

  hasPendingExercises(): boolean {
    return this.allExercises.some(ex => !ex.answeredCorrectly);
  }
}
