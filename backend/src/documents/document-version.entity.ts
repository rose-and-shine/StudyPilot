import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Document } from './document.entity';

@Entity()
@Unique(['document', 'version'])
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Document, { nullable: false, onDelete: 'CASCADE' })
  document: Document;

  @Column({ type: 'int' })
  version: number;

  @Column()
  fileName: string;

  @Column()
  mimeType: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @Column()
  storagePath: string;

  @Column({ type: 'text', nullable: true })
  extractedText: string | null;

  @CreateDateColumn()
  createdAt: Date;
}