import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  UseGuards,
  Param,
} from '@nestjs/common';

import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/users/user.entity';
import { GetUser } from 'src/auth/dto/get-user.decorator';
@Controller('subjects')
@UseGuards(AuthGuard('jwt'))
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}
  @Post()
  create(@Body() createSubjectDto: CreateSubjectDto, @GetUser() user: User) {
    return this.subjectsService.create(createSubjectDto, user);
  }
  @Get()
  findAll(@GetUser() user: User) {
    return this.subjectsService.findAll(user);
  }
  @Get(':id')
  getSubjectById(@Param('id') id: string, @GetUser() user: User) {
    return this.subjectsService.getSubjectById(id, user.id);
  }
  @Patch(':id')
  updateSubject(
    @Param('id') id: string,
    @Body() updateSubjectDto: UpdateSubjectDto,
    @GetUser() user: User,
  ) {
    return this.subjectsService.updateSubject(id, user.id, updateSubjectDto);
  }
  @Delete(':id')
  deleteSubject(@Param('id') id: string, @GetUser() user: User) {
    return this.subjectsService.deleteSubject(id, user.id);
  }
}
