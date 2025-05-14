import {
  int,
  text,
  boolean,
  index,
  singlestoreTableCreator,
  bigint,
  timestamp
} from "drizzle-orm/singlestore-core";

export const createTable = singlestoreTableCreator(
  (name) => `quiztris_${name}`
);

export const users = createTable("users_table", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  number_of_wins: int("number_of_wins").default(0),
});

export const quizzes = createTable(
  "quizzes",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().autoincrement(),
    host_id: text("host_id").notNull(), // references users.id
    created_at: timestamp("created_at").defaultNow(),
    title: text("title").notNull(),
    questions: int("questions").default(0),
    plays: int("plays").default(0),
    last_edited: timestamp("last_edited").defaultNow(),
  },
  (t) => [index("host_id_index").on(t.host_id)]
);

export const questions = createTable(
  "questions",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().autoincrement(),
    question: text("question").notNull(),
    type: text("type").notNull(),
    time_limit: int("time_limit").default(30),
    points: int("points").default(1000),
    quiz_id: bigint("quiz_id", { mode: "bigint" }).notNull(), // references quizzes.id
    media: text("media"),
  },
  (t) => [index("quiz_id_index").on(t.quiz_id)]
);

export const answers = createTable(
  "answers",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().autoincrement(),
    question_id: bigint("question_id", { mode: "bigint" }).notNull(), // references questions.id
    text: text("text").notNull(),
    is_correct: boolean("is_correct").default(false),
  },
  (t) => [index("question_id_index").on(t.question_id)]
);

export const games = createTable(
  "games",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().autoincrement(),
    quiz_id: bigint("quiz_id", { mode: "bigint" }).notNull(), // references quizzes.id
    host_id: text("host_id").notNull(), // references users.id
    game_pin: text("game_pin").notNull(),
    is_active: boolean("is_active").default(true),
    started_at: timestamp("started_at"),
    ended_at: timestamp("ended_at"),
  },
  (t) => [
    index("quiz_id_index").on(t.quiz_id),
    index("host_id_index").on(t.host_id),
    index("game_pin_index").on(t.game_pin)
  ]
);

export const game_participants = createTable(
  "game_participants",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().autoincrement(),
    game_id: bigint("game_id", { mode: "bigint" }).notNull(), // references games.id
    user_id: text("user_id").notNull(), // references users.id
    nickname: text("nickname"),
    joined_at: timestamp("joined_at").defaultNow(),
  },
  (t) => [
    index("game_id_index").on(t.game_id),
    index("user_id_index").on(t.user_id)
  ]
);

export const submissions = createTable(
  "submissions",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().autoincrement(),
    participant_id: text("participant_id").notNull(), // references game_participants.id
    question_id: bigint("question_id", { mode: "bigint" }).notNull(), // references questions.id
    answer_id: bigint("answer_id", { mode: "bigint" }).notNull(), // references answers.id
    submitted_at: timestamp("submitted_at").defaultNow(),
    is_correct: boolean("is_correct").default(false),
  },
  (t) => [
    index("participant_id_index").on(t.participant_id),
    index("question_id_index").on(t.question_id),
    index("answer_id_index").on(t.answer_id)
  ]
);

export const scores = createTable(
  "scores",
  {
    id: bigint("id", { mode: "bigint" }).primaryKey().autoincrement(),
    participant_id: text("participant_id").notNull(), // references game_participants.id
    total_score: int("total_score").default(0),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("participant_id_index").on(t.participant_id)]
);

export type DB_User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type DB_Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;

export type DB_Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;

export type DB_Answer = typeof answers.$inferSelect;
export type NewAnswer = typeof answers.$inferInsert;

export type DB_Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

export type DB_GameParticipant = typeof game_participants.$inferSelect;
export type NewGameParticipant = typeof game_participants.$inferInsert;

export type DB_Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;

export type DB_Score = typeof scores.$inferSelect;
export type NewScore = typeof scores.$inferInsert;

