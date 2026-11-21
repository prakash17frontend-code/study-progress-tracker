
import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

export class InitialSchema1763574000000
  implements MigrationInterface
{
  name = 'InitialSchema1763574000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    await queryRunner.query(`
      CREATE TYPE "users_role_enum"
      AS ENUM ('learner', 'mentor');
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "email" varchar(150) NOT NULL,
        "password" character varying NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'learner',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "goals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" varchar(150) NOT NULL,
        "description" text,
        "learnerId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_goals" PRIMARY KEY ("id"),
        CONSTRAINT "FK_goals_learner"
          FOREIGN KEY ("learnerId")
          REFERENCES "users"("id")
          ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "topics" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" varchar(150) NOT NULL,
        "description" text,
        "goalId" uuid NOT NULL,
        "orderIndex" integer NOT NULL DEFAULT 0,
        "isCompleted" boolean NOT NULL DEFAULT false,
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_topics" PRIMARY KEY ("id"),
        CONSTRAINT "FK_topics_goal"
          FOREIGN KEY ("goalId")
          REFERENCES "goals"("id")
          ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "topic_prerequisites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "topicId" uuid NOT NULL,
        "prerequisiteTopicId" uuid NOT NULL,
        CONSTRAINT "PK_topic_prerequisites" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_topic_prerequisites_pair"
          UNIQUE ("topicId", "prerequisiteTopicId"),
        CONSTRAINT "FK_prerequisite_topic"
          FOREIGN KEY ("topicId")
          REFERENCES "topics"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_required_topic"
          FOREIGN KEY ("prerequisiteTopicId")
          REFERENCES "topics"("id")
          ON DELETE CASCADE,
        CONSTRAINT "CHK_no_self_prerequisite"
          CHECK ("topicId" <> "prerequisiteTopicId")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "study_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "learnerId" uuid NOT NULL,
        "topicId" uuid NOT NULL,
        "sessionDate" date NOT NULL,
        "minutes" integer NOT NULL,
        "note" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_study_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sessions_learner"
          FOREIGN KEY ("learnerId")
          REFERENCES "users"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_sessions_topic"
          FOREIGN KEY ("topicId")
          REFERENCES "topics"("id")
          ON DELETE CASCADE,
        CONSTRAINT "CHK_session_minutes_positive"
          CHECK ("minutes" > 0)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "app_settings" (
        "key" varchar(100) NOT NULL,
        "value" jsonb NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_app_settings" PRIMARY KEY ("key")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_goals_learnerId"
      ON "goals" ("learnerId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_topics_goalId"
      ON "topics" ("goalId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_prerequisites_topicId"
      ON "topic_prerequisites" ("topicId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_prerequisites_requiredTopicId"
      ON "topic_prerequisites" ("prerequisiteTopicId");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_learner_date"
      ON "study_sessions" ("learnerId", "sessionDate");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_topicId"
      ON "study_sessions" ("topicId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "app_settings"`);
    await queryRunner.query(`DROP TABLE "study_sessions"`);
    await queryRunner.query(`DROP TABLE "topic_prerequisites"`);
    await queryRunner.query(`DROP TABLE "topics"`);
    await queryRunner.query(`DROP TABLE "goals"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}
