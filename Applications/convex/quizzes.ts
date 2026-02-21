import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createQuiz = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    companyId: v.id("companies"),
    policyIds: v.array(v.id("policies")),
    createdBy: v.id("users"),
    quizType: v.union(v.literal("general"), v.literal("selective")),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    schedule: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("once")),
      dayOfWeek: v.optional(v.number()),
      hour: v.optional(v.number()),
    })),
  },
  returns: v.id("quizzes"),
  async handler(ctx, args) {
    return await ctx.db.insert("quizzes", {
      title: args.title,
      description: args.description,
      companyId: args.companyId,
      policyIds: args.policyIds,
      createdBy: args.createdBy,
      quizType: args.quizType,
      targetGroupIds: args.targetGroupIds,
      schedule: args.schedule,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const addQuizQuestion = mutation({
  args: {
    quizId: v.id("quizzes"),
    type: v.union(v.literal("mcq"), v.literal("truefalse"), v.literal("scenario")),
    question: v.string(),
    options: v.array(v.string()),
    correctAnswer: v.number(),
    explanation: v.optional(v.string()),
    policyRef: v.optional(v.string()),
    order: v.number(),
  },
  returns: v.id("quizQuestions"),
  async handler(ctx, args) {
    return await ctx.db.insert("quizQuestions", {
      quizId: args.quizId,
      type: args.type,
      question: args.question,
      options: args.options,
      correctAnswer: args.correctAnswer,
      explanation: args.explanation,
      policyRef: args.policyRef,
      order: args.order,
      createdAt: Date.now(),
    });
  },
});

export const getQuiz = query({
  args: { quizId: v.id("quizzes") },
  returns: v.union(
    v.object({
      _id: v.id("quizzes"),
      title: v.string(),
      description: v.optional(v.string()),
      quizType: v.string(),
      isActive: v.boolean(),
      questions: v.array(v.object({
        _id: v.id("quizQuestions"),
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.number(),
        explanation: v.optional(v.string()),
        order: v.number(),
      })),
    }),
    v.null()
  ),
  async handler(ctx, args) {
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) return null;

    const questions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();

    return {
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      quizType: quiz.quizType,
      isActive: quiz.isActive,
      questions: questions.map(q => ({
        _id: q._id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        order: q.order,
      })),
    };
  },
});

// Get quizzes for an employee (general + their group's selective)
export const getEmployeeQuizzes = query({
  args: { 
    employeeId: v.id("users"),
    companyId: v.id("companies"),
  },
  returns: v.array(v.object({
    _id: v.id("quizzes"),
    title: v.string(),
    description: v.optional(v.string()),
    quizType: v.string(),
    questionCount: v.number(),
    completed: v.boolean(),
    bestScore: v.optional(v.number()),
    attempts: v.number(),
  })),
  async handler(ctx, args) {
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) return [];

    const allQuizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const activeQuizzes = allQuizzes.filter(quiz => {
      if (!quiz.isActive) return false;
      if (quiz.quizType === "general") return true;
      if (quiz.quizType === "selective" && quiz.targetGroupIds) {
        const employeeGroups = employee.groupIds || [];
        return quiz.targetGroupIds.some(gId => employeeGroups.includes(gId));
      }
      return false;
    });

    const result = [];
    for (const quiz of activeQuizzes) {
      const questions = await ctx.db
        .query("quizQuestions")
        .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
        .collect();

      const attempts = await ctx.db
        .query("quizAttempts")
        .withIndex("by_employee_quiz", (q) => 
          q.eq("employeeId", args.employeeId).eq("quizId", quiz._id)
        )
        .collect();

      const bestAttempt = attempts.reduce((best, curr) => 
        curr.score > (best?.score || 0) ? curr : best, null as any
      );

      result.push({
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        quizType: quiz.quizType,
        questionCount: questions.length,
        completed: attempts.length > 0,
        bestScore: bestAttempt?.score,
        attempts: attempts.length,
      });
    }

    return result;
  },
});

// Get company quizzes for manager
export const getCompanyQuizzes = query({
  args: { companyId: v.id("companies") },
  returns: v.array(v.object({
    _id: v.id("quizzes"),
    title: v.string(),
    description: v.optional(v.string()),
    quizType: v.string(),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    questionCount: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })),
  async handler(ctx, args) {
    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const result = [];
    for (const quiz of quizzes) {
      const questions = await ctx.db
        .query("quizQuestions")
        .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
        .collect();

      result.push({
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        quizType: quiz.quizType,
        targetGroupIds: quiz.targetGroupIds,
        questionCount: questions.length,
        isActive: quiz.isActive,
        createdAt: quiz.createdAt,
      });
    }

    return result;
  },
});

export const listActiveQuizzes = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("quizzes"),
    title: v.string(),
    description: v.optional(v.string()),
    quizType: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })),
  async handler(ctx) {
    const allQuizzes = await ctx.db.query("quizzes").collect();
    return allQuizzes
      .filter(q => q.isActive)
      .map(q => ({
        _id: q._id,
        title: q.title,
        description: q.description,
        quizType: q.quizType,
        isActive: q.isActive,
        createdAt: q.createdAt,
      }));
  },
});

export const submitQuizResponse = mutation({
  args: {
    employeeId: v.id("users"),
    quizId: v.id("quizzes"),
    questionId: v.id("quizQuestions"),
    selectedAnswer: v.number(),
    isCorrect: v.boolean(),
    timeSpent: v.number(),
  },
  returns: v.id("quizResponses"),
  async handler(ctx, args) {
    return await ctx.db.insert("quizResponses", {
      employeeId: args.employeeId,
      quizId: args.quizId,
      questionId: args.questionId,
      selectedAnswer: args.selectedAnswer,
      isCorrect: args.isCorrect,
      timeSpent: args.timeSpent,
      completedAt: Date.now(),
    });
  },
});

export const submitQuizAttempt = mutation({
  args: {
    employeeId: v.id("users"),
    quizId: v.id("quizzes"),
    score: v.number(),
    totalQuestions: v.number(),
    correctAnswers: v.number(),
    timeTaken: v.number(),
  },
  returns: v.id("quizAttempts"),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("quizAttempts")
      .withIndex("by_employee_quiz", (q) =>
        q.eq("employeeId", args.employeeId).eq("quizId", args.quizId)
      )
      .collect();

    return await ctx.db.insert("quizAttempts", {
      employeeId: args.employeeId,
      quizId: args.quizId,
      score: args.score,
      totalQuestions: args.totalQuestions,
      correctAnswers: args.correctAnswers,
      timeTaken: args.timeTaken,
      attemptNumber: existing.length + 1,
      completedAt: Date.now(),
    });
  },
});

export const deleteQuiz = mutation({
  args: { quizId: v.id("quizzes") },
  returns: v.null(),
  async handler(ctx, args) {
    await ctx.db.patch(args.quizId, { isActive: false, updatedAt: Date.now() });
    return null;
  },
});