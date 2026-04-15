export type QuestionType = 'single' | 'multi' | 'text' | 'dropdown';
export type QuestionValue = string | string[];
export type ModuleId = 'basics' | 'lifestyle' | 'values' | 'communication' | 'expression';

export interface QuestionModule {
  id: ModuleId;
  title: string;
  subtitle: string;
  emoji: string;
}

export interface QuestionOption {
  label: string;
  value: string;
}

export interface Question {
  id: string;
  moduleId: ModuleId;
  title: string;
  type: QuestionType;
  options?: QuestionOption[];
  maxSelect?: number;
  maxLength?: number;
  placeholder?: string;
  helper?: string;
  required: boolean;
}

export interface Answer {
  questionId: string;
  value: QuestionValue;
}
