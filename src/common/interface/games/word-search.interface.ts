export interface IWordSearchJson {
  grid: string[][];
  words: IWordSearchWord[];
  grid_size: number;
  time_limit: number;
  lives: number;
  max_lives: number;
  directions: IWordSearchDirection[];
  placed_words: IWordSearchPlacedWord[];
}

export interface IWordSearchWord {
  word: string;
  found: boolean;
}

export interface IWordSearchPlacedWord {
  word: string;
  positions: IWordSearchPosition[];
  direction: IWordSearchDirection;
}

export interface IWordSearchPosition {
  row: number;
  col: number;
}

export type IWordSearchDirection = 'horizontal' | 'vertical' | 'diagonal';
