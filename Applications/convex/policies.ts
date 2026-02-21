import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const uploadPolicy = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("docx"), v.literal("txt")),
    fileUrl: v.string(),
    companyId: v.id("companies"),
    uploadedBy: v.id("users"),
    policyType: v.union(v.literal("general"), v.literal("group")),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
  },
  returns: v.id("policies"),
  async handler(ctx, args) {
    const policyId = await ctx.db.insert("policies", {
      title: args.title,
      description: args.description,
      content: args.content,
      fileType: args.fileType,
      fileUrl: args.fileUrl,
      companyId: args.companyId,
      uploadedBy: args.uploadedBy,
      policyType: args.policyType,
      targetGroupIds: args.targetGroupIds,
      version: 1,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Chunk the policy for AI processing
    const chunkSize = 500;
    const chunks = [];
    for (let i = 0; i < args.content.length; i += chunkSize) {
      chunks.push(args.content.substring(i, i + chunkSize));
    }

    for (let i = 0; i < chunks.length; i++) {
      await ctx.db.insert("policyChunks", {
        policyId,
        chunkIndex: i,
        content: chunks[i],
        createdAt: Date.now(),
      });
    }

    // Create acknowledgment records for relevant employees
    const employees = await ctx.db
      .query("users")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    for (const employee of employees) {
      if (employee.role !== "employee") continue;
      
      // For group policies, only create for employees in target groups
      if (args.policyType === "group" && args.targetGroupIds) {
        const employeeGroups = employee.groupIds || [];
        const isInGroup = args.targetGroupIds.some((gId: any) => employeeGroups.includes(gId));
        if (!isInGroup) continue;
      }

      await ctx.db.insert("policyAcknowledgments", {
        employeeId: employee._id,
        policyId,
        acknowledged: false,
        requiresRetake: false,
      });
    }

    return policyId;
  },
});

export const listCompanyPolicies = query({
  args: { companyId: v.id("companies") },
  returns: v.array(v.object({
    _id: v.id("policies"),
    title: v.string(),
    description: v.optional(v.string()),
    policyType: v.string(),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    version: v.number(),
    createdAt: v.number(),
    isActive: v.boolean(),
  })),
  async handler(ctx, args) {
    const policies = await ctx.db
      .query("policies")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    return policies.map(p => ({
      _id: p._id,
      title: p.title,
      description: p.description,
      policyType: p.policyType,
      targetGroupIds: p.targetGroupIds,
      version: p.version,
      createdAt: p.createdAt,
      isActive: p.isActive,
    }));
  },
});

export const listActivePolicies = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("policies"),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    fileType: v.string(),
    fileUrl: v.string(),
    companyId: v.id("companies"),
    policyType: v.string(),
    version: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  async handler(ctx) {
    const policies = await ctx.db
      .query("policies")
      .withIndex("by_active", (q: any) => q.eq("isActive", true))
      .collect();
    return policies.map(p => ({
      _id: p._id,
      title: p.title,
      description: p.description,
      content: p.content,
      fileType: p.fileType,
      fileUrl: p.fileUrl,
      companyId: p.companyId,
      policyType: p.policyType,
      version: p.version,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  },
});

export const getPolicyById = query({
  args: { policyId: v.id("policies") },
  returns: v.union(
    v.object({
      _id: v.id("policies"),
      title: v.string(),
      description: v.optional(v.string()),
      content: v.string(),
      fileType: v.string(),
      fileUrl: v.string(),
      policyType: v.string(),
      targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
      version: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  async handler(ctx, args) {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) return null;
    return {
      _id: policy._id,
      title: policy.title,
      description: policy.description,
      content: policy.content,
      fileType: policy.fileType,
      fileUrl: policy.fileUrl,
      policyType: policy.policyType,
      targetGroupIds: policy.targetGroupIds,
      version: policy.version,
      isActive: policy.isActive,
      createdAt: policy.createdAt,
    };
  },
});

export const getPolicyChunks = query({
  args: { policyId: v.id("policies") },
  returns: v.array(v.object({
    _id: v.id("policyChunks"),
    chunkIndex: v.number(),
    content: v.string(),
  })),
  async handler(ctx, args) {
    const chunks = await ctx.db
      .query("policyChunks")
      .withIndex("by_policy", (q: any) => q.eq("policyId", args.policyId))
      .collect();
    return chunks.map(c => ({
      _id: c._id,
      chunkIndex: c.chunkIndex,
      content: c.content,
    }));
  },
});

export const deactivatePolicy = mutation({
  args: { policyId: v.id("policies") },
  returns: v.null(),
  async handler(ctx, args) {
    await ctx.db.patch(args.policyId, { isActive: false, updatedAt: Date.now() });
    return null;
  },
});

// Get employee's policies with acknowledgment status
export const getEmployeePolicies = query({
  args: { 
    employeeId: v.id("users"),
    companyId: v.id("companies"),
  },
  returns: v.array(v.object({
    _id: v.id("policies"),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    policyType: v.string(),
    version: v.number(),
    acknowledged: v.boolean(),
    acknowledgedAt: v.optional(v.number()),
  })),
  async handler(ctx, args) {
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) return [];

    const policies = await ctx.db
      .query("policies")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const activePolicies = policies.filter(p => {
      if (!p.isActive) return false;
      
      // General policies are for everyone
      if (p.policyType === "general") return true;
      
      // Group policies only for members
      if (p.policyType === "group" && p.targetGroupIds) {
        const employeeGroups = employee.groupIds || [];
        return p.targetGroupIds.some((gId: any) => employeeGroups.includes(gId));
      }
      
      return false;
    });

    const result = [];
    for (const policy of activePolicies) {
      const ack = await ctx.db
        .query("policyAcknowledgments")
        .withIndex("by_employee_policy", (q: any) => 
          q.eq("employeeId", args.employeeId).eq("policyId", policy._id)
        )
        .first();

      result.push({
        _id: policy._id,
        title: policy.title,
        description: policy.description,
        content: policy.content,
        policyType: policy.policyType,
        version: policy.version,
        acknowledged: ack?.acknowledged || false,
        acknowledgedAt: ack?.acknowledgedAt,
      });
    }

    return result;
  },
});

// Acknowledge a policy
export const acknowledgePolicy = mutation({
  args: {
    employeeId: v.id("users"),
    policyId: v.id("policies"),
  },
  returns: v.object({
    success: v.boolean(),
    acknowledgedAt: v.number(),
  }),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("policyAcknowledgments")
      .withIndex("by_employee_policy", (q: any) => 
        q.eq("employeeId", args.employeeId).eq("policyId", args.policyId)
      )
      .first();

    const acknowledgedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        acknowledged: true,
        acknowledgedAt,
        requiresRetake: false,
      });
    } else {
      await ctx.db.insert("policyAcknowledgments", {
        employeeId: args.employeeId,
        policyId: args.policyId,
        acknowledged: true,
        acknowledgedAt,
        requiresRetake: false,
      });
    }

    return { success: true, acknowledgedAt };
  },
});

// Alias for uploadPolicy to match common usage
export const createPolicy = uploadPolicy;

// Get acknowledgment stats for a company
export const getCompanyAcknowledgmentStats = query({
  args: { companyId: v.id("companies") },
  returns: v.object({
    totalPolicies: v.number(),
    totalEmployees: v.number(),
    acknowledgedCount: v.number(),
    pendingCount: v.number(),
    complianceRate: v.number(),
  }),
  async handler(ctx, args) {
    const policies = await ctx.db
      .query("policies")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();
    const activePolicies = policies.filter(p => p.isActive);

    const employees = await ctx.db
      .query("users")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();
    const employeeList = employees.filter(e => e.role === "employee");

    let acknowledgedCount = 0;
    let totalRequired = 0;

    for (const employee of employeeList) {
      for (const policy of activePolicies) {
        // Check if this employee should acknowledge this policy
        if (policy.policyType === "group" && policy.targetGroupIds) {
          const employeeGroups = employee.groupIds || [];
          const isInGroup = policy.targetGroupIds.some((gId: any) => employeeGroups.includes(gId));
          if (!isInGroup) continue;
        }
        
        totalRequired++;
        
        const ack = await ctx.db
          .query("policyAcknowledgments")
          .withIndex("by_employee_policy", (q: any) => 
            q.eq("employeeId", employee._id).eq("policyId", policy._id)
          )
          .first();
        if (ack?.acknowledged) {
          acknowledgedCount++;
        }
      }
    }

    return {
      totalPolicies: activePolicies.length,
      totalEmployees: employeeList.length,
      acknowledgedCount,
      pendingCount: totalRequired - acknowledgedCount,
      complianceRate: totalRequired > 0 ? Math.round((acknowledgedCount / totalRequired) * 100) : 100,
    };
  },
});