import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Generate daily quizzes and reading scripts at 00:00 UTC every day
crons.cron(
  "generate-daily-content",
  "0 0 * * *",
  internal.dailyQuizzes.generateAllDailyContent,
  {}
);

export default crons;