
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Goal } from './goal.entity';
import { TopicPrerequisite } from './topic-prerequisite.entity';

@Entity('topics')
export class Topic {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Goal, (goal) => goal.topics, {
    onDelete: 'CASCADE',
  })
  goal: Goal;

  @Column({ default: 0 })
  orderIndex: number;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @OneToMany(
    () => TopicPrerequisite,
    (prerequisite) => prerequisite.topic,
  )
  prerequisites: TopicPrerequisite[];

  @OneToMany(
    () => TopicPrerequisite,
    (prerequisite) => prerequisite.prerequisiteTopic,
  )
  requiredBy: TopicPrerequisite[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
