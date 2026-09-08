import { Module } from "@nestjs/common";
import { TrainingQuizController } from "./training-quiz.controller.js";
import { TrainingQuizService } from "./training-quiz.service.js";

@Module({
  controllers: [TrainingQuizController],
  providers: [TrainingQuizService],
})
export class TrainingQuizModule {}
