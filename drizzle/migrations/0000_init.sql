CREATE TABLE `quiztris_answers` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`question_id` bigint NOT NULL,
	`text` text NOT NULL,
	`is_correct` boolean DEFAULT false,
	CONSTRAINT `quiztris_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `question_id_index` ON `quiztris_answers` (`question_id`);--> statement-breakpoint
CREATE TABLE `quiztris_game_participants` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`game_id` bigint NOT NULL,
	`user_id` bigint NOT NULL,
	`nickname` text,
	`joined_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `quiztris_game_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `game_id_index` ON `quiztris_game_participants` (`game_id`);--> statement-breakpoint
CREATE INDEX `user_id_index` ON `quiztris_game_participants` (`user_id`);--> statement-breakpoint
CREATE TABLE `quiztris_games` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`quiz_id` bigint NOT NULL,
	`host_id` bigint NOT NULL,
	`game_pin` text NOT NULL,
	`is_active` boolean DEFAULT true,
	`started_at` timestamp,
	`ended_at` timestamp,
	CONSTRAINT `quiztris_games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `quiz_id_index` ON `quiztris_games` (`quiz_id`);--> statement-breakpoint
CREATE INDEX `host_id_index` ON `quiztris_games` (`host_id`);--> statement-breakpoint
CREATE INDEX `game_pin_index` ON `quiztris_games` (`game_pin`);--> statement-breakpoint
CREATE TABLE `quiztris_questions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`question` text NOT NULL,
	`type` text NOT NULL,
	`time_limit` int DEFAULT 30,
	`points` int DEFAULT 1000,
	`quiz_id` bigint NOT NULL,
	`media` text,
	CONSTRAINT `quiztris_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `quiz_id_index` ON `quiztris_questions` (`quiz_id`);--> statement-breakpoint
CREATE TABLE `quiztris_quizzes` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`host_id` bigint NOT NULL,
	`created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`title` text NOT NULL,
	`questions` int DEFAULT 0,
	`plays` int DEFAULT 0,
	`last_edited` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `quiztris_quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `host_id_index` ON `quiztris_quizzes` (`host_id`);--> statement-breakpoint
CREATE TABLE `quiztris_scores` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`participant_id` bigint NOT NULL,
	`total_score` int DEFAULT 0,
	`updated_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `quiztris_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `participant_id_index` ON `quiztris_scores` (`participant_id`);--> statement-breakpoint
CREATE TABLE `quiztris_submissions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`participant_id` bigint NOT NULL,
	`question_id` bigint NOT NULL,
	`answer_id` bigint NOT NULL,
	`submitted_at` timestamp DEFAULT CURRENT_TIMESTAMP,
	`is_correct` boolean DEFAULT false,
	CONSTRAINT `quiztris_submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `participant_id_index` ON `quiztris_submissions` (`participant_id`);--> statement-breakpoint
CREATE INDEX `question_id_index` ON `quiztris_submissions` (`question_id`);--> statement-breakpoint
CREATE INDEX `answer_id_index` ON `quiztris_submissions` (`answer_id`);--> statement-breakpoint
CREATE TABLE `quiztris_users_table` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`number_of_wins` int DEFAULT 0,
	CONSTRAINT `quiztris_users_table_id` PRIMARY KEY(`id`)
);
