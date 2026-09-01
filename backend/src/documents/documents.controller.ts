import { Body, Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import {
  MaxFileSizeValidator,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { SearchDocumentDto } from './dto/search-document.dto';
import { AskDocumentDto } from './dto/ask-document.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

import { GetUser } from 'src/auth/dto/get-user.decorator';
import { User } from 'src/users/user.entity';
import { StorageService } from './storage.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  create(@Body() createDocumentDto: CreateDocumentDto, @GetUser() user: User) {
    return this.documentsService.create(createDocumentDto, user);
  }
  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 10 * 1024 * 1024,
          }),
          new FileTypeValidator({
            fileType: 'application/pdf',
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    return this.documentsService.uploadDocument(id, file, user);
  }
  @Get()
  findAll(@GetUser() user: User) {
    return this.documentsService.findAll(user);
  }
  @Get(':id/download')
  getDownloadUrl(@Param('id') id: string, @GetUser() user: User) {
    return this.documentsService.getDownloadUrl(id, user);
  }
  @Post(':id/search')
  searchDocument(
    @Param('id') id: string,
    @Body() searchDocumentDto: SearchDocumentDto,
    @GetUser() user: User,
  ) {
    return this.documentsService.searchDocument(
      id,
      searchDocumentDto.query,
      user,
    );
  }
  @Post(':id/ask')
  askDocument(
    @Param('id') id: string,
    @Body() askDocumentDto: AskDocumentDto,
    @GetUser() user: User,
  ) {
    return this.documentsService.askDocument(id, askDocumentDto.question, user);
  }
  @Post(':id/summarize')
  summarizeDocument(@Param('id') id: string, @GetUser() user: User) {
    return this.documentsService.summarizeDocument(id, user);
  }
  @Post(':id/flashcards/generate')
  generateFlashcards(@Param('id') id: string, @GetUser() user: User) {
    return this.documentsService.generateFlashcards(id, user);
  }
  @Get(':id/flashcards')
  getFlashcards(@Param('id') id: string, @GetUser() user: User) {
    return this.documentsService.getFlashcards(id, user);
  }
  @Post(':id/quiz/generate')
  generateQuiz(@Param('id') id: string, @GetUser() user: User) {
    return this.documentsService.generateQuiz(id, user);
  }
  @Post(':id/quiz/submit')
  submitQuiz(
    @Param('id') id: string,
    @Body() submitQuizDto: SubmitQuizDto,
    @GetUser() user: User,
  ) {
    return this.documentsService.submitQuiz(id, submitQuizDto, user);
  }
  @Get(':id/quiz')
  getQuiz(@Param('id') id: string, @GetUser() user: User) {
    return this.documentsService.getQuiz(id, user);
  }
  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.documentsService.findOne(id, user);
  }
}
