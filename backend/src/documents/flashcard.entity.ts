import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { DocumentVersion } from './document-version.entity';

@Entity()
export class Flashcard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DocumentVersion, { nullable: false, onDelete: 'CASCADE' })
  documentVersion: DocumentVersion;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'text' })
  answer: string;

  @CreateDateColumn()
  createdAt: Date;
}
