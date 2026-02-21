import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function hashPassword(password: string): string {
const salt = "whitelabel-reseller-salt";
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

function getMaxCompaniesByPlan(plan: string): number {
switch (plan) {
case "starter":
return 1;
case "professional":
return 5;
case "enterprise":
return 50;
default:
return 1;
}
}

// Register a new reseller
export const registerReseller = mutation({
args: {
email: v.string(),
password: v.string(),
companyName: v.string(),
contactName: v.string(),
subscriptionPlan: v.union(v.literal("starter"), v.literal("professional"), v.literal("enterprise")),
},
returns: v.id("resellers"),
handler: async (ctx, args) => {
const existing = await ctx.db
.query("resellers")
.withIndex("by_email", (q: any) => q.eq("email", args.email))
.first();

if (existing) {
throw new Error("Email already registered");
}

const passwordHash = hashPassword(args.password);
const now = Date.now();

const resellerId = await ctx.db.insert("resellers", {
email: args.email,
password: passwordHash,
companyName: args.companyName,
contactName: args.contactName,
subscriptionPlan: args.subscriptionPlan,
subscriptionStatus: "trial",
trialEndsAt: now + 30 * 24 * 60 * 60 * 1000, // 30 day trial
subscriptionStartDate: now,
nextBillingDate: now + 30 * 24 * 60 * 60 * 1000,
maxCompanies: getMaxCompaniesByPlan(args.subscriptionPlan),
usedCompanies: 0,
createdAt: now,
updatedAt: now,
});

// Create default branding
await ctx.db.insert("resellerBranding", {
resellerId,
logoUrl: undefined,
primaryColor: "#3B82F6",
secondaryColor: "#8B5CF6",
accentColor: "#F59E0B",
companyName: args.companyName,
brandStatement: undefined,
supportEmail: args.email,
supportPhone: undefined,
websiteUrl: undefined,
customDomain: undefined,
customDomainVerified: false,
createdAt: now,
updatedAt: now,
});

return resellerId;
},
});

// Login reseller
export const loginReseller = query({
args: {
email: v.string(),
password: v.string(),
},
returns: v.optional(v.id("resellers")),
handler: async (ctx, args) => {
const reseller = await ctx.db
.query("resellers")
.withIndex("by_email", (q: any) => q.eq("email", args.email))
.first();

if (!reseller) {
return undefined;
}

const matches = verifyPassword(args.password, reseller.password);
if (!matches) {
return undefined;
}

return reseller._id;
},
});

// Get reseller details
export const getReseller = query({
args: {
resellerId: v.id("resellers"),
},
returns: v.optional(v.object({
_id: v.id("resellers"),
email: v.string(),
companyName: v.string(),
contactName: v.string(),
subscriptionPlan: v.string(),
subscriptionStatus: v.string(),
maxCompanies: v.number(),
usedCompanies: v.number(),
trialEndsAt: v.optional(v.number()),
})),
handler: async (ctx, args) => {
const reseller = await ctx.db.get(args.resellerId);
if (!reseller) return undefined;

return {
_id: reseller._id,
email: reseller.email,
companyName: reseller.companyName,
contactName: reseller.contactName,
subscriptionPlan: reseller.subscriptionPlan,
subscriptionStatus: reseller.subscriptionStatus,
maxCompanies: reseller.maxCompanies,
usedCompanies: reseller.usedCompanies,
trialEndsAt: reseller.trialEndsAt,
};
},
});

// Get reseller branding
export const getResellerBranding = query({
args: {
resellerId: v.id("resellers"),
},
returns: v.optional(v.object({
logoUrl: v.optional(v.string()),
primaryColor: v.string(),
secondaryColor: v.string(),
accentColor: v.string(),
companyName: v.string(),
brandStatement: v.optional(v.string()),
supportEmail: v.optional(v.string()),
supportPhone: v.optional(v.string()),
websiteUrl: v.optional(v.string()),
customDomain: v.optional(v.string()),
})),
handler: async (ctx, args) => {
const branding = await ctx.db
.query("resellerBranding")
.withIndex("by_reseller", (q: any) => q.eq("resellerId", args.resellerId))
.first();

if (!branding) return undefined;

return {
logoUrl: branding.logoUrl,
primaryColor: branding.primaryColor,
secondaryColor: branding.secondaryColor,
accentColor: branding.accentColor,
companyName: branding.companyName,
brandStatement: branding.brandStatement,
supportEmail: branding.supportEmail,
supportPhone: branding.supportPhone,
websiteUrl: branding.websiteUrl,
customDomain: branding.customDomain,
};
},
});

// Update reseller branding
export const updateResellerBranding = mutation({
args: {
resellerId: v.id("resellers"),
logoUrl: v.optional(v.string()),
primaryColor: v.optional(v.string()),
secondaryColor: v.optional(v.string()),
accentColor: v.optional(v.string()),
companyName: v.optional(v.string()),
brandStatement: v.optional(v.string()),
supportEmail: v.optional(v.string()),
supportPhone: v.optional(v.string()),
websiteUrl: v.optional(v.string()),
},
returns: v.null(),
handler: async (ctx, args) => {
const branding = await ctx.db
.query("resellerBranding")
.withIndex("by_reseller", (q: any) => q.eq("resellerId", args.resellerId))
.first();

if (!branding) {
throw new Error("Branding not found");
}

const updates: any = { updatedAt: Date.now() };
if (args.logoUrl !== undefined) updates.logoUrl = args.logoUrl;
if (args.primaryColor) updates.primaryColor = args.primaryColor;
if (args.secondaryColor) updates.secondaryColor = args.secondaryColor;
if (args.accentColor) updates.accentColor = args.accentColor;
if (args.companyName) updates.companyName = args.companyName;
if (args.brandStatement !== undefined) updates.brandStatement = args.brandStatement;
if (args.supportEmail) updates.supportEmail = args.supportEmail;
if (args.supportPhone) updates.supportPhone = args.supportPhone;
if (args.websiteUrl) updates.websiteUrl = args.websiteUrl;

await ctx.db.patch(branding._id, updates);
return null;
},
});

// Get all companies for a reseller
export const getResellerCompanies = query({
args: {
resellerId: v.id("resellers"),
},
returns: v.array(v.id("companies")),
handler: async (ctx, args) => {
const links = await ctx.db
.query("resellerCompanies")
.withIndex("by_reseller", (q: any) => q.eq("resellerId", args.resellerId))
.collect();

return links.map((link: any) => link.companyId);
},
});

// Get usage metrics for current month
export const getCurrentMonthUsage = query({
args: {
resellerId: v.id("resellers"),
},
returns: v.optional(v.object({
employeesCreated: v.number(),
policiesUploaded: v.number(),
quizzesCreated: v.number(),
apiCallsUsed: v.number(),
storageUsedMB: v.number(),
})),
handler: async (ctx, args) => {
const now = new Date();
const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

const metrics = await ctx.db
.query("usageMetrics")
.withIndex("by_reseller_month", (q: any) => q.eq("resellerId", args.resellerId).eq("month", month))
.first();

return metrics
? {
employeesCreated: metrics.employeesCreated,
policiesUploaded: metrics.policiesUploaded,
quizzesCreated: metrics.quizzesCreated,
apiCallsUsed: metrics.apiCallsUsed,
storageUsedMB: metrics.storageUsedMB,
}
: undefined;
},
});

// Get payment history
export const getResellerPaymentHistory = query({
args: {
resellerId: v.id("resellers"),
},
returns: v.array(v.object({
_id: v.id("resellerPayments"),
amount: v.number(),
currency: v.string(),
status: v.string(),
billingPeriodStart: v.number(),
billingPeriodEnd: v.number(),
createdAt: v.number(),
})),
handler: async (ctx, args) => {
const payments = await ctx.db
.query("resellerPayments")
.withIndex("by_reseller", (q: any) => q.eq("resellerId", args.resellerId))
.collect();

return payments.map((p: any) => ({
_id: p._id,
amount: p.amount,
currency: p.currency,
status: p.status,
billingPeriodStart: p.billingPeriodStart,
billingPeriodEnd: p.billingPeriodEnd,
createdAt: p.createdAt,
}));
},
});
