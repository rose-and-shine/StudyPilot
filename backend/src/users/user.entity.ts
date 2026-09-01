import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Subject } from 'src/subjects/subject.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    length: 100,
  })
  name: string;

  @Column({
    type: 'varchar',
    unique: true,
    length: 255,
  })
  email: string;

  @Column()
  password: string;

  @CreateDateColumn()
  createdAt: Date;
  @OneToMany(() => Subject, (subject) => subject.user)
  subjects: Subject[];
}
