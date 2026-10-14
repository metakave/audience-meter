export type QuestionType =
  | 'mcq'             // Single choice poll
  | 'multiple_choice' // Multi-select poll
  | 'short_answer'    // Word cloud / short text chips
  | 'long_answer'     // Open feedback / thoughts
  | 'true_false'      // True / False pulse
  | 'rating_scale';   // 1 to 5 scale

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean; // Optional for quiz mode
}

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  options?: QuestionOption[];       // For mcq and multiple_choice
  allowMultiple?: boolean;          // For multiple choice
  minRating?: number;               // For rating scale (default 1)
  maxRating?: number;               // For rating scale (default 5)
  showResultsToAudience?: boolean;  // Host toggle
  isLocked?: boolean;               // Host can freeze submissions
  timerSeconds?: number;            // Optional countdown timer
  maxSelections?: number;           // For multi-select limits (e.g. choose up to 3)
  guidance?: string;                // Host facilitation and response guidance
}

export interface Presentation {
  id: string;
  title: string;
  code: string;                     // 6-digit room code e.g. "829143"
  currentQuestionIndex: number;
  isLive: boolean;
  isLocked: boolean;
  showResults: boolean;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  presentationId: string;
  roomCode: string;
  firstName: string;
  lastName: string;
  whatsapp: string;
  email: string;
  joinedAt: string;
}

export interface ResponseSubmission {
  id: string;
  presentationId: string;
  questionId: string;
  participantId: string;
  participantName: string;
  participantWhatsapp: string;
  participantEmail: string;
  // Answer value:
  // - for mcq: option id
  // - for multiple_choice: array of option ids (JSON stringified)
  // - for short_answer / long_answer: text string
  // - for true_false: "true" | "false"
  // - for rating_scale: number string "1"-"5"
  value: string;
  createdAt: string;
}

export interface AggregatedResults {
  questionId: string;
  totalResponses: number;
  // For MCQ / multiple_choice: count per optionId
  optionCounts?: Record<string, number>;
  // For short_answer: word / phrase counts for word cloud
  wordCloud?: { text: string; count: number }[];
  // For long_answer: list of submissions
  textResponses?: { id: string; name: string; text: string; createdAt: string }[];
  // For true_false:
  trueFalseCounts?: { trueCount: number; falseCount: number };
  // For rating_scale:
  ratingAverage?: number;
  ratingCounts?: Record<number, number>;
}
