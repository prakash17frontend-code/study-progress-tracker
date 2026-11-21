
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';

import { User } from './user.entity';
import { Topic } from './topic.entity';

@Entity('study_sessions')
export class StudySession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.sessions, {
    onDelete: 'CASCADE',
  })
  learner: User;

  @ManyToOne(() => Topic, {
    onDelete: 'CASCADE',

  })
  topic: Topic;

  @Column({ type: 'date' })
  sessionDate: string;

  @Column({ type: 'int' })
  minutes: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
