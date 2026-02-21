import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const acknowledgePolicy = mutation({
  args: {
    employeeId: v.id("users"),
    policyId: v.id("policies"),
  },
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("policyAcknowledgments")
      .withIndex("by_employee_policy", (q: any) =>
        q.eq("employeeId", args.employeeId).eq("policyId", args.policyId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        acknowledged: true,
        acknowledgedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("policyAcknowledgments", {
      employeeId: args.employeeId,
      policyId: args.policyId,
      acknowledged: true,
      acknowledgedAt: Date.now(),
      requiresRetake: false,
    });
  },
});

export const getEmployeeCompliance = query({
  args: { employeeId: v.id("users") },
  async handler(ctx, args) {
    const acknowledgedPolicies = await ctx.db
      .query("policyAcknowledgments")
      .withIndex("by_employee_policy", (q: any) => q.eq("employeeId", args.employeeId))
      .collect();

    const allAttempts = await ctx.db.query("quizAttempts").collect();
    const quizAttempts = allAttempts.filter((qa: any) => qa.employeeId === args.employeeId);

    return { acknowledgedPolicies, quizAttempts };
  },
});

export const generateComplianceReport = mutation({
  args: {
    employeeId: v.id("users"),
    generatedBy: v.id("users"),
  },
  async handler(ctx, args) {
    const acknowledgedPolicies = await ctx.db
      .query("policyAcknowledgments")
      .withIndex("by_employee_policy", (q: any) => q.eq("employeeId", args.employeeId))
      .collect();

    const allAttempts = await ctx.db.query("quizAttempts").collect();
    const quizAttempts = allAttempts.filter((qa: any) => qa.employeeId === args.employeeId);

    const allPolicies = await ctx.db.query("policies").collect();
    const compliancePercentage =
      (acknowledgedPolicies.filter((p: any) => p.acknowledged).length / allPolicies.length) * 100;

    const policies = acknowledgedPolicies.map((ack: any) => ({
      policyId: ack.policyId,
      acknowledged: ack.acknowledged,
      lastAcknowledgedAt: ack.acknowledgedAt,
    }));

    const quizScores = quizAttempts.reduce(
      (acc: any[], attempt: any) => {
        const existing = acc.find((q) => q.quizId === attempt.quizId);
        if (existing) {
          existing.attempts += 1;
          existing.latestScore = attempt.score;
          if (attempt.score > existing.bestScore) {
            existing.bestScore = attempt.score;
          }
        } else {
          acc.push({
            quizId: attempt.quizId,
            attempts: 1,
            bestScore: attempt.score,
            latestScore: attempt.score,
          });
        }
        return acc;
      },
      []
    );

    return await ctx.db.insert("complianceReports", {
      employeeId: args.employeeId,
      generatedAt: Date.now(),
      generatedBy: args.generatedBy,
      policies,
      quizScores,
      overallCompliance: compliancePercentage,
    });
  },
});

export const getComplianceReport = query({
  args: { reportId: v.id("complianceReports") },
  async handler(ctx, args) {
    return await ctx.db.get(args.reportId);
  },
});