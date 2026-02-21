import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

const caseStatusValidator = v.union(
  v.literal("pending_parties"),
  v.literal("pending_statements"),
  v.literal("under_review"),
  v.literal("judged"),
  v.literal("closed")
);

const partyRoleValidator = v.union(
  v.literal("initiator"),
  v.literal("respondent"),
  v.literal("witness")
);

const evidenceTypeValidator = v.union(
  v.literal("document"),
  v.literal("video"),
  v.literal("audio"),
  v.literal("image")
);

const findingsValidator = v.object({
  initiatorPoints: v.array(v.string()),
  respondentPoints: v.array(v.string()),
  neutralObservations: v.array(v.string()),
});

const conflictCaseReturnValidator = v.object({
  _id: v.id("conflictCases"),
  _creationTime: v.number(),
  caseNumber: v.string(),
  title: v.string(),
  description: v.string(),
  companyId: v.id("companies"),
  createdBy: v.id("users"),
  status: caseStatusValidator,
  inviteCode: v.string(),
  createdAt: v.number(),
  judgedAt: v.optional(v.number()),
});

const partyReturnValidator = v.object({
  _id: v.id("conflictParties"),
  _creationTime: v.number(),
  caseId: v.id("conflictCases"),
  userId: v.id("users"),
  userName: v.string(),
  userEmail: v.string(),
  role: partyRoleValidator,
  hasSubmittedStatement: v.boolean(),
  joinedAt: v.number(),
});

const statementReturnValidator = v.object({
  _id: v.id("conflictStatements"),
  _creationTime: v.number(),
  caseId: v.id("conflictCases"),
  partyId: v.id("conflictParties"),
  userId: v.id("users"),
  statement: v.string(),
  submittedAt: v.number(),
  updatedAt: v.optional(v.number()),
});

const witnessReturnValidator = v.object({
  _id: v.id("conflictWitnesses"),
  _creationTime: v.number(),
  caseId: v.id("conflictCases"),
  partyId: v.id("conflictParties"),
  witnessName: v.string(),
  witnessContact: v.string(),
  witnessStatement: v.string(),
  addedAt: v.number(),
});

const evidenceReturnValidator = v.object({
  _id: v.id("conflictEvidence"),
  _creationTime: v.number(),
  caseId: v.id("conflictCases"),
  partyId: v.id("conflictParties"),
  evidenceType: evidenceTypeValidator,
  fileName: v.string(),
  fileUrl: v.string(),
  storageId: v.optional(v.string()),
  description: v.string(),
  uploadedAt: v.number(),
});

const judgmentReturnValidator = v.object({
  _id: v.id("conflictJudgments"),
  _creationTime: v.number(),
  caseId: v.id("conflictCases"),
  judgmentText: v.string(),
  summary: v.string(),
  recommendations: v.array(v.string()),
  findings: findingsValidator,
  audioUrl: v.optional(v.string()),
  createdAt: v.number(),
});

