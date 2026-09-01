import { Module } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subject } from './subject.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subject])],
  providers: [SubjectsService],
  controllers: [SubjectsController],
})
export class SubjectsModule {}
