import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SubjectsModule } from './subjects/subjects.module';
import { DocumentsModule } from './documents/documents.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';

@Module({
  imports: [ ConfigModule.forRoot({isGlobal: true,}),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    UsersModule,
    AuthModule,
    SubjectsModule,
    DocumentsModule,
    EmbeddingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
