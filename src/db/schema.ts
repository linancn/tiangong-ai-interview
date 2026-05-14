import { relations, sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type {
  InterviewStatus,
  MessageRole,
  ReportState,
  RubricDimension,
} from "@/lib/interview/types";

export const interviews = pgTable("interviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  roleName: text("role_name").notNull(),
  jd: text("jd"),
  goals: jsonb("goals").$type<string[]>().notNull(),
  rubric: jsonb("rubric").$type<RubricDimension[]>().notNull(),
  maxTurns: integer("max_turns").notNull().default(10),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const interviewSessions = pgTable("interview_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  interviewId: uuid("interview_id")
    .notNull()
    .references(() => interviews.id, { onDelete: "cascade" }),
  candidateName: text("candidate_name"),
  candidateResume: text("candidate_resume"),
  token: text("token").notNull().unique(),
  status: text("status").$type<InterviewStatus>().notNull().default("active"),
  turnCount: integer("turn_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const interviewMessages = pgTable(
  "interview_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => interviewSessions.id, { onDelete: "cascade" }),
    externalId: text("external_id"),
    role: text("role").$type<MessageRole>().notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("interview_messages_session_external_idx").on(
      table.sessionId,
      table.externalId,
    ),
  ],
);

export const interviewReports = pgTable("interview_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .unique()
    .references(() => interviewSessions.id, { onDelete: "cascade" }),
  reportState: jsonb("report_state")
    .$type<ReportState>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  finalMarkdown: text("final_markdown"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const interviewsRelations = relations(interviews, ({ many }) => ({
  sessions: many(interviewSessions),
}));

export const interviewSessionsRelations = relations(
  interviewSessions,
  ({ one, many }) => ({
    interview: one(interviews, {
      fields: [interviewSessions.interviewId],
      references: [interviews.id],
    }),
    messages: many(interviewMessages),
    report: one(interviewReports),
  }),
);

export const interviewMessagesRelations = relations(
  interviewMessages,
  ({ one }) => ({
    session: one(interviewSessions, {
      fields: [interviewMessages.sessionId],
      references: [interviewSessions.id],
    }),
  }),
);

export const interviewReportsRelations = relations(
  interviewReports,
  ({ one }) => ({
    session: one(interviewSessions, {
      fields: [interviewReports.sessionId],
      references: [interviewSessions.id],
    }),
  }),
);
