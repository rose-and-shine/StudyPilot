import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { DocumentVersion } from './document-version.entity';

@Entity()
@Unique(['documentVersion', 'chunkIndex'])
export class DocumentChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DocumentVersion, { nullable: false, onDelete: 'CASCADE' })
  documentVersion: DocumentVersion;

  @Column({ type: 'int' })
  chunkIndex: number;

  @Column({ type: 'text' })
  text: string;

  @Column('vector', {
    length: 768,
    nullable: true,
  })
  embedding: number[] | null;

  @CreateDateColumn()
  createdAt: Date;
}
