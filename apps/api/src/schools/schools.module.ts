import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller.js';
import { SchoolResolverService } from './school-resolver.service.js';

@Module({
  controllers: [SchoolsController],
  providers: [SchoolResolverService],
  exports: [SchoolResolverService]
})
export class SchoolsModule {}
