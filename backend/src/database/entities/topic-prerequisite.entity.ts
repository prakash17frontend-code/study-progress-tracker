
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Unique,
} from 'typeorm';

import { Topic } from './topic.entity';

@Entity('topic_prerequisites')
@Unique(['topic', 'prerequisiteTopic'])
export class TopicPrerequisite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => Topic,
    (topic) => topic.prerequisites,
    { onDelete: 'CASCADE' },
  )
  topic: Topic;

  @ManyToOne(
    () => Topic,
    (topic) => topic.requiredBy,
    { onDelete: 'CASCADE' },
  )
  prerequisiteTopic: Topic;
}
