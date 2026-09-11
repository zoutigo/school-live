import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { SubmitAnswerDto } from "./dto/submit-answer.dto.js";
import { TrainingQuizService } from "./training-quiz.service.js";

@Controller("training-quiz")
@UseGuards(JwtAuthGuard)
export class TrainingQuizController {
  constructor(private readonly trainingQuizService: TrainingQuizService) {}

  @Get("chapters")
  listChapters(@CurrentUser() user: AuthenticatedUser) {
    return this.trainingQuizService.listChapters(user);
  }

  @Get("chapters/:chapterId")
  getChapter(
    @CurrentUser() user: AuthenticatedUser,
    @Param("chapterId") chapterId: string,
  ) {
    return this.trainingQuizService.getChapter(user, chapterId);
  }

  @Post("chapters/:chapterId/levels/:stage/intro-seen")
  markLevelIntroSeen(
    @CurrentUser() user: AuthenticatedUser,
    @Param("chapterId") chapterId: string,
    @Param("stage") stage: string,
  ) {
    return this.trainingQuizService.markLevelIntroSeen(user, chapterId, stage);
  }

  @Post("questions/:questionId/answer")
  submitAnswer(
    @CurrentUser() user: AuthenticatedUser,
    @Param("questionId") questionId: string,
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.trainingQuizService.submitAnswer(
      user,
      questionId,
      dto.optionIds,
    );
  }

  @Get("score")
  getScore(@CurrentUser() user: AuthenticatedUser) {
    return this.trainingQuizService.getScore(user);
  }
}
