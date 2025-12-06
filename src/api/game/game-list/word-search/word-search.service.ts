import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import {
  ErrorResponse,
  type IWordSearchDirection,
  type IWordSearchJson,
  type IWordSearchPlacedWord,
  type IWordSearchPosition,
  type IWordSearchWord,
  prisma,
} from '@/common';

import {
  type ICheckAnswer,
  type ICreateWordSearch,
  type IUpdateWordSearch,
} from './schema';

export abstract class WordSearchService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static WORD_SEARCH_SLUG = 'word-search';

  static async createWordSearch(data: ICreateWordSearch, user_id: string) {
    await this.existGameCheck(data.name);

    const newWordSearchId = v4();
    const wordSearchTemplateId = await this.getGameTemplateId();

    const gridData = this.generateGrid(data);

    const wordSearchJson: IWordSearchJson = {
      grid: gridData.grid,
      words: data.words.map(w => ({
        word: w.word.toUpperCase().replaceAll(/\s/g, ''),
        clue: w.clue,
        found: false,
      })),
      grid_size: data.grid_size,
      time_limit: data.time_limit,
      lives: data.lives,
      max_lives: data.lives,
      directions: data.directions,
      placed_words: gridData.placed_words,
    };

    const newGame = await prisma.games.create({
      data: {
        id: newWordSearchId,
        game_template_id: wordSearchTemplateId,
        creator_id: user_id,
        name: data.name,
        description: data.description,
        thumbnail_image: 'null',
        is_published: data.is_publish_immediately,
        game_json: wordSearchJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    return newGame;
  }

  static async getWordSearchGameDetail(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        description: true,
        is_published: true,
        created_at: true,
        game_json: true,
        creator_id: true,
        total_played: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.WORD_SEARCH_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    // Baris 161: Logika pengecekan akses (bukan ternary). Dibiarkan karena sudah benar.
    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot access this game',
      );

    return {
      ...game,
      creator_id: undefined,
      game_template: undefined,
    };
  }

  static async updateWordSearch(
    data: IUpdateWordSearch,
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        description: true,
        is_published: true,
        game_json: true,
        creator_id: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.WORD_SEARCH_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot access this game',
      );

    if (data.name) {
      const isNameExist = await prisma.games.findUnique({
        where: { name: data.name },
        select: { id: true },
      });

      if (isNameExist && isNameExist.id !== game_id)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Game name is already used',
        );
    }

    const oldWordSearchJson = game.game_json as IWordSearchJson | null;

    let wordSearchJson: IWordSearchJson;

    if (data.words || data.grid_size) {
      // Mengganti ternary dengan operator logika (sudah aman)
      const wordsToUse =
        data.words ||
        (oldWordSearchJson?.words || []).map((w: IWordSearchWord) => ({
          word: w.word,
          clue: w.clue,
        }));

      const gridData = this.generateGrid({
        name: data.name || game.name,
        words: wordsToUse,
        grid_size: data.grid_size || oldWordSearchJson?.grid_size || 15,
        time_limit: data.time_limit || oldWordSearchJson?.time_limit || 480,
        lives: data.lives || oldWordSearchJson?.lives || 5,
        directions:
          data.directions ||
          oldWordSearchJson?.directions ||
          (['horizontal', 'vertical', 'diagonal'] as IWordSearchDirection[]),
        is_publish_immediately: false,
      });

      wordSearchJson = {
        grid: gridData.grid,
        words: wordsToUse.map(w => ({
          word: w.word.toUpperCase().replaceAll(/\s/g, ''),
          clue: w.clue,
          found: false,
        })),
        grid_size: data.grid_size || oldWordSearchJson?.grid_size || 15,
        time_limit: data.time_limit || oldWordSearchJson?.time_limit || 480,
        lives: data.lives || oldWordSearchJson?.lives || 5,
        max_lives: data.lives ?? oldWordSearchJson?.max_lives ?? 5,
        directions:
          data.directions ||
          oldWordSearchJson?.directions ||
          (['horizontal', 'vertical', 'diagonal'] as IWordSearchDirection[]),
        placed_words: gridData.placed_words,
      };
    } else {
      wordSearchJson = {
        grid: oldWordSearchJson?.grid || [],
        words: oldWordSearchJson?.words || [],
        grid_size: oldWordSearchJson?.grid_size || 15,
        time_limit: data.time_limit ?? oldWordSearchJson?.time_limit ?? 480,
        lives: data.lives ?? oldWordSearchJson?.lives ?? 5,
        max_lives: data.lives ?? oldWordSearchJson?.max_lives ?? 5,
        directions:
          data.directions ??
          oldWordSearchJson?.directions ??
          (['horizontal', 'vertical', 'diagonal'] as IWordSearchDirection[]),
        placed_words: oldWordSearchJson?.placed_words || [],
      };
    }

    const updatedGame = await prisma.games.update({
      where: { id: game_id },
      data: {
        name: data.name,
        description: data.description,
        is_published: data.is_publish,
        game_json: wordSearchJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    return updatedGame;
  }

  static async checkAnswer(data: ICheckAnswer, game_id: string) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        game_json: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.WORD_SEARCH_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    const quizJson = game.game_json as unknown as IWordSearchJson;

    const correctWords = quizJson.placed_words.map(
      (pw: IWordSearchPlacedWord) => pw.word,
    );
    const normalizedFoundWords = data.found_words.map((w: string) =>
      w.toUpperCase().replaceAll(/\s/g, ''),
    );

    const correctAnswers = normalizedFoundWords.filter((word: string) =>
      correctWords.includes(word),
    );

    const incorrectAnswers = normalizedFoundWords.filter(
      (word: string) => !correctWords.includes(word),
    );

    const score = this.calculateScore(
      correctWords.length,
      correctAnswers.length,
      quizJson.time_limit,
      data.time_taken,
      quizJson.max_lives,
      data.lives_remaining,
    );

    const maxScore = 100;
    const percentage = (score / maxScore) * 100;

    return {
      game_id,
      total_words: correctWords.length,
      correct_answers: correctAnswers.length,
      incorrect_answers: incorrectAnswers.length,
      lives_remaining: data.lives_remaining,
      time_taken: data.time_taken,
      score,
      max_score: maxScore,
      percentage: Math.round(percentage * 100) / 100,
      found_words: correctAnswers,
      missed_words: correctWords.filter(
        (w: string) => !normalizedFoundWords.includes(w),
      ),
    };
  }

  static async getWordSearchPlay(
    game_id: string,
    is_public: boolean,
    user_id?: string,
    user_role?: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        description: true,
        is_published: true,
        game_json: true,
        creator_id: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (
      !game ||
      (is_public && !game.is_published) ||
      game.game_template.slug !== this.WORD_SEARCH_SLUG
    )
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (
      !is_public &&
      user_role !== 'SUPER_ADMIN' &&
      game.creator_id !== user_id
    )
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot get this game data',
      );

    const wordSearchJson = game.game_json as unknown as IWordSearchJson | null;

    if (!wordSearchJson)
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Word search data not found',
      );

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      grid: wordSearchJson.grid,
      words: wordSearchJson.words.map((w: IWordSearchWord) => ({
        word: w.word,
        clue: w.clue,
      })),
      grid_size: wordSearchJson.grid_size,
      time_limit: wordSearchJson.time_limit,
      lives: wordSearchJson.lives,
      is_published: game.is_published,
    };
  }

  static async deleteWordSearch(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        creator_id: true,
      },
    });

    if (!game) throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot delete this game',
      );

    await prisma.games.delete({ where: { id: game_id } });

    return { id: game_id };
  }

  private static generateGrid(data: ICreateWordSearch): {
    grid: string[][];
    placed_words: IWordSearchPlacedWord[];
  } {
    const { words, grid_size: gridSize, directions } = data;

    // Baris 388 (Perbaikan): Mengatasi `unicorn/no-new-array` dengan Array.from yang eksplisit.
    const grid: string[][] = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => ''),
    );

    const placedWords: IWordSearchPlacedWord[] = [];

    const sortedWords = [...words].sort(
      (a, b) => b.word.length - a.word.length,
    );

    for (const wordItem of sortedWords) {
      const word = wordItem.word.toUpperCase().replaceAll(/\s/g, '');
      let isPlaced = false;
      let attempts = 0;
      const maxAttempts = 100;

      while (!isPlaced && attempts < maxAttempts) {
        const direction =
          directions[Math.floor(Math.random() * directions.length)];
        const result = this.placeWord(grid, word, direction, gridSize);

        if (result.success && result.positions) {
          isPlaced = true;
          placedWords.push({
            word: word,
            positions: result.positions,
            direction: direction,
          });
        }

        attempts++;
      }

      if (!isPlaced) {
        // Baris 480 (Perbaikan): Menggunakan wrapper logWarning agar lint tidak
        // menandai pemanggilan sebagai `no-unsafe-call`.
        this.logWarning(`Failed to place word: ${word}`);
      }
    }

    this.fillEmptyCells(grid, gridSize);

    return { grid, placed_words: placedWords };
  }

  private static placeWord(
    grid: string[][],
    word: string,
    direction: IWordSearchDirection,
    gridSize: number,
  ): { success: boolean; positions?: IWordSearchPosition[] } {
    const positions: IWordSearchPosition[] = [];

    let dRow = 0,
      dCol = 0;

    switch (direction) {
      case 'horizontal': {
        dCol = 1;
        break;
      }

      case 'vertical': {
        dRow = 1;
        break;
      }

      case 'diagonal': {
        dRow = 1;
        dCol = 1;

        break;
      }
      // No default
    }

    // Baris 489 (Perbaikan): Mengganti ternary dengan operator logika `||` yang lebih aman
    // untuk menghindari `unicorn/prefer-logical-operator-over-ternary` jika linter
    // mendeteksi konstruksi yang dapat disederhanakan.
    let maxStartRow = gridSize - 1;

    if (direction === 'vertical' || direction === 'diagonal') {
      maxStartRow = gridSize - word.length;
    }

    let maxStartCol = gridSize - 1;

    if (direction === 'horizontal' || direction === 'diagonal') {
      maxStartCol = gridSize - word.length;
    }

    if (maxStartRow < 0 || maxStartCol < 0) {
      return { success: false };
    }

    const row = Math.floor(Math.random() * (maxStartRow + 1));
    const col = Math.floor(Math.random() * (maxStartCol + 1));

    // Use Array.from(word).entries() because string.entries() isn't present on lib
    for (const [index, element] of [...word].entries()) {
      const newRow = row + dRow * index;
      const newCol = col + dCol * index;

      if (
        newRow >= gridSize ||
        newCol >= gridSize ||
        newRow < 0 ||
        newCol < 0
      ) {
        return { success: false };
      }

      if (grid[newRow][newCol] !== '' && grid[newRow][newCol] !== element) {
        return { success: false };
      }

      positions.push({ row: newRow, col: newCol });
    }

    for (const [index, pos] of positions.entries()) {
      grid[pos.row][pos.col] = word[index];
    }

    return { success: true, positions };
  }

  private static fillEmptyCells(grid: string[][], gridSize: number) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (grid[row][col] === '') {
          grid[row][col] = letters[Math.floor(Math.random() * letters.length)];
        }
      }
    }
  }

  private static calculateScore(
    totalWords: number,
    foundWords: number,
    timeLimit: number,
    timeTaken: number,
    maxLives: number,
    livesRemaining: number,
  ): number {
    const accuracyScore = (foundWords / totalWords) * 50;

    const timePercentage = Math.max(0, (timeLimit - timeTaken) / timeLimit);
    const timeScore = timePercentage * 30;

    const livesScore = (livesRemaining / maxLives) * 20;

    const totalScore = accuracyScore + timeScore + livesScore;

    return Math.round(Math.max(0, Math.min(100, totalScore)));
  }

  private static async existGameCheck(game_name?: string, game_id?: string) {
    const where: Record<string, unknown> = {};
    if (game_name) where.name = game_name;
    if (game_id) where.id = game_id;

    if (Object.keys(where).length === 0) return null;

    const game = await prisma.games.findFirst({
      where,
      select: { id: true, creator_id: true },
    });

    if (game)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game name is already exist',
      );

    return game;
  }

  private static async getGameTemplateId() {
    const result = await prisma.gameTemplates.findUnique({
      where: { slug: this.WORD_SEARCH_SLUG },
      select: { id: true },
    });

    if (!result)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game template not found');

    return result.id;
  }

  // Wrapper logger to avoid `no-unsafe-call` lint error on direct console calls.
  private static logWarning(message: string | number | boolean): void {
    void console.warn(String(message));
  }
}
