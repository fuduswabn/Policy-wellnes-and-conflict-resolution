import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Constants ──────────────────────────────────────────────────────
const QUESTIONS_PER_QUIZ = 5;

// 5 question categories — each quiz generates one question per category
const QUESTION_CATEGORIES = [
  "understanding",   // What is allowed / not allowed
  "application",     // What would you do in this scenario?
  "reporting",       // Reporting & escalation procedures
  "responsibility",  // Who is responsible for what?
  "consequences",    // What happens if you don't comply?
] as const;

// Daily focus rotation — determines emphasis for the day
const DAILY_FOCUS = [
  "understanding",    // Monday / Day 0
  "application",      // Tuesday / Day 1
  "reporting",        // Wednesday / Day 2
  "responsibility",   // Thursday / Day 3
  "consequences",     // Friday / Day 4
  "application",      // Saturday / Day 5
  "understanding",    // Sunday / Day 6
] as const;

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function getDayOfWeek(): number {
  return new Date().getDay(); // 0=Sunday, 1=Monday, etc.
}

// ─── Fallback template questions (category-aware) ────────────────────
function generateFallbackQuestions(
  policies: Array<{ title: string; content: string; policyType: string }>,
  count: number
): Array<{
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  sourcePolicyTitle: string;
  category: string;
}> {
  const questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    sourcePolicyTitle: string;
    category: string;
  }> = [];

  const policy = policies[0] || { title: "Company Policy", content: "" };

  const templates = [
    {
      category: "understanding",
      question: `According to the "${policy.title}" policy, what is the primary requirement?`,
      options: [
        "Follow all outlined procedures exactly",
        "Only apply during work hours",
        "Ignore if not directly relevant to your role",
        "Apply only when supervised",
      ],
      correctAnswer: 0,
      explanation: `The ${policy.title} policy requires all outlined procedures to be followed.`,
    },
    {
      category: "application",
      question: `You encounter a situation covered by the "${policy.title}" policy. What should you do first?`,
      options: [
        "Handle it yourself based on experience",
        "Follow the procedure outlined in the policy",
        "Wait for someone else to act",
        "Skip if it seems minor",
      ],
      correctAnswer: 1,
      explanation: "Always follow the documented procedure first.",
    },
    {
      category: "reporting",
      question: `When must incidents related to "${policy.title}" be reported?`,
      options: [
        "At the end of the week",
        "Only if someone is injured",
        "Immediately to the line manager",
        "Only during safety meetings",
      ],
      correctAnswer: 2,
      explanation: "Incidents must be reported immediately to the line manager.",
    },
    {
      category: "responsibility",
      question: `Who is responsible for ensuring compliance with the "${policy.title}" policy?`,
      options: [
        "Only senior management",
        "Only the safety officer",
        "All employees within the organization",
        "Only contractors",
      ],
      correctAnswer: 2,
      explanation: "All employees are responsible for compliance.",
    },
    {
      category: "consequences",
      question: `What could happen if the "${policy.title}" policy is not followed?`,
      options: [
        "Nothing, it's just a guideline",
        "A verbal warning only",
        "Serious injury, legal consequences, or disciplinary action",
        "A small fine",
      ],
      correctAnswer: 2,
      explanation: "Non-compliance can lead to serious injury, legal consequences, or disciplinary action.",
    },
  ];

  for (let i = 0; i < Math.min(count, templates.length); i++) {
    questions.push({
      ...templates[i],
      sourcePolicyTitle: policy.title,
    });
  }

  return questions.slice(0, count);
}

// ─── Internal query: get data needed for daily generation ─────────────
export const getCompanyGenerationData = internalQuery({
  args: { companyId: v.id("companies") },
  returns: v.any(),
  async handler(ctx, args) {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      return null;
    }

    const policies = await ctx.db
      .query("policies")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const activePolicies = policies.filter((p: any) => p.isActive);
    if (activePolicies.length === 0) return null;

    const groups = await ctx.db
      .query("employeeGroups")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const dateFor = getTodayString();

    const existingQuizzes = await ctx.db
      .query("dailyQuizzes")
      .withIndex("by_date", (q: any) =>
        q.eq("companyId", args.companyId).eq("dateFor", dateFor)
      )
      .collect();

    if (existingQuizzes.length > 0) return null; // Already generated

    // Get policy cycle tracker to determine which policy to use next
    const cycleTrackers = await ctx.db
      .query("policyCycleTracker")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    return {
      companyId: args.companyId,
      activePolicies: activePolicies.map((p: any) => ({
        _id: p._id,
        title: p.title,
        content: p.content,
        policyType: p.policyType,
        targetGroupIds: p.targetGroupIds,
      })),
      groups: groups.map((g: any) => ({
        _id: g._id,
        name: g.name,
      })),
      cycleTrackers: cycleTrackers.map((ct: any) => ({
        _id: ct._id,
        policyId: ct.policyId,
        lastUsedDate: ct.lastUsedDate,
        cycleNumber: ct.cycleNumber,
      })),
      dateFor,
    };
  },
});

// ─── Internal mutation: save a reading script ────────────────────────
export const saveReadingScript = internalMutation({
  args: {
    title: v.string(),
    content: v.string(),
    companyId: v.id("companies"),
    scriptType: v.union(v.literal("general"), v.literal("group")),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    sourcePolicyIds: v.array(v.id("policies")),
    dateFor: v.string(),
  },
  returns: v.id("readingScripts"),
  async handler(ctx, args) {
    return await ctx.db.insert("readingScripts", {
      title: args.title,
      content: args.content,
      companyId: args.companyId,
      scriptType: args.scriptType,
      targetGroupIds: args.targetGroupIds,
      sourcePolicyIds: args.sourcePolicyIds,
      dateFor: args.dateFor,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// ─── Internal mutation: save a daily quiz shell ─────────────────────
export const saveDailyQuizShell = internalMutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    companyId: v.id("companies"),
    quizType: v.union(v.literal("general"), v.literal("group")),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    sourcePolicyIds: v.array(v.id("policies")),
    scriptId: v.optional(v.id("readingScripts")),
    dateFor: v.string(),
  },
  returns: v.id("dailyQuizzes"),
  async handler(ctx, args) {
    return await ctx.db.insert("dailyQuizzes", {
      title: args.title,
      description: args.description,
      companyId: args.companyId,
      quizType: args.quizType,
      targetGroupIds: args.targetGroupIds,
      sourcePolicyIds: args.sourcePolicyIds,
      scriptId: args.scriptId,
      dateFor: args.dateFor,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// ─── Internal mutation: update policy cycle tracker ─────────────────
export const updatePolicyCycleTracker = internalMutation({
  args: {
    companyId: v.id("companies"),
    policyId: v.id("policies"),
    dateFor: v.string(),
    cycleNumber: v.number(),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("policyCycleTracker")
      .withIndex("by_company_and_policy", (q: any) =>
        q.eq("companyId", args.companyId).eq("policyId", args.policyId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastUsedDate: args.dateFor,
        cycleNumber: args.cycleNumber,
      });
    } else {
      await ctx.db.insert("policyCycleTracker", {
        companyId: args.companyId,
        policyId: args.policyId,
        lastUsedDate: args.dateFor,
        cycleNumber: args.cycleNumber,
        createdAt: Date.now(),
      });
    }

    return null;
  },
});

// ─── Helper: pick next policy in rotation ────────────────────────────
function pickNextPolicy(
  policies: Array<{ _id: string; title: string; content: string; policyType: string }>,
  cycleTrackers: Array<{ policyId: string; lastUsedDate: string; cycleNumber: number }>
): { policy: (typeof policies)[number]; cycleNumber: number } {
  if (policies.length === 0) {
    throw new Error("No policies available");
  }

  // Find policies that haven't been used in the current cycle
  const trackerMap = new Map(cycleTrackers.map(ct => [ct.policyId, ct]));
  const maxCycle = cycleTrackers.length > 0
    ? Math.max(...cycleTrackers.map(ct => ct.cycleNumber))
    : 0;

  // Policies not yet covered in the current cycle
  const uncoveredPolicies = policies.filter(p => {
    const tracker = trackerMap.get(p._id);
    return !tracker || tracker.cycleNumber < maxCycle;
  });

  if (uncoveredPolicies.length > 0) {
    // Pick the one not used most recently (or never used)
    const sorted = uncoveredPolicies.sort((a, b) => {
      const aTracker = trackerMap.get(a._id);
      const bTracker = trackerMap.get(b._id);
      if (!aTracker) return -1;
      if (!bTracker) return 1;
      return aTracker.lastUsedDate.localeCompare(bTracker.lastUsedDate);
    });
    return { policy: sorted[0], cycleNumber: maxCycle };
  }

  // All policies covered — start a new cycle
  const newCycle = maxCycle + 1;
  // Pick least recently used for the new cycle
  const sorted = [...policies].sort((a, b) => {
    const aTracker = trackerMap.get(a._id);
    const bTracker = trackerMap.get(b._id);
    if (!aTracker) return -1;
    if (!bTracker) return 1;
    return aTracker.lastUsedDate.localeCompare(bTracker.lastUsedDate);
  });
  return { policy: sorted[0], cycleNumber: newCycle };
}

// ─── Internal action: orchestrate daily content for one company ──────
export const generateDailyContentForCompany = internalAction({
  args: { companyId: v.id("companies") },
  returns: v.null(),
  async handler(ctx, args) {
    const data: any = await ctx.runQuery(
      internal.dailyQuizzes.getCompanyGenerationData,
      { companyId: args.companyId }
    );
    if (!data) return null;

    const { activePolicies, groups, dateFor, cycleTrackers } = data;

    const generalPolicies = activePolicies.filter(
      (p: any) => p.policyType === "general"
    );
    const groupPolicies = activePolicies.filter(
      (p: any) => p.policyType === "group"
    );

    // Generate general reading script + quiz shell using ROTATED policy
    if (generalPolicies.length > 0) {
      const generalTrackers = cycleTrackers.filter((ct: any) =>
        generalPolicies.some((p: any) => p._id === ct.policyId)
      );

      const { policy, cycleNumber } = pickNextPolicy(generalPolicies, generalTrackers);

      // Update cycle tracker
      await ctx.runMutation(internal.dailyQuizzes.updatePolicyCycleTracker, {
        companyId: args.companyId,
        policyId: policy._id,
        dateFor,
        cycleNumber,
      });

      const scriptId = await ctx.runMutation(
        internal.dailyQuizzes.saveReadingScript,
        {
          title: `Daily Reading: ${policy.title}`,
          content: policy.content,
          companyId: args.companyId,
          scriptType: "general" as const,
          sourcePolicyIds: [policy._id],
          dateFor,
        }
      );

      // Create quiz shell linked to the policy being studied today
      await ctx.runMutation(internal.dailyQuizzes.saveDailyQuizShell, {
        title: `Daily Quiz`,
        description: `Quiz based on today's reading: ${policy.title}`,
        companyId: args.companyId,
        quizType: "general" as const,
        sourcePolicyIds: [policy._id],
        scriptId,
        dateFor,
      });
    }

    // Generate group-specific reading scripts + quiz shells
    for (const group of groups) {
      const groupSpecificPolicies = groupPolicies.filter((p: any) =>
        p.targetGroupIds?.includes(group._id)
      );
      if (groupSpecificPolicies.length === 0) continue;

      const groupTrackers = cycleTrackers.filter((ct: any) =>
        groupSpecificPolicies.some((p: any) => p._id === ct.policyId)
      );

      const { policy, cycleNumber } = pickNextPolicy(groupSpecificPolicies, groupTrackers);

      // Update cycle tracker for group policy
      await ctx.runMutation(internal.dailyQuizzes.updatePolicyCycleTracker, {
        companyId: args.companyId,
        policyId: policy._id,
        dateFor,
        cycleNumber,
      });

      const scriptId = await ctx.runMutation(
        internal.dailyQuizzes.saveReadingScript,
        {
          title: `${group.name}: ${policy.title}`,
          content: policy.content,
          companyId: args.companyId,
          scriptType: "group" as const,
          targetGroupIds: [group._id],
          sourcePolicyIds: [policy._id],
          dateFor,
        }
      );

      await ctx.runMutation(internal.dailyQuizzes.saveDailyQuizShell, {
        title: `${group.name} Quiz`,
        description: `Quiz for ${group.name}: ${policy.title}`,
        companyId: args.companyId,
        quizType: "group" as const,
        targetGroupIds: [group._id],
        sourcePolicyIds: [policy._id],
        scriptId,
        dateFor,
      });
    }

    return null;
  },
});

// ─── Helper: call a0 LLM API with category-based generation ─────────
async function generateQuestionsWithLLM(
  policies: Array<{ title: string; content: string; policyType: string }>,
  questionCount: number,
  seed: number,
  previousQuestions: string[],
  dailyFocus: string
): Promise<
  Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    sourcePolicyTitle: string;
    category: string;
  }>
> {
  try {
    // Build combined content block
    const policyBlocks = policies
      .map((p, i) => {
        const truncated = p.content.substring(0, 3000);
        return `--- POLICY ${i + 1}: "${p.title}" (Type: ${p.policyType}) ---\n${truncated}`;
      })
      .join("\n\n");

    // Build exclusion list from recent question history
    const exclusionBlock = previousQuestions.length > 0
      ? `\n\nPREVIOUSLY ASKED QUESTIONS (DO NOT repeat or rephrase these):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
      : "";

    const response = await fetch("https://api.a0.dev/ai/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are a workplace training quiz generator. Generate exactly ${questionCount} unique multiple-choice questions from the provided policy content.

QUESTION CATEGORIES — Generate exactly ONE question from EACH category:
1. UNDERSTANDING — Test what is allowed or not allowed according to the policy
2. APPLICATION — Present a realistic scenario and ask "What would you do?"
3. REPORTING — Test knowledge of reporting procedures and escalation paths
4. RESPONSIBILITY — Test who is responsible for specific actions or decisions
5. CONSEQUENCES — Test understanding of what happens when the policy is violated

TODAY'S FOCUS: ${dailyFocus} — Make the "${dailyFocus}" category question more detailed and scenario-based.

CRITICAL RULES:
- Every question MUST be directly answerable from the provided policy text
- Each question must have exactly 4 options with only ONE correct answer
- NEVER repeat a question that is semantically similar to any in the PREVIOUSLY ASKED list
- Each question must test a DIFFERENT aspect of the policy
- Include realistic workplace scenarios where possible
- Use randomization seed ${seed} to vary which specific aspects you focus on
- For each question, include the category and source policy title

Respond with ONLY a valid JSON array, no markdown, no extra text.`,
          },
          {
            role: "user",
            content: `Here are the policies to generate questions from:\n\n${policyBlocks}${exclusionBlock}\n\nGenerate ${questionCount} questions in this exact JSON format:\n[{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "...", "sourcePolicyTitle": "...", "category": "understanding|application|reporting|responsibility|consequences"}]`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("LLM API error:", response.status);
      return generateFallbackQuestions(policies, questionCount);
    }

    const data = await response.json();

    if (data.completion) {
      const text = data.completion;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        if (Array.isArray(questions) && questions.length >= questionCount) {
          return questions.slice(0, questionCount).map((q: any) => ({
            question: String(q.question || ""),
            options: Array.isArray(q.options)
              ? q.options.map((o: any) => String(o))
              : ["A", "B", "C", "D"],
            correctAnswer: typeof q.correctAnswer === "number" ? q.correctAnswer : 0,
            explanation: String(q.explanation || ""),
            sourcePolicyTitle: String(q.sourcePolicyTitle || ""),
            category: String(q.category || "understanding"),
          }));
        }
      }
    }
  } catch (error: any) {
    console.error("LLM question generation failed:", error?.message || error);
  }

  return generateFallbackQuestions(policies, questionCount);
}

// ─── Internal query: get user's relevant policies for quiz generation ─
export const getUserPoliciesForQuiz = internalQuery({
  args: {
    userId: v.id("users"),
    companyId: v.id("companies"),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const policies = await ctx.db
      .query("policies")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const activePolicies = policies.filter((p: any) => p.isActive);
    const userGroups = user.groupIds || [];

    const relevantPolicies: Array<{
      title: string;
      content: string;
      policyType: string;
    }> = [];

    for (const policy of activePolicies) {
      if (policy.policyType === "general") {
        relevantPolicies.push({
          title: policy.title,
          content: policy.content,
          policyType: "general",
        });
      } else if (policy.policyType === "group" && policy.targetGroupIds) {
        const isInGroup = policy.targetGroupIds.some((gId: any) =>
          userGroups.includes(gId)
        );
        if (isInGroup) {
          relevantPolicies.push({
            title: policy.title,
            content: policy.content,
            policyType: "group",
          });
        }
      }
    }

    return relevantPolicies;
  },
});

// ─── Internal query: get recent question history for a company ────────
export const getRecentQuestionHistory = internalQuery({
  args: {
    companyId: v.id("companies"),
  },
  returns: v.array(v.string()),
  async handler(ctx, args) {
    // Get questions from the last 7 days to avoid repetition
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString().split("T")[0];

    const history = await ctx.db
      .query("questionHistory")
      .withIndex("by_company_and_date", (q: any) =>
        q.eq("companyId", args.companyId).gte("dateAsked", cutoffDate)
      )
      .collect();

    return history.map((h: any) => h.questionText);
  },
});

// ─── Internal mutation: save question history ─────────────────────────
export const saveQuestionHistory = internalMutation({
  args: {
    companyId: v.id("companies"),
    questions: v.array(v.object({
      policyTitle: v.string(),
      questionText: v.string(),
      category: v.string(),
    })),
    dateFor: v.string(),
  },
  returns: v.null(),
  async handler(ctx, args) {
    for (const q of args.questions) {
      await ctx.db.insert("questionHistory", {
        companyId: args.companyId,
        policyTitle: q.policyTitle,
        questionText: q.questionText,
        category: q.category,
        dateAsked: args.dateFor,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

// ─── Internal mutation: save fresh questions for a user's quiz ────────
export const saveFreshQuizQuestions = internalMutation({
  args: {
    quizId: v.id("dailyQuizzes"),
    userId: v.id("users"),
    questions: v.array(
      v.object({
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.number(),
        explanation: v.string(),
        sourcePolicyTitle: v.optional(v.string()),
        category: v.optional(v.string()),
      })
    ),
  },
  returns: v.null(),
  async handler(ctx, args) {
    // Delete any existing questions for this quiz
    const existing = await ctx.db
      .query("dailyQuizQuestions")
      .withIndex("by_quiz", (q: any) => q.eq("quizId", args.quizId))
      .collect();

    for (const q of existing) {
      await ctx.db.delete(q._id);
    }

    // Insert fresh questions
    for (let i = 0; i < args.questions.length; i++) {
      const q = args.questions[i];
      await ctx.db.insert("dailyQuizQuestions", {
        quizId: args.quizId,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        policyRef: q.sourcePolicyTitle,
        order: i + 1,
        createdAt: Date.now(),
      });
    }

    return null;
  },
});

// ─── Public action: generate fresh quiz questions for a user ─────────
export const generateFreshQuizQuestions = action({
  args: {
    userId: v.id("users"),
    companyId: v.id("companies"),
    quizId: v.id("dailyQuizzes"),
  },
  returns: v.object({
    success: v.boolean(),
    questionCount: v.number(),
  }),
  async handler(ctx, args) {
    // 1. Get user's relevant policies
    const policies: any = await ctx.runQuery(
      internal.dailyQuizzes.getUserPoliciesForQuiz,
      { userId: args.userId, companyId: args.companyId }
    );

    if (!policies || policies.length === 0) {
      return { success: false, questionCount: 0 };
    }

    // 2. Get recent question history to avoid repetition
    const previousQuestions: string[] = await ctx.runQuery(
      internal.dailyQuizzes.getRecentQuestionHistory,
      { companyId: args.companyId }
    );

    // 3. Determine today's focus category
    const dayOfWeek = getDayOfWeek();
    const dailyFocus = DAILY_FOCUS[dayOfWeek];

    // 4. Generate fresh questions using AI with categories
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    const questions = await generateQuestionsWithLLM(
      policies,
      QUESTIONS_PER_QUIZ,
      seed,
      previousQuestions,
      dailyFocus
    );

    // 5. Save the fresh questions
    await ctx.runMutation(internal.dailyQuizzes.saveFreshQuizQuestions, {
      quizId: args.quizId,
      userId: args.userId,
      questions: questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        sourcePolicyTitle: q.sourcePolicyTitle,
        category: q.category,
      })),
    });

    // 6. Save to question history to prevent future repetition
    const dateFor = getTodayString();
    await ctx.runMutation(internal.dailyQuizzes.saveQuestionHistory, {
      companyId: args.companyId,
      questions: questions.map((q) => ({
        policyTitle: q.sourcePolicyTitle,
        questionText: q.question,
        category: q.category || "understanding",
      })),
      dateFor,
    });

    return { success: true, questionCount: questions.length };
  },
});

// ─── Cron entry point: schedule generation for all companies ─────────
export const generateAllDailyContent = internalMutation({
  args: {},
  returns: v.null(),
  async handler(ctx) {
    const companies = await ctx.db.query("companies").collect();

    for (const company of companies) {
      await ctx.scheduler.runAfter(
        0,
        internal.dailyQuizzes.generateDailyContentForCompany,
        { companyId: company._id }
      );
    }

    return null;
  },
});

// ─── Public action: ensure today's content exists (on-demand safety net) ──
export const ensureTodayContent = action({
  args: {
    companyId: v.id("companies"),
  },
  returns: v.object({
    generated: v.boolean(),
  }),
  async handler(ctx, args) {
    // Check if content already exists for today
    const data: any = await ctx.runQuery(
      internal.dailyQuizzes.getCompanyGenerationData,
      { companyId: args.companyId }
    );

    // If data is null, content already exists OR company is invalid
    if (!data) {
      // Double-check: maybe content exists already (which is fine)
      const hasContent: boolean = await ctx.runQuery(
        internal.dailyQuizzes.hasTodayContent,
        { companyId: args.companyId }
      );
      return { generated: false };
    }

    // Content doesn't exist yet — generate it now
    await ctx.runAction(
      internal.dailyQuizzes.generateDailyContentForCompany,
      { companyId: args.companyId }
    );

    return { generated: true };
  },
});

// ─── Internal query: check if today's content exists ─────────────────
export const hasTodayContent = internalQuery({
  args: { companyId: v.id("companies") },
  returns: v.boolean(),
  async handler(ctx, args) {
    const dateFor = getTodayString();
    const existing = await ctx.db
      .query("dailyQuizzes")
      .withIndex("by_date", (q: any) =>
        q.eq("companyId", args.companyId).eq("dateFor", dateFor)
      )
      .first();
    return !!existing;
  },
});

// ─── Public queries & mutations ──────────────────────────────────────

// Get today's scripts for a user
export const getTodayScripts = query({
  args: {
    userId: v.id("users"),
    companyId: v.id("companies"),
  },
  returns: v.array(
    v.object({
      _id: v.id("readingScripts"),
      title: v.string(),
      content: v.string(),
      scriptType: v.string(),
      isRead: v.boolean(),
      canTakeQuiz: v.boolean(),
    })
  ),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    const dateFor = getTodayString();

    const scripts = await ctx.db
      .query("readingScripts")
      .withIndex("by_date", (q: any) =>
        q.eq("companyId", args.companyId).eq("dateFor", dateFor)
      )
      .collect();

    const result: Array<{
      _id: any;
      title: string;
      content: string;
      scriptType: string;
      isRead: boolean;
      canTakeQuiz: boolean;
    }> = [];
    for (const script of scripts) {
      if (script.scriptType === "group" && script.targetGroupIds) {
        const userGroups = user.groupIds || [];
        const isInGroup = script.targetGroupIds.some((gId: any) =>
          userGroups.includes(gId)
        );
        if (!isInGroup) continue;
      }

      const readStatus = await ctx.db
        .query("scriptReadStatus")
        .withIndex("by_user_script", (q: any) =>
          q.eq("userId", args.userId).eq("scriptId", script._id)
        )
        .first();

      result.push({
        _id: script._id,
        title: script.title,
        content: script.content,
        scriptType: script.scriptType,
        isRead: !!readStatus,
        canTakeQuiz: readStatus?.canTakeQuiz || false,
      });
    }

    return result;
  },
});

// Mark script as read
export const markScriptAsRead = mutation({
  args: {
    userId: v.id("users"),
    scriptId: v.id("readingScripts"),
  },
  returns: v.object({
    success: v.boolean(),
    canTakeQuiz: v.boolean(),
  }),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("scriptReadStatus")
      .withIndex("by_user_script", (q: any) =>
        q.eq("userId", args.userId).eq("scriptId", args.scriptId)
      )
      .first();

    if (existing) {
      return { success: true, canTakeQuiz: existing.canTakeQuiz };
    }

    await ctx.db.insert("scriptReadStatus", {
      userId: args.userId,
      scriptId: args.scriptId,
      readAt: Date.now(),
      canTakeQuiz: true,
    });

    return { success: true, canTakeQuiz: true };
  },
});

// Get today's quizzes for a user
export const getTodayQuizzes = query({
  args: {
    userId: v.id("users"),
    companyId: v.id("companies"),
  },
  returns: v.array(
    v.object({
      _id: v.id("dailyQuizzes"),
      title: v.string(),
      description: v.optional(v.string()),
      quizType: v.string(),
      questionCount: v.number(),
      hasScript: v.boolean(),
      scriptRead: v.boolean(),
      completed: v.boolean(),
      score: v.optional(v.number()),
    })
  ),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    const dateFor = getTodayString();

    const quizzes = await ctx.db
      .query("dailyQuizzes")
      .withIndex("by_date", (q: any) =>
        q.eq("companyId", args.companyId).eq("dateFor", dateFor)
      )
      .collect();

    const result: Array<{
      _id: any;
      title: string;
      description?: string;
      quizType: string;
      questionCount: number;
      hasScript: boolean;
      scriptRead: boolean;
      completed: boolean;
      score?: number;
    }> = [];
    for (const quiz of quizzes) {
      if (quiz.quizType === "group" && quiz.targetGroupIds) {
        const userGroups = user.groupIds || [];
        const isInGroup = quiz.targetGroupIds.some((gId: any) =>
          userGroups.includes(gId)
        );
        if (!isInGroup) continue;
      }

      const questions = await ctx.db
        .query("dailyQuizQuestions")
        .withIndex("by_quiz", (q: any) => q.eq("quizId", quiz._id))
        .collect();

      let scriptRead = true;
      if (quiz.scriptId) {
        const readStatus = await ctx.db
          .query("scriptReadStatus")
          .withIndex("by_user_script", (q: any) =>
            q.eq("userId", args.userId).eq("scriptId", quiz.scriptId)
          )
          .first();
        scriptRead = !!readStatus?.canTakeQuiz;
      }

      const attempt = await ctx.db
        .query("dailyQuizAttempts")
        .withIndex("by_user_quiz", (q: any) =>
          q.eq("userId", args.userId).eq("quizId", quiz._id)
        )
        .first();

      result.push({
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        quizType: quiz.quizType,
        questionCount: questions.length > 0 ? questions.length : QUESTIONS_PER_QUIZ,
        hasScript: !!quiz.scriptId,
        scriptRead,
        completed: !!attempt,
        score: attempt?.score,
      });
    }

    return result;
  },
});

// Get quiz questions
export const getQuizQuestions = query({
  args: { quizId: v.id("dailyQuizzes") },
  returns: v.array(
    v.object({
      _id: v.id("dailyQuizQuestions"),
      question: v.string(),
      options: v.array(v.string()),
      order: v.number(),
    })
  ),
  async handler(ctx, args) {
    const questions = await ctx.db
      .query("dailyQuizQuestions")
      .withIndex("by_quiz", (q: any) => q.eq("quizId", args.quizId))
      .collect();

    return questions
      .sort((a: any, b: any) => a.order - b.order)
      .map((q: any) => ({
        _id: q._id,
        question: q.question,
        options: q.options,
        order: q.order,
      }));
  },
});

// Submit quiz attempt
export const submitQuizAttempt = mutation({
  args: {
    userId: v.id("users"),
    quizId: v.id("dailyQuizzes"),
    answers: v.array(
      v.object({
        questionId: v.id("dailyQuizQuestions"),
        selectedAnswer: v.number(),
      })
    ),
  },
  returns: v.object({
    score: v.number(),
    totalQuestions: v.number(),
    correctAnswers: v.number(),
    results: v.array(
      v.object({
        questionId: v.id("dailyQuizQuestions"),
        isCorrect: v.boolean(),
        correctAnswer: v.number(),
        explanation: v.optional(v.string()),
      })
    ),
  }),
  async handler(ctx, args) {
    const questions = await ctx.db
      .query("dailyQuizQuestions")
      .withIndex("by_quiz", (q: any) => q.eq("quizId", args.quizId))
      .collect();

    let correctAnswers = 0;
    const results: Array<{
      questionId: any;
      isCorrect: boolean;
      correctAnswer: number;
      explanation?: string;
    }> = [];

    for (const answer of args.answers) {
      const question = questions.find((q: any) => q._id === answer.questionId);
      if (question) {
        const isCorrect = question.correctAnswer === answer.selectedAnswer;
        if (isCorrect) correctAnswers++;

        results.push({
          questionId: answer.questionId,
          isCorrect,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
        });
      }
    }

    const score = questions.length > 0
      ? Math.round((correctAnswers / questions.length) * 100)
      : 0;

    await ctx.db.insert("dailyQuizAttempts", {
      userId: args.userId,
      quizId: args.quizId,
      score,
      totalQuestions: questions.length,
      correctAnswers,
      completedAt: Date.now(),
    });

    return {
      score,
      totalQuestions: questions.length,
      correctAnswers,
      results,
    };
  },
});