export interface MultipleChoiceExercise {
  id: number;
  question: string;
  options: string;
  answeredCorrectly: boolean;

}

export interface FillInTheBlanksExercise {
  id: number;
  sentence: string;
  hint: string;
  answeredCorrectly: boolean;

}

export interface TrueFalseExercise {
  id: number;
  statement: string;
  answeredCorrectly: boolean;

}

export interface VocabularyMatchingExercise {
  id: number;
  word: string;
  definition: string;
  example: string;
  flipped?: boolean;
}

export interface WritingWithAudioExercise {
  id: number;
  sentence: string;
  answeredCorrectly: boolean;

}

export interface Exercises {
  multiple_choice: MultipleChoiceExercise[];
  fill_in_the_blanks: FillInTheBlanksExercise[];
  true_false: TrueFalseExercise[];
  vocabulary_matching: VocabularyMatchingExercise[];
  writing_with_audio: WritingWithAudioExercise[];
}

export interface Level {
  id: number;
  level: string;
  content: string;
  phonetics: string;
  exercises: Exercises;
  hasAudio: boolean;
}

export interface Article {
  id: number;
  title: string;
  articleLink: string;
  created_date: string;
  summary: string;
  levels: Level[];
}
