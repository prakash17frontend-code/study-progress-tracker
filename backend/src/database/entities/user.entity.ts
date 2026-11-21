
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

import { Goal } from './goal.entity';
import { StudySession } from './study-session.entity';

export enum UserRole {
  LEARNER = 'learner',
  MENTOR = 'mentor',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.LEARNER,
  })
  role: UserRole;

  @OneToMany(() => Goal, (goal) => goal.learner)
  goals: Goal[];

  @OneToMany(() => StudySession, (session) => session.learner)
  sessions: StudySession[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