// Generate unique case number
function generateCaseNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CR-${timestamp}-${random}`;
}

// Generate invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new conflict case
export const createCase = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    companyId: v.optional(v.id("companies")),
    userId: v.id("users"),
    userName: v.string(),
    userEmail: v.string(),
  },
  returns: v.object({
    caseId: v.id("conflictCases"),
    caseNumber: v.string(),
    inviteCode: v.string(),
  }),
  async handler(ctx, args) {
    const caseNumber = generateCaseNumber();
    const inviteCode = generateInviteCode();

    // Look up user's companyId if not provided
    let companyId = args.companyId;
    if (!companyId) {
      const user = await ctx.db.get(args.userId);
      if (user?.companyId) {
        companyId = user.companyId;
      } else {
        throw new Error("You must be part of a company to create a conflict case.");
      }
    }

    // Create the case
    const caseId = await ctx.db.insert("conflictCases", {
      caseNumber,
      title: args.title,
      description: args.description,
      companyId,
      createdBy: args.userId,
      status: "pending_parties",
      inviteCode,
      createdAt: Date.now(),
    });

    // Add creator as initiator
    await ctx.db.insert("conflictParties", {
      caseId,
      userId: args.userId,
      userName: args.userName,
      userEmail: args.userEmail,
      role: "initiator",
      hasSubmittedStatement: false,
      joinedAt: Date.now(),
    });

    return { caseId, caseNumber, inviteCode };
  },
});

// Join a case using invite code
export const joinCase = mutation({
  args: {
    inviteCode: v.string(),
    userId: v.id("users"),
    userName: v.string(),
    userEmail: v.string(),
  },
  returns: v.object({
    caseId: v.id("conflictCases"),
    message: v.string(),
  }),
  async handler(ctx, args) {
    // Find case by invite code
    const conflictCase = await ctx.db
      .query("conflictCases")
      .withIndex("by_invite_code", (q: any) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!conflictCase) {
      throw new Error("Invalid invite code");
    }

    if (conflictCase.status !== "pending_parties" && conflictCase.status !== "pending_statements") {
      throw new Error("This case is no longer accepting new parties");
    }

    // Check if user already joined
    const existingParty = await ctx.db
      .query("conflictParties")
      .withIndex("by_case_and_user", (q: any) => 
        q.eq("caseId", conflictCase._id).eq("userId", args.userId)
      )
      .first();

    if (existingParty) {
      return { caseId: conflictCase._id, message: "Already joined" };
    }

    // Add as respondent
    await ctx.db.insert("conflictParties", {
      caseId: conflictCase._id,
      userId: args.userId,
      userName: args.userName,
      userEmail: args.userEmail,
      role: "respondent",
      hasSubmittedStatement: false,
      joinedAt: Date.now(),
    });

    // Update case status
    await ctx.db.patch(conflictCase._id, {
      status: "pending_statements",
    });

    return { caseId: conflictCase._id, message: "Successfully joined case" };
  },
});

// Submit or update statement
export const submitStatement = mutation({
  args: {
    caseId: v.id("conflictCases"),
    userId: v.id("users"),
    statement: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  async handler(ctx, args) {
    // Get party record
    const party = await ctx.db
      .query("conflictParties")
      .withIndex("by_case_and_user", (q: any) => 
        q.eq("caseId", args.caseId).eq("userId", args.userId)
      )
      .first();

    if (!party) {
      throw new Error("You are not a party to this case");
    }

    // Check if statement already exists
    const existingStatement = await ctx.db
      .query("conflictStatements")
      .withIndex("by_party", (q: any) => q.eq("partyId", party._id))
      .first();

    if (existingStatement) {
      // Update existing statement
      await ctx.db.patch(existingStatement._id, {
        statement: args.statement,
        updatedAt: Date.now(),
      });
    } else {
      // Create new statement
      await ctx.db.insert("conflictStatements", {
        caseId: args.caseId,
        partyId: party._id,
        userId: args.userId,
        statement: args.statement,
        submittedAt: Date.now(),
      });
    }

    // Mark party as having submitted statement
    await ctx.db.patch(party._id, {
      hasSubmittedStatement: true,
    });

    return { success: true };
  },
});

// Add witness
export const addWitness = mutation({
  args: {
    caseId: v.id("conflictCases"),
    userId: v.id("users"),
    witnessName: v.string(),
    witnessContact: v.string(),
    witnessStatement: v.string(),
  },
  returns: v.object({ success: v.boolean() }),
  async handler(ctx, args) {
    // Get party record
    const party = await ctx.db
      .query("conflictParties")
      .withIndex("by_case_and_user", (q: any) => 
        q.eq("caseId", args.caseId).eq("userId", args.userId)
      )
      .first();

    if (!party) {
      throw new Error("You are not a party to this case");
    }

    await ctx.db.insert("conflictWitnesses", {
      caseId: args.caseId,
      partyId: party._id,
      witnessName: args.witnessName,
      witnessContact: args.witnessContact,
      witnessStatement: args.witnessStatement,
      addedAt: Date.now(),
    });

    return { success: true };
  },
});

// Add evidence
export const addEvidence = mutation({
  args: {
    caseId: v.id("conflictCases"),
    userId: v.id("users"),
    evidenceType: v.union(
      v.literal("document"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("image")
    ),
    fileName: v.string(),
    fileUrl: v.string(),
    description: v.string(),
    storageId: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean() }),
  async handler(ctx, args) {
    // Get party record
    const party = await ctx.db
      .query("conflictParties")
      .withIndex("by_case_and_user", (q: any) => 
        q.eq("caseId", args.caseId).eq("userId", args.userId)
      )
      .first();

    if (!party) {
      throw new Error("You are not a party to this case");
    }

    await ctx.db.insert("conflictEvidence", {
      caseId: args.caseId,
      partyId: party._id,
      evidenceType: args.evidenceType,
      fileName: args.fileName,
      fileUrl: args.fileUrl,
      storageId: args.storageId,
      description: args.description,
      uploadedAt: Date.now(),
    });

    return { success: true };
  },
});

// Request AI judgment (runs as an action because it calls external APIs)
export const requestJudgment = action({
  args: {
    caseId: v.id("conflictCases"),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const data = await ctx.runQuery(internal.conflictResolution.loadCaseForJudgment, {
      caseId: args.caseId,
    });
    if (!data) {
      throw new Error("Case not found");
    }

    const { conflictCase, parties, statements, witnesses, evidence } = data;
    if (conflictCase.status === "judged") {
      return null;
    }

    const allSubmitted = parties.every((p: any) => p.hasSubmittedStatement);
    if (!allSubmitted) {
      throw new Error("All parties must submit their statements before requesting judgment");
    }

    await ctx.runMutation(internal.conflictResolution.setCaseStatus, {
      caseId: args.caseId,
      status: "under_review",
    });

    // Build context for AI
    let context = `# Conflict Resolution Case: ${conflictCase.caseNumber}\n\n`;
    context += `## Case Description\n${conflictCase.description}\n\n`;
    context += `## Parties Involved\n`;

    for (const party of parties as any[]) {
      context += `\n### ${party.role === "initiator" ? "Initiator" : "Respondent"}: ${party.userName}\n`;

      const statement = (statements as any[]).find((s: any) => s.partyId === party._id);
      if (statement) {
        context += `**Statement:**\n${statement.statement}\n\n`;
      }

      const partyWitnesses = (witnesses as any[]).filter((w: any) => w.partyId === party._id);
      if (partyWitnesses.length > 0) {
        context += `**Witnesses:**\n`;
        for (const witness of partyWitnesses as any[]) {
          context += `- ${witness.witnessName} (${witness.witnessContact}): ${witness.witnessStatement}\n`;
        }
        context += `\n`;
      }

      const partyEvidence = (evidence as any[]).filter((e: any) => e.partyId === party._id);
      if (partyEvidence.length > 0) {
        context += `**Evidence Submitted:**\n`;
        for (const ev of partyEvidence as any[]) {
          context += `- ${ev.evidenceType.toUpperCase()}: ${ev.fileName} - ${ev.description}\n`;
        }
        context += `\n`;
      }
    }

    const aiResponse = await globalThis.fetch("https://api.a0.dev/ai/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are a professional conflict mediator and advisor. Your role is to:
1. Carefully analyze both sides of the conflict
2. Identify key points from each party
3. Provide neutral observations
4. Give fair and balanced recommendations
5. Suggest constructive steps forward

Be empathetic, objective, and solution-oriented.`,
          },
          {
            role: "user",
            content: `${context}\n\nPlease provide a detailed judgment including:
1. Summary of the conflict
2. Key points from each party
3. Neutral observations
4. Recommendations for resolution
5. Steps both parties can take moving forward`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      await ctx.runMutation(internal.conflictResolution.setCaseStatus, {
        caseId: args.caseId,
        status: "pending_statements",
      });
      throw new Error("Failed to generate AI judgment");
    }

    const aiData = await aiResponse.json();
    const judgmentText = aiData.completion || "";

    const summary = judgmentText.split("\n")[0] || "AI has reviewed this case";
    const recommendations = extractRecommendations(judgmentText);
    const findings = extractFindings(judgmentText, parties);

    await ctx.runMutation(internal.conflictResolution.finalizeJudgment, {
      caseId: args.caseId,
      judgmentText,
      summary,
      recommendations,
      findings,
    });

    return null;
  },
});

// Helper to extract recommendations
function extractRecommendations(text: string): string[] {
  const recommendations: string[] = [];
  const lines = text.split("\n");
  let inRecommendations = false;

  for (const line of lines) {
    if (line.toLowerCase().includes("recommendation")) {
      inRecommendations = true;
      continue;
    }
    if (inRecommendations && line.trim().match(/^[\d\-\*\u2022]/)) {
      recommendations.push(line.trim().replace(/^[\d\-\*\u2022]\s*/, ""));
    }
  }

  return recommendations.length > 0 ? recommendations : ["Seek mutual understanding", "Communicate openly", "Consider professional mediation"];
}

// Helper to extract findings
function extractFindings(text: string, parties: any[]): {
  initiatorPoints: string[];
  respondentPoints: string[];
  neutralObservations: string[];
} {
  const initiatorPoints: string[] = [];
  const respondentPoints: string[] = [];
  const neutralObservations: string[] = [];

  const lines = text.split("\n");
  let currentSection = "";

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("initiator") || lower.includes("first party")) {
      currentSection = "initiator";
    } else if (lower.includes("respondent") || lower.includes("second party")) {
      currentSection = "respondent";
    } else if (lower.includes("neutral") || lower.includes("observation")) {
      currentSection = "neutral";
    }

    if (line.trim().match(/^[\d\-\*\u2022]/) && currentSection) {
      const point = line.trim().replace(/^[\d\-\*\u2022]\s*/, "");
      if (currentSection === "initiator") {
        initiatorPoints.push(point);
      } else if (currentSection === "respondent") {
        respondentPoints.push(point);
      } else if (currentSection === "neutral") {
        neutralObservations.push(point);
      }
    }
  }

  return {
    initiatorPoints: initiatorPoints.length > 0 ? initiatorPoints : ["Reviewed statement provided"],
    respondentPoints: respondentPoints.length > 0 ? respondentPoints : ["Reviewed statement provided"],
    neutralObservations: neutralObservations.length > 0 ? neutralObservations : ["Both parties have valid concerns"],
  };
}

// Get case details with all related data
export const getCaseDetails = query({
  args: { caseId: v.id("conflictCases") },
  returns: v.union(
    v.object({
      case: conflictCaseReturnValidator,
      parties: v.array(partyReturnValidator),
      statements: v.array(statementReturnValidator),
      witnesses: v.array(witnessReturnValidator),
      evidence: v.array(evidenceReturnValidator),
      judgment: v.union(judgmentReturnValidator, v.null()),
    }),
    v.null()
  ),
  async handler(ctx, args) {
    const conflictCase = await ctx.db.get(args.caseId);
    if (!conflictCase) return null;

    const parties = await ctx.db
      .query("conflictParties")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();

    const statements = await ctx.db
      .query("conflictStatements")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();

    const witnesses = await ctx.db
      .query("conflictWitnesses")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();

    const evidence = await ctx.db
      .query("conflictEvidence")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();

    const judgment = await ctx.db
      .query("conflictJudgments")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .first();

    return {
      case: {
        _id: conflictCase._id,
        _creationTime: conflictCase._creationTime,
        caseNumber: conflictCase.caseNumber,
        title: conflictCase.title,
        description: conflictCase.description,
        companyId: conflictCase.companyId,
        createdBy: conflictCase.createdBy,
        status: conflictCase.status,
        inviteCode: conflictCase.inviteCode,
        createdAt: conflictCase.createdAt,
        judgedAt: conflictCase.judgedAt,
      },
      parties: parties.map((p: any) => ({
        _id: p._id,
        _creationTime: p._creationTime,
        caseId: p.caseId,
        userId: p.userId,
        userName: p.userName,
        userEmail: p.userEmail,
        role: p.role,
        hasSubmittedStatement: p.hasSubmittedStatement,
        joinedAt: p.joinedAt,
      })),
      statements: statements.map((s: any) => ({
        _id: s._id,
        _creationTime: s._creationTime,
        caseId: s.caseId,
        partyId: s.partyId,
        userId: s.userId,
        statement: s.statement,
        submittedAt: s.submittedAt,
        updatedAt: s.updatedAt,
      })),
      witnesses: witnesses.map((w: any) => ({
        _id: w._id,
        _creationTime: w._creationTime,
        caseId: w.caseId,
        partyId: w.partyId,
        witnessName: w.witnessName,
        witnessContact: w.witnessContact,
        witnessStatement: w.witnessStatement,
        addedAt: w.addedAt,
      })),
      evidence: evidence.map((e: any) => ({
        _id: e._id,
        _creationTime: e._creationTime,
        caseId: e.caseId,
        partyId: e.partyId,
        evidenceType: e.evidenceType,
        fileName: e.fileName,
        fileUrl: e.fileUrl,
        storageId: e.storageId,
        description: e.description,
        uploadedAt: e.uploadedAt,
      })),
      judgment: judgment
        ? {
            _id: judgment._id,
            _creationTime: judgment._creationTime,
            caseId: judgment.caseId,
            judgmentText: judgment.judgmentText,
            summary: judgment.summary,
            recommendations: judgment.recommendations,
            findings: judgment.findings,
            audioUrl: judgment.audioUrl,
            createdAt: judgment.createdAt,
          }
        : null,
    };
  },
});

// Get user's cases
export const getUserCases = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("conflictCases"),
      _creationTime: v.number(),
      caseNumber: v.string(),
      title: v.string(),
      status: caseStatusValidator,
      inviteCode: v.string(),
      createdAt: v.number(),
      judgedAt: v.optional(v.number()),
      userRole: partyRoleValidator,
      hasSubmittedStatement: v.boolean(),
      hasJudgment: v.boolean(),
    })
  ),
  async handler(ctx, args) {
    // Get all cases where user is a party
    const userParties = await ctx.db
      .query("conflictParties")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    const cases = [];
    for (const party of userParties) {
      const conflictCase = await ctx.db.get(party.caseId);
      if (conflictCase) {
        const judgment = await ctx.db
          .query("conflictJudgments")
          .withIndex("by_case", (q: any) => q.eq("caseId", party.caseId))
          .first();

        cases.push({
          _id: conflictCase._id,
          _creationTime: conflictCase._creationTime,
          caseNumber: conflictCase.caseNumber,
          title: conflictCase.title,
          status: conflictCase.status,
          inviteCode: conflictCase.inviteCode,
          createdAt: conflictCase.createdAt,
          judgedAt: conflictCase.judgedAt,
          userRole: party.role,
          hasSubmittedStatement: party.hasSubmittedStatement,
          hasJudgment: !!judgment,
        });
      }
    }

    return cases.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Save judgment to user's account
export const saveJudgment = mutation({
  args: {
    userId: v.id("users"),
    caseId: v.id("conflictCases"),
    judgmentId: v.id("conflictJudgments"),
    notes: v.optional(v.string()),
  },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  async handler(ctx, args) {
    // Check if already saved
    const existing = await ctx.db
      .query("savedJudgments")
      .withIndex("by_user_and_case", (q: any) => q.eq("userId", args.userId).eq("caseId", args.caseId))
      .first();

    if (existing) {
      return { success: true, message: "Already saved" };
    }

    await ctx.db.insert("savedJudgments", {
      userId: args.userId,
      caseId: args.caseId,
      judgmentId: args.judgmentId,
      notes: args.notes,
      savedAt: Date.now(),
    });

    return { success: true, message: "Judgment saved" };
  },
});

// Get user's saved judgments
export const getSavedJudgments = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("savedJudgments"),
      _creationTime: v.number(),
      userId: v.id("users"),
      caseId: v.id("conflictCases"),
      judgmentId: v.id("conflictJudgments"),
      notes: v.optional(v.string()),
      savedAt: v.number(),
      caseTitle: v.string(),
      caseNumber: v.string(),
      judgment: judgmentReturnValidator,
    })
  ),
  async handler(ctx, args) {
    const saved = await ctx.db
      .query("savedJudgments")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    const results = [];
    for (const item of saved) {
      const conflictCase = await ctx.db.get(item.caseId);
      const judgment = await ctx.db.get(item.judgmentId);
      if (conflictCase && judgment) {
        results.push({
          _id: item._id,
          _creationTime: item._creationTime,
          userId: item.userId,
          caseId: item.caseId,
          judgmentId: item.judgmentId,
          notes: item.notes,
          savedAt: item.savedAt,
          caseTitle: conflictCase.title,
          caseNumber: conflictCase.caseNumber,
          judgment: {
            _id: judgment._id,
            _creationTime: judgment._creationTime,
            caseId: judgment.caseId,
            judgmentText: judgment.judgmentText,
            summary: judgment.summary,
            recommendations: judgment.recommendations,
            findings: judgment.findings,
            audioUrl: judgment.audioUrl,
            createdAt: judgment.createdAt,
          },
        });
      }
    }

    return results.sort((a, b) => b.savedAt - a.savedAt);
  },
});

// --- Internals used by the requestJudgment action ---

export const loadCaseForJudgment = internalQuery({
  args: { caseId: v.id("conflictCases") },
  returns: v.union(
    v.object({
      conflictCase: conflictCaseReturnValidator,
      parties: v.array(partyReturnValidator),
      statements: v.array(statementReturnValidator),
      witnesses: v.array(witnessReturnValidator),
      evidence: v.array(evidenceReturnValidator),
    }),
    v.null()
  ),
  async handler(ctx, args) {
    const conflictCase = await ctx.db.get(args.caseId);
    if (!conflictCase) return null;

    const parties = await ctx.db
      .query("conflictParties")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();

    const statements = await ctx.db
      .query("conflictStatements")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();

    const witnesses = await ctx.db
      .query("conflictWitnesses")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();

    const evidence = await ctx.db
      .query("conflictEvidence")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();

    return {
      conflictCase: {
        _id: conflictCase._id,
        _creationTime: conflictCase._creationTime,
        caseNumber: conflictCase.caseNumber,
        title: conflictCase.title,
        description: conflictCase.description,
        companyId: conflictCase.companyId,
        createdBy: conflictCase.createdBy,
        status: conflictCase.status,
        inviteCode: conflictCase.inviteCode,
        createdAt: conflictCase.createdAt,
        judgedAt: conflictCase.judgedAt,
      },
      parties: parties.map((p: any) => ({
        _id: p._id,
        _creationTime: p._creationTime,
        caseId: p.caseId,
        userId: p.userId,
        userName: p.userName,
        userEmail: p.userEmail,
        role: p.role,
        hasSubmittedStatement: p.hasSubmittedStatement,
        joinedAt: p.joinedAt,
      })),
      statements: statements.map((s: any) => ({
        _id: s._id,
        _creationTime: s._creationTime,
        caseId: s.caseId,
        partyId: s.partyId,
        userId: s.userId,
        statement: s.statement,
        submittedAt: s.submittedAt,
        updatedAt: s.updatedAt,
      })),
      witnesses: witnesses.map((w: any) => ({
        _id: w._id,
        _creationTime: w._creationTime,
        caseId: w.caseId,
        partyId: w.partyId,
        witnessName: w.witnessName,
        witnessContact: w.witnessContact,
        witnessStatement: w.witnessStatement,
        addedAt: w.addedAt,
      })),
      evidence: evidence.map((e: any) => ({
        _id: e._id,
        _creationTime: e._creationTime,
        caseId: e.caseId,
        partyId: e.partyId,
        evidenceType: e.evidenceType,
        fileName: e.fileName,
        fileUrl: e.fileUrl,
        storageId: e.storageId,
        description: e.description,
        uploadedAt: e.uploadedAt,
      })),
    };
  },
});

export const setCaseStatus = internalMutation({
  args: {
    caseId: v.id("conflictCases"),
    status: caseStatusValidator,
  },
  returns: v.null(),
  async handler(ctx, args) {
    const conflictCase = await ctx.db.get(args.caseId);
    if (!conflictCase) return null;
    await ctx.db.patch(args.caseId, { status: args.status });
    return null;
  },
});

export const finalizeJudgment = internalMutation({
  args: {
    caseId: v.id("conflictCases"),
    judgmentText: v.string(),
    summary: v.string(),
    recommendations: v.array(v.string()),
    findings: findingsValidator,
  },
  returns: v.id("conflictJudgments"),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("conflictJudgments")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .first();
    if (existing) {
      return existing._id;
    }

    const judgmentId = await ctx.db.insert("conflictJudgments", {
      caseId: args.caseId,
      judgmentText: args.judgmentText,
      summary: args.summary,
      recommendations: args.recommendations,
      findings: args.findings,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.caseId, {
      status: "judged",
      judgedAt: Date.now(),
    });

    return judgmentId;
  },
});