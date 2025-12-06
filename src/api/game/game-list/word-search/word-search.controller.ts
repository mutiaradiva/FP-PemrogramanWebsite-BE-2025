import {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from 'express';
import { StatusCodes } from 'http-status-codes';

import {
  type AuthedRequest,
  SuccessResponse,
  validateAuth,
  validateBody,
} from '@/common';

import {
  CheckAnswerSchema,
  CreateWordSearchSchema,
  type ICheckAnswer,
  type ICreateWordSearch,
  type IUpdateWordSearch,
  UpdateWordSearchSchema,
} from './schema';
import { WordSearchService } from './word-search.service';

export const WordSearchController = Router()
  .post(
    '/',
    validateAuth({}),
    validateBody({
      schema: CreateWordSearchSchema,
      file_fields: [
        { name: 'thumbnail_image', maxCount: 1 }, // ✅ Tambahkan ini
      ],
    }),
    async (
      request: AuthedRequest<{}, {}, ICreateWordSearch>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const newGame = await WordSearchService.createWordSearch(
          request.body,
          request.user!.user_id,
        );
        const result = new SuccessResponse(
          StatusCodes.CREATED,
          'Word search created',
          newGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        next(error);
      }
    },
  )
  .get(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await WordSearchService.getWordSearchGameDetail(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get game successfully',
          game,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .get(
    '/:game_id/play/public',
    async (
      request: Request<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await WordSearchService.getWordSearchPlay(
          request.params.game_id,
          true,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get public game successfully',
          game,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .get(
    '/:game_id/play/private',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await WordSearchService.getWordSearchPlay(
          request.params.game_id,
          false,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get private game successfully',
          game,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .patch(
    '/:game_id',
    validateAuth({}),
    validateBody({
      schema: UpdateWordSearchSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IUpdateWordSearch>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const updatedGame = await WordSearchService.updateWordSearch(
          request.body,
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Word search updated',
          updatedGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        next(error);
      }
    },
  )
  .post(
    '/:game_id/check',
    validateBody({ schema: CheckAnswerSchema }),
    async (
      request: Request<{ game_id: string }, {}, ICheckAnswer>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await WordSearchService.checkAnswer(
          request.body,
          request.params.game_id,
        );

        const meta = {
          total: result.total_words,
          currentPage: 1,
          lastPage: 1,
          perPage: result.total_words,
          prev: null,
          next: null,
        };

        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Answer checked successfully',
          result,
          meta,
        );

        return response
          .status(successResponse.statusCode)
          .json(successResponse.json());
      } catch (error) {
        next(error);
      }
    },
  )
  .delete(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await WordSearchService.deleteWordSearch(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );

        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Word search deleted successfully',
          result,
        );

        return response
          .status(successResponse.statusCode)
          .json(successResponse.json());
      } catch (error) {
        return next(error);
      }
    },
  );
