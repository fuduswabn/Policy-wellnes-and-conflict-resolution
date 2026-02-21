import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Subscription Packages
  packages: defineTable({
    name: v.string(),
    maxEmployees: v.number(),
    maxGroups: v.number(),
    priceMonthly: v.number(),
    features: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }),

  // Companies/Businesses
  companies: defineTable({
    name: v.string(),
    managerId: v.id("users"),
    packageId: v.optional(v.id("packages")),
    planRef: v.optional(v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise"))),
    subscriptionStatus: v.union(
      v.literal("active"),
      v.literal("trial"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    paymentDueDate: v.optional(v.number()),
    lastPaymentDate: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    employeeCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_manager", ["managerId"])
    .index("by_status", ["subscriptionStatus"]),

  // Invite Codes for employees
  inviteCodes: defineTable({
    code: v.string(),
    companyId: v.id("companies"),
    createdBy: v.id("users"),
    groupId: v.optional(v.id("employeeGroups")),
    usedBy: v.optional(v.id("users")),
    isUsed: v.boolean(),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_code", ["code"])
    .index("by_company", ["companyId"]),

  // Employee Groups (for selective quizzes and policies)
  employeeGroups: defineTable({
    name: v.string(),
    companyId: v.id("companies"),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_company", ["companyId"]),

  // Users & Authentication
  users: defineTable({
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("employee")),
    companyId: v.optional(v.id("companies")),
    groupIds: v.optional(v.array(v.id("employeeGroups"))),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"])
    .index("by_company", ["companyId"]),

  // Policies (company-specific with group targeting)
  policies: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("docx"), v.literal("txt")),
    fileUrl: v.string(),
    companyId: v.id("companies"),
    uploadedBy: v.id("users"),
    // Policy type: general (all employees) or group-specific
    policyType: v.union(v.literal("general"), v.literal("group")),
    // Target groups for group-specific policies
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    version: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_active", ["isActive"])
    .index("by_company", ["companyId"])
    .index("by_type", ["companyId", "policyType"]),

  // Policy Chunks for AI
  policyChunks: defineTable({
    policyId: v.id("policies"),
    chunkIndex: v.number(),
    content: v.string(),
    embeddings: v.optional(v.array(v.number())),
    createdAt: v.number(),
  }).index("by_policy", ["policyId"]),

  // Reading Scripts (generated before quiz)
  readingScripts: defineTable({
    title: v.string(),
    content: v.string(),
    companyId: v.id("companies"),
    // Script type: general or group-specific
    scriptType: v.union(v.literal("general"), v.literal("group")),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    // Source policies used to generate this script
    sourcePolicyIds: v.array(v.id("policies")),
    // Date this script is for
    dateFor: v.string(), // "YYYY-MM-DD"
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_date", ["companyId", "dateFor"]),

  // Script Read Status
  scriptReadStatus: defineTable({
    userId: v.id("users"),
    scriptId: v.id("readingScripts"),
    readAt: v.number(),
    canTakeQuiz: v.boolean(),
  }).index("by_user_script", ["userId", "scriptId"])
    .index("by_user", ["userId"]),

  // Daily Quizzes (auto-generated)
  dailyQuizzes: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    companyId: v.id("companies"),
    // Quiz type: general or group-specific
    quizType: v.union(v.literal("general"), v.literal("group")),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    // Source policies/scripts
    sourcePolicyIds: v.array(v.id("policies")),
    scriptId: v.optional(v.id("readingScripts")),
    // Date this quiz is for
    dateFor: v.string(), // "YYYY-MM-DD"
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_date", ["companyId", "dateFor"]),

  // Daily Quiz Questions
  dailyQuizQuestions: defineTable({
    quizId: v.id("dailyQuizzes"),
    question: v.string(),
    options: v.array(v.string()),
    correctAnswer: v.number(),
    explanation: v.optional(v.string()),
    policyRef: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_quiz", ["quizId"]),

  // Daily Quiz Attempts
  dailyQuizAttempts: defineTable({
    userId: v.id("users"),
    quizId: v.id("dailyQuizzes"),
    score: v.number(),
    totalQuestions: v.number(),
    correctAnswers: v.number(),
    completedAt: v.number(),
  }).index("by_user_quiz", ["userId", "quizId"])
    .index("by_user", ["userId"]),

  // Question History - tracks previously asked questions to avoid repetition
  questionHistory: defineTable({
    companyId: v.id("companies"),
    policyTitle: v.string(),
    questionText: v.string(),
    category: v.string(), // understanding, application, reporting, responsibility, consequences
    dateAsked: v.string(), // "YYYY-MM-DD"
    createdAt: v.number(),
  }).index("by_company_and_date", ["companyId", "dateAsked"])
    .index("by_company_and_policy", ["companyId", "policyTitle"]),

  // Policy Cycle Tracker - rotates through policies, restarts when all covered
  policyCycleTracker: defineTable({
    companyId: v.id("companies"),
    policyId: v.id("policies"),
    lastUsedDate: v.string(), // "YYYY-MM-DD"
    cycleNumber: v.number(), // increments each full rotation
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_company_and_policy", ["companyId", "policyId"]),

  // Legacy Quizzes (manual quizzes by manager)
  quizzes: defineTable({
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
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"]),

  // Quiz Questions
  quizQuestions: defineTable({
    quizId: v.id("quizzes"),
    type: v.union(v.literal("mcq"), v.literal("truefalse"), v.literal("scenario")),
    question: v.string(),
    options: v.array(v.string()),
    correctAnswer: v.number(),
    explanation: v.optional(v.string()),
    policyRef: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_quiz", ["quizId"]),

  // Quiz Responses
  quizResponses: defineTable({
    employeeId: v.id("users"),
    quizId: v.id("quizzes"),
    questionId: v.id("quizQuestions"),
    selectedAnswer: v.number(),
    isCorrect: v.boolean(),
    timeSpent: v.number(),
    completedAt: v.number(),
  }).index("by_employee_quiz", ["employeeId", "quizId"]),

  // Quiz Attempts
  quizAttempts: defineTable({
    employeeId: v.id("users"),
    quizId: v.id("quizzes"),
    score: v.number(),
    totalQuestions: v.number(),
    correctAnswers: v.number(),
    timeTaken: v.number(),
    attemptNumber: v.number(),
    completedAt: v.number(),
  }).index("by_employee_quiz", ["employeeId", "quizId"]),

  // Policy Acknowledgments
  policyAcknowledgments: defineTable({
    employeeId: v.id("users"),
    policyId: v.id("policies"),
    acknowledged: v.boolean(),
    acknowledgedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    requiresRetake: v.boolean(),
  }).index("by_employee_policy", ["employeeId", "policyId"])
    .index("by_employee", ["employeeId"]),

  // Direct Messages (Employee <-> Admin)
  directMessages: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    companyId: v.id("companies"),
    message: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_conversation", ["companyId", "fromUserId", "toUserId"])
    .index("by_to_user", ["toUserId"]),

  // Compliance Reports
  complianceReports: defineTable({
    employeeId: v.id("users"),
    generatedAt: v.number(),
    generatedBy: v.id("users"),
    policies: v.array(v.object({
      policyId: v.id("policies"),
      acknowledged: v.boolean(),
      lastAcknowledgedAt: v.optional(v.number()),
    })),
    quizScores: v.array(v.object({
      quizId: v.id("quizzes"),
      attempts: v.number(),
      bestScore: v.number(),
      latestScore: v.number(),
    })),
    overallCompliance: v.number(),
  }),

  // Legacy Chat Messages (keep for backwards compatibility)
  chatMessages: defineTable({
    userId: v.id("users"),
    message: v.string(),
    response: v.string(),
    sourcePolicies: v.array(v.id("policies")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Content Moderation tables
  contentFlags: defineTable({
    companyId: v.id("companies"),
    contentType: v.union(v.literal("policy"), v.literal("chat"), v.literal("user_content")),
    contentId: v.string(),
    reason: v.string(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    violationType: v.string(),
    status: v.union(v.literal("pending"), v.literal("resolved"), v.literal("dismissed")),
    flaggedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  }).index("by_company", ["companyId"])
    .index("by_status", ["status"]),

  moderationLog: defineTable({
    companyId: v.id("companies"),
    action: v.string(),
    reason: v.string(),
    timestamp: v.number(),
  }).index("by_company", ["companyId"]),

  // Professional Support (counselors, psychologists, lawyers)
  professionals: defineTable({
    companyId: v.id("companies"),
    type: v.union(v.literal("counselor"), v.literal("psychologist"), v.literal("lawyer")),
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    specialty: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_type", ["companyId", "type"]),

  // Conflict Resolution System
  conflictCases: defineTable({
    caseNumber: v.string(), // Unique case identifier
    title: v.string(),
    description: v.string(),
    companyId: v.id("companies"),
    createdBy: v.id("users"),
    status: v.union(
      v.literal("pending_parties"), // Waiting for all parties to join
      v.literal("pending_statements"), // Waiting for statements
      v.literal("under_review"), // AI is reviewing
      v.literal("judged"), // AI has provided judgment
      v.literal("closed") // Case closed
    ),
    inviteCode: v.string(), // Code for parties to join
    createdAt: v.number(),
    judgedAt: v.optional(v.number()),
  })
    .index("by_company", ["companyId"])
    .index("by_case_number", ["caseNumber"])
    .index("by_invite_code", ["inviteCode"]),

  conflictParties: defineTable({
    caseId: v.id("conflictCases"),
    userId: v.id("users"),
    userName: v.string(),
    userEmail: v.string(),
    role: v.union(v.literal("initiator"), v.literal("respondent"), v.literal("witness")),
    hasSubmittedStatement: v.boolean(),
    joinedAt: v.number(),
  })
    .index("by_case", ["caseId"])
    .index("by_user", ["userId"])
    .index("by_case_and_user", ["caseId", "userId"]),

  conflictStatements: defineTable({
    caseId: v.id("conflictCases"),
    partyId: v.id("conflictParties"),
    userId: v.id("users"),
    statement: v.string(), // Their side of the story
    submittedAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_case", ["caseId"])
    .index("by_party", ["partyId"]),

  conflictWitnesses: defineTable({
    caseId: v.id("conflictCases"),
    partyId: v.id("conflictParties"), // Which party added this witness
    witnessName: v.string(),
    witnessContact: v.string(),
    witnessStatement: v.string(),
    addedAt: v.number(),
  })
    .index("by_case", ["caseId"])
    .index("by_party", ["partyId"]),

  conflictEvidence: defineTable({
    caseId: v.id("conflictCases"),
    partyId: v.id("conflictParties"), // Which party submitted this evidence
    evidenceType: v.union(
      v.literal("document"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("image")
    ),
    fileName: v.string(),
    fileUrl: v.string(), // Storage URL
    storageId: v.optional(v.string()), // Convex storage ID
    description: v.string(),
    uploadedAt: v.number(),
  })
    .index("by_case", ["caseId"])
    .index("by_party", ["partyId"]),

  conflictJudgments: defineTable({
    caseId: v.id("conflictCases"),
    judgmentText: v.string(), // AI's detailed judgment
    summary: v.string(), // Short summary
    recommendations: v.array(v.string()), // List of recommendations
    findings: v.object({
      initiatorPoints: v.array(v.string()),
      respondentPoints: v.array(v.string()),
      neutralObservations: v.array(v.string()),
    }),
    audioUrl: v.optional(v.string()), // Text-to-speech URL if generated
    createdAt: v.number(),
  })
    .index("by_case", ["caseId"]),

  // User saved judgments/outcomes
  savedJudgments: defineTable({
    userId: v.id("users"),
    caseId: v.id("conflictCases"),
    judgmentId: v.id("conflictJudgments"),
    notes: v.optional(v.string()),
    savedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_case", ["caseId"])
    .index("by_user_and_case", ["userId", "caseId"]),

  // Support Messages (user -> admin inbox)
  supportMessages: defineTable({
    userId: v.id("users"),
    userName: v.string(),
    userEmail: v.string(),
    subject: v.string(),
    message: v.string(),
    status: v.union(v.literal("open"), v.literal("replied"), v.literal("closed")),
    adminReply: v.optional(v.string()),
    repliedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_user", ["userId"]),

  // WHITE LABEL CONFIGURATION
  // Reseller accounts (platform admins who manage multiple companies)
  resellers: defineTable({
    email: v.string(),
    password: v.string(),
    companyName: v.string(),
    contactName: v.string(),
    subscriptionPlan: v.union(v.literal("starter"), v.literal("professional"), v.literal("enterprise")),
    subscriptionStatus: v.union(v.literal("active"), v.literal("trial"), v.literal("expired"), v.literal("cancelled")),
    trialEndsAt: v.optional(v.number()),
    subscriptionStartDate: v.number(),
    nextBillingDate: v.optional(v.number()),
    maxCompanies: v.number(), // Limited by plan
    usedCompanies: v.number(), // Current count
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"])
    .index("by_status", ["subscriptionStatus"]),

  // Brand customization per reseller
  resellerBranding: defineTable({
    resellerId: v.id("resellers"),
    logoUrl: v.optional(v.string()), // Uploaded logo
    primaryColor: v.string(), // Hex color
    secondaryColor: v.string(), // Hex color
    accentColor: v.string(), // Hex color
    companyName: v.string(), // Display name
    brandStatement: v.optional(v.string()), // Tagline/mission
    supportEmail: v.optional(v.string()),
    supportPhone: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    // Domain customization (white-label domain)
    customDomain: v.optional(v.string()), // e.g., "policies.mycompany.com"
    customDomainVerified: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_reseller", ["resellerId"]),

  // Sub-companies managed by a reseller
  resellerCompanies: defineTable({
    resellerId: v.id("resellers"),
    companyId: v.id("companies"),
    createdAt: v.number(),
  }).index("by_reseller", ["resellerId"])
    .index("by_company", ["companyId"]),

  // Usage tracking for billing
  usageMetrics: defineTable({
    resellerId: v.id("resellers"),
    month: v.string(), // "YYYY-MM"
    employeesCreated: v.number(),
    policiesUploaded: v.number(),
    quizzesCreated: v.number(),
    apiCallsUsed: v.number(),
    storageUsedMB: v.number(),
    createdAt: v.number(),
  }).index("by_reseller", ["resellerId"])
    .index("by_reseller_month", ["resellerId", "month"]),

  // Payment history for resellers
  resellerPayments: defineTable({
    resellerId: v.id("resellers"),
    amount: v.number(),
    currency: v.string(), // "USD", "EUR", etc
    paymentMethod: v.string(), // "stripe", "bank_transfer"
    transactionId: v.string(), // External payment provider ID
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"), v.literal("refunded")),
    invoiceUrl: v.optional(v.string()),
    billingPeriodStart: v.number(),
    billingPeriodEnd: v.number(),
    createdAt: v.number(),
  }).index("by_reseller", ["resellerId"])
    .index("by_status", ["status"]),

  // API Keys for resellers (for REST API access if needed)
  resellerApiKeys: defineTable({
    resellerId: v.id("resellers"),
    keyHash: v.string(), // Hash of the actual key (never store plain)
    name: v.string(),
    isActive: v.boolean(),
    lastUsedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_reseller", ["resellerId"]),
});