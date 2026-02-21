import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Simple password hashing
function hashPassword(password: string): string {
  const salt = "policy-training-salt";
  const combined = password + salt;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Generate random invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Admin signup (website owner - no company)
export const signUpAdmin = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    role: v.literal("admin"),
  }),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("User already exists");
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: hashPassword(args.password),
      fullName: args.fullName,
      role: "admin",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { userId, email: args.email, role: "admin" as const };
  },
});

// Manager signup with company creation
export const signUpManager = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
    companyName: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    role: v.literal("manager"),
    companyId: v.id("companies"),
  }),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("User already exists");
    }

    const hashedPassword = hashPassword(args.password);
    
    // Create user first
    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: hashedPassword,
      fullName: args.fullName,
      role: "manager",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create company with 14-day trial
    const trialEndsAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
    const companyId = await ctx.db.insert("companies", {
      name: args.companyName,
      managerId: userId,
      subscriptionStatus: "trial",
      trialEndsAt,
      employeeCount: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update user with companyId
    await ctx.db.patch(userId, { companyId });

    return { userId, email: args.email, role: "manager" as const, companyId };
  },
});

// Employee signup with invite code
export const signUpEmployee = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
    inviteCode: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    role: v.literal("employee"),
    companyId: v.id("companies"),
  }),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("User already exists");
    }

    // Find invite code
    const invite = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", args.inviteCode.toUpperCase()))
      .first();

    if (!invite) {
      throw new Error("Invalid invite code");
    }

    if (invite.isUsed) {
      throw new Error("Invite code already used");
    }

    if (invite.expiresAt < Date.now()) {
      throw new Error("Invite code expired");
    }

    // Check company status
    const company = await ctx.db.get(invite.companyId);
    if (!company || company.subscriptionStatus === "expired" || company.subscriptionStatus === "cancelled") {
      throw new Error("Company subscription is not active");
    }

    const hashedPassword = hashPassword(args.password);
    const groupIds = invite.groupId ? [invite.groupId] : [];

    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: hashedPassword,
      fullName: args.fullName,
      role: "employee",
      companyId: invite.companyId,
      groupIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mark invite as used
    await ctx.db.patch(invite._id, { isUsed: true, usedBy: userId });

    // Increment employee count
    await ctx.db.patch(invite.companyId, { 
      employeeCount: company.employeeCount + 1,
      updatedAt: Date.now(),
    });

    return { userId, email: args.email, role: "employee" as const, companyId: invite.companyId };
  },
});

// Legacy signup for backwards compatibility
export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("employee")),
    companyName: v.optional(v.string()),
    inviteCode: v.optional(v.string()),
  },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("employee")),
    companyId: v.optional(v.id("companies")),
    fullName: v.string(),
  }),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("User already exists");
    }

    const hashedPassword = hashPassword(args.password);

    if (args.role === "admin") {
      const userId = await ctx.db.insert("users", {
        email: args.email,
        password: hashedPassword,
        fullName: args.fullName,
        role: "admin",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { userId, email: args.email, role: args.role, fullName: args.fullName };
    }

    if (args.role === "manager") {
      if (!args.companyName) {
        throw new Error("Company name required for manager");
      }
      
      const userId = await ctx.db.insert("users", {
        email: args.email,
        password: hashedPassword,
        fullName: args.fullName,
        role: "manager",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const trialEndsAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
      const companyId = await ctx.db.insert("companies", {
        name: args.companyName,
        managerId: userId,
        subscriptionStatus: "trial",
        trialEndsAt,
        employeeCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.patch(userId, { companyId });
      return { userId, email: args.email, role: args.role, companyId, fullName: args.fullName };
    }

    // Employee
    if (!args.inviteCode) {
      throw new Error("Invite code required for employee");
    }

    const invite = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", args.inviteCode.toUpperCase()))
      .first();

    if (!invite || invite.isUsed || invite.expiresAt < Date.now()) {
      throw new Error("Invalid or expired invite code");
    }

    const company = await ctx.db.get(invite.companyId);
    if (!company || company.subscriptionStatus === "expired" || company.subscriptionStatus === "cancelled") {
      throw new Error("Company subscription is not active");
    }

    const groupIds = invite.groupId ? [invite.groupId] : [];
    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: hashedPassword,
      fullName: args.fullName,
      role: "employee",
      companyId: invite.companyId,
      groupIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(invite._id, { isUsed: true, usedBy: userId });
    await ctx.db.patch(invite.companyId, { 
      employeeCount: company.employeeCount + 1,
      updatedAt: Date.now(),
    });

    return { userId, email: args.email, role: args.role, companyId: invite.companyId, fullName: args.fullName };
  },
});

// Create a company for an existing manager (recovery for old accounts)
export const createCompanyForManager = mutation({
  args: {
    managerId: v.id("users"),
    companyName: v.string(),
  },
  returns: v.object({
    companyId: v.id("companies"),
  }),
  async handler(ctx, args) {
    const manager = await ctx.db.get(args.managerId);
    if (!manager) throw new Error("Manager not found");
    if (manager.role !== "manager") throw new Error("Only managers can create a company");

    if (manager.companyId) {
      return { companyId: manager.companyId };
    }

    const trialEndsAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
    const companyId = await ctx.db.insert("companies", {
      name: args.companyName,
      managerId: manager._id,
      subscriptionStatus: "trial",
      trialEndsAt,
      employeeCount: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(manager._id, { companyId, updatedAt: Date.now() });

    return { companyId };
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("employee")),
    companyId: v.optional(v.id("companies")),
    companyName: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
  }),
  async handler(ctx, args) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user || !verifyPassword(args.password, user.password)) {
      throw new Error("Invalid email or password");
    }

    let companyName: string | undefined;
    let subscriptionStatus: string | undefined;

    if (user.companyId) {
      const company = await ctx.db.get(user.companyId);
      if (company) {
        companyName = company.name;
        subscriptionStatus = company.subscriptionStatus;

        // Check if subscription expired
        if (company.subscriptionStatus === "trial" && company.trialEndsAt && company.trialEndsAt < Date.now()) {
          await ctx.db.patch(company._id, { subscriptionStatus: "expired" });
          subscriptionStatus = "expired";
        }
        if (company.subscriptionStatus === "active" && company.paymentDueDate && company.paymentDueDate < Date.now()) {
          await ctx.db.patch(company._id, { subscriptionStatus: "expired" });
          subscriptionStatus = "expired";
        }
      }
    }

    return {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      companyId: user.companyId,
      companyName,
      subscriptionStatus,
    };
  },
});

export const getCurrentUser = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      userId: v.id("users"),
      email: v.string(),
      fullName: v.string(),
      role: v.union(v.literal("admin"), v.literal("manager"), v.literal("employee")),
      companyId: v.optional(v.id("companies")),
      companyName: v.optional(v.string()),
    }),
    v.null()
  ),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    let companyName: string | undefined;
    if (user.companyId) {
      const company = await ctx.db.get(user.companyId);
      companyName = company?.name;
    }

    return {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      companyId: user.companyId,
      companyName,
    };
  },
});

// Generate invite code for employees
export const createInviteCode = mutation({
  args: {
    companyId: v.id("companies"),
    createdBy: v.id("users"),
    groupId: v.optional(v.id("employeeGroups")),
  },
  returns: v.object({
    code: v.string(),
    expiresAt: v.number(),
  }),
  async handler(ctx, args) {
    const code = generateInviteCode();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("inviteCodes", {
      code,
      companyId: args.companyId,
      createdBy: args.createdBy,
      groupId: args.groupId,
      isUsed: false,
      expiresAt,
      createdAt: Date.now(),
    });

    return { code, expiresAt };
  },
});

// Get all companies (for admin)
export const getAllCompanies = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("companies"),
    name: v.string(),
    managerName: v.string(),
    managerEmail: v.string(),
    subscriptionStatus: v.string(),
    employeeCount: v.number(),
    paymentDueDate: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    createdAt: v.number(),
  })),
  async handler(ctx) {
    const companies = await ctx.db.query("companies").collect();
    
    const result = [];
    for (const company of companies) {
      const manager = await ctx.db.get(company.managerId);
      result.push({
        _id: company._id,
        name: company.name,
        managerName: manager?.fullName || "Unknown",
        managerEmail: manager?.email || "Unknown",
        subscriptionStatus: company.subscriptionStatus,
        employeeCount: company.employeeCount,
        paymentDueDate: company.paymentDueDate,
        trialEndsAt: company.trialEndsAt,
        createdAt: company.createdAt,
      });
    }
    
    return result;
  },
});

// Get company employees (for manager)
export const getCompanyEmployees = query({
  args: { companyId: v.id("companies") },
  returns: v.array(v.object({
    _id: v.id("users"),
    fullName: v.string(),
    email: v.string(),
    groupIds: v.optional(v.array(v.id("employeeGroups"))),
    createdAt: v.number(),
  })),
  async handler(ctx, args) {
    const employees = await ctx.db
      .query("users")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    
    return employees
      .filter(e => e.role === "employee")
      .map(e => ({
        _id: e._id,
        fullName: e.fullName,
        email: e.email,
        groupIds: e.groupIds,
        createdAt: e.createdAt,
      }));
  },
});

// Create employee group
export const createEmployeeGroup = mutation({
  args: {
    name: v.string(),
    companyId: v.id("companies"),
    createdBy: v.id("users"),
    description: v.optional(v.string()),
  },
  returns: v.id("employeeGroups"),
  async handler(ctx, args) {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const existingGroups = await ctx.db
      .query("employeeGroups")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    // Default max groups
    let maxGroups = 3;

    // Prefer planRef limits
    if (company.planRef === "starter") maxGroups = 3;
    if (company.planRef === "pro") maxGroups = 10;
    if (company.planRef === "enterprise") maxGroups = 50;

    // Backwards-compat: packageId-based limits
    if (company.packageId) {
      const pkg = await ctx.db.get(company.packageId);
      if (pkg) maxGroups = pkg.maxGroups;
    }

    if (existingGroups.length >= maxGroups) {
      throw new Error(`Maximum ${maxGroups} groups allowed. Please upgrade your package.`);
    }

    return await ctx.db.insert("employeeGroups", {
      name: args.name,
      companyId: args.companyId,
      description: args.description,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
  },
});

// Get company groups
export const getCompanyGroups = query({
  args: { companyId: v.id("companies") },
  returns: v.array(v.object({
    _id: v.id("employeeGroups"),
    name: v.string(),
    description: v.optional(v.string()),
    memberCount: v.number(),
  })),
  async handler(ctx, args) {
    const groups = await ctx.db
      .query("employeeGroups")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const employees = await ctx.db
      .query("users")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    return groups.map(g => ({
      _id: g._id,
      name: g.name,
      description: g.description,
      memberCount: employees.filter(e => e.groupIds?.includes(g._id)).length,
    }));
  },
});

// Add employee to group
export const addEmployeeToGroup = mutation({
  args: {
    employeeId: v.id("users"),
    groupId: v.id("employeeGroups"),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) throw new Error("Employee not found");

    const currentGroups = employee.groupIds || [];
    if (!currentGroups.includes(args.groupId)) {
      await ctx.db.patch(args.employeeId, {
        groupIds: [...currentGroups, args.groupId],
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

// Get active invite codes for company
export const getCompanyInviteCodes = query({
  args: { companyId: v.id("companies") },
  returns: v.array(v.object({
    _id: v.id("inviteCodes"),
    code: v.string(),
    isUsed: v.boolean(),
    expiresAt: v.number(),
    groupId: v.optional(v.id("employeeGroups")),
  })),
  async handler(ctx, args) {
    const codes = await ctx.db
      .query("inviteCodes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    return codes
      .filter(c => !c.isUsed && c.expiresAt > Date.now())
      .map(c => ({
        _id: c._id,
        code: c.code,
        isUsed: c.isUsed,
        expiresAt: c.expiresAt,
        groupId: c.groupId,
      }));
  },
});

export const setCompanyPlanFromPurchase = mutation({
  args: {
    companyId: v.id("companies"),
    purchasedPackageId: v.string(),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const id = args.purchasedPackageId.toLowerCase();
    let planRef: "starter" | "pro" | "enterprise" = "starter";
    if (id.includes("enterprise")) planRef = "enterprise";
    else if (id.includes("pro")) planRef = "pro";

    await ctx.db.patch(company._id, {
      planRef,
      subscriptionStatus: "active",
      lastPaymentDate: Date.now(),
      paymentDueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Join company with invite code (for existing employees without a company)
export const joinCompanyWithCode = mutation({
  args: {
    userId: v.id("users"),
    inviteCode: v.string(),
  },
  returns: v.object({
    companyId: v.id("companies"),
    companyName: v.string(),
  }),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    if (user.companyId) {
      const company = await ctx.db.get(user.companyId);
      throw new Error(`You are already part of ${company?.name || "a company"}`);
    }

    // Find invite code
    const invite = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", args.inviteCode.toUpperCase()))
      .first();

    if (!invite) throw new Error("Invalid invite code");
    if (invite.isUsed) throw new Error("Invite code already used");
    if (invite.expiresAt < Date.now()) throw new Error("Invite code expired");

    const company = await ctx.db.get(invite.companyId);
    if (!company || company.subscriptionStatus === "expired" || company.subscriptionStatus === "cancelled") {
      throw new Error("Company subscription is not active");
    }

    const groupIds = invite.groupId ? [invite.groupId] : [];

    await ctx.db.patch(args.userId, {
      companyId: invite.companyId,
      groupIds,
      role: "employee",
      updatedAt: Date.now(),
    });

    // Mark invite as used
    await ctx.db.patch(invite._id, { isUsed: true, usedBy: args.userId });

    // Increment employee count
    await ctx.db.patch(invite.companyId, {
      employeeCount: company.employeeCount + 1,
      updatedAt: Date.now(),
    });

    return { companyId: invite.companyId, companyName: company.name };
  },
});

export default {
  signUp,
  signIn,
  getCurrentUser,
};