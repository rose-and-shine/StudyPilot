import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne, Unique
} from 'typeorm';
import { User } from 'src/users/user.entity';
@Entity()
@Unique(['user', 'name'])
export class Subject {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @Column()
  name: string;
  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;
  @ManyToOne(() => User, (user) => user.subjects)
  user: User;
}
