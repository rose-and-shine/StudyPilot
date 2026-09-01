import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { DocumentVersion } from './document-version.entity';

@Entity()
export class Quiz {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DocumentVersion, { nullable: false, onDelete: 'CASCADE' })
  documentVersion: DocumentVersion;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'jsonb' })
  options: string[];

  @Column({ type: 'text' })
  correctAnswer: string;

  @Column({ type: 'text' })
  explanation: string;

  @CreateDateColumn()
  createdAt: Date;
}
