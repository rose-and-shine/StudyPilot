import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from 'src/users/user.entity';
import { Subject } from 'src/subjects/subject.entity';
import { DocumentVersion } from './document-version.entity';

@Entity()
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @ManyToOne(() => User, { nullable: false })
  createdBy: User;

  @ManyToOne(() => Subject, { nullable: false })
  subject: Subject;

  @OneToMany(() => DocumentVersion, (version) => version.document)
  versions: DocumentVersion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
