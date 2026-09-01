import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Subject } from './subject.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { User } from '../users/user.entity';
@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
  ) {}
  async create(createSubjectDto: CreateSubjectDto, user: User) {
    const subjectName = createSubjectDto.name.trim();

    const existingSubject = await this.subjectRepository
      .createQueryBuilder('subject')
      .where('subject.userId = :userId', {
        userId: user.id,
      })
      .andWhere('LOWER(subject.name) = LOWER(:name)', {
        name: subjectName,
      })
      .getOne();

    if (existingSubject) {
      throw new ConflictException('You already have a subject with this name');
    }

    const subject = this.subjectRepository.create({
      name: subjectName,
      user,
    });

    const savedSubject = await this.subjectRepository.save(subject);

    return {
      id: savedSubject.id,
      name: savedSubject.name,
      createdAt: savedSubject.createdAt,
      updatedAt: savedSubject.updatedAt,
    };
  }
  async findAll(user: User) {
    const subjects = await this.subjectRepository.find({
      where: {
        user: {
          id: user.id,
        },
      },
      order: {
        createdAt: 'DESC',
      },
    });

    return subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    }));
  }
  async getSubjectById(id: string, userId: string) {
    const subject = await this.subjectRepository.findOne({
      where: {
        id,
        user: {
          id: userId,
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }
  async updateSubject(
    id: string,
    userId: string,
    updateSubjectDto: UpdateSubjectDto,
  ) {
    const subject = await this.subjectRepository.findOne({
      where: {
        id,
        user: {
          id: userId,
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    if (updateSubjectDto.name && updateSubjectDto.name !== subject.name) {
      const existingSubject = await this.subjectRepository.findOne({
        where: {
          name: updateSubjectDto.name,
          user: {
            id: userId,
          },
        },
      });

      if (existingSubject) {
        throw new ConflictException(
          'You already have a subject with this name',
        );
      }
    }

    Object.assign(subject, updateSubjectDto);

    return this.subjectRepository.save(subject);
  }
  async deleteSubject(id: string, userId: string) {
    const subject = await this.subjectRepository.findOne({
      where: {
        id,
        user: {
          id: userId,
        },
      },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    await this.subjectRepository.remove(subject);

    return {
      message: 'Subject deleted successfully',
    };
  }
}
