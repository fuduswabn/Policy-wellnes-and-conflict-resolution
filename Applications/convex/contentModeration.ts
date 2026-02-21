import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Flag content for review
export const flagContent = mutation({
args: {
companyId: v.id("companies"),
contentType: v.union(v.literal("policy"), v.literal("chat"), v.literal("user_content")),
contentId: v.string(),
reason: v.string(),
severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
violationType: v.string(),
},
returns: v.id("contentFlags"),
async handler(ctx, args) {
return await ctx.db.insert("contentFlags", {
companyId: args.companyId,
contentType: args.contentType,
contentId: args.contentId,
reason: args.reason,
severity: args.severity,
violationType: args.violationType,
status: "pending",
flaggedAt: Date.now(),
resolvedAt: null,
});
},
});

// Get flagged content for admin review
export const getFlaggedContent = query({
args: { status: v.optional(v.string()) },
returns: v.array(v.object({
_id: v.id("contentFlags"),
companyId: v.id("companies"),
companyName: v.string(),
contentType: v.string(),
reason: v.string(),
severity: v.string(),
violationType: v.string(),
flaggedAt: v.number(),
status: v.string(),
})),
async handler(ctx, args) {
const flags = await ctx.db
.query("contentFlags")
.collect();

const filtered = args.status 
? flags.filter(f => f.status === args.status)
: flags.filter(f => f.status === "pending");

const result = [];
for (const flag of filtered.sort((a, b) => b.flaggedAt - a.flaggedAt)) {
const company = await ctx.db.get(flag.companyId);
result.push({
_id: flag._id,
companyId: flag.companyId,
companyName: company?.name || "Unknown",
contentType: flag.contentType,
reason: flag.reason,
severity: flag.severity,
violationType: flag.violationType,
flaggedAt: flag.flaggedAt,
status: flag.status,
});
}
return result;
},
});

// Resolve flagged content
export const resolveFlag = mutation({
args: {
flagId: v.id("contentFlags"),
action: v.union(v.literal("dismiss"), v.literal("warn"), v.literal("suspend"), v.literal("ban")),
notes: v.optional(v.string()),
},
returns: v.null(),
async handler(ctx, args) {
const flag = await ctx.db.get(args.flagId);
if (!flag) throw new Error("Flag not found");

await ctx.db.patch(args.flagId, {
status: args.action === "dismiss" ? "dismissed" : "resolved",
resolvedAt: Date.now(),
});

// Take action on company if needed
if (args.action === "ban") {
const company = await ctx.db.get(flag.companyId);
if (company) {
await ctx.db.patch(flag.companyId, {
subscriptionStatus: "cancelled",
updatedAt: Date.now(),
});

// Log the action
await ctx.db.insert("moderationLog", {
companyId: flag.companyId,
action: "banned",
reason: args.notes || flag.reason,
timestamp: Date.now(),
});
}
} else if (args.action === "suspend") {
const company = await ctx.db.get(flag.companyId);
if (company) {
await ctx.db.patch(flag.companyId, {
subscriptionStatus: "expired",
updatedAt: Date.now(),
});
}
}

return null;
},
});

// Check content for violations
export const checkContentForViolations = mutation({
args: {
content: v.string(),
companyId: v.id("companies"),
contentType: v.union(v.literal("policy"), v.literal("chat")),
contentId: v.string(),
},
returns: v.object({
hasViolations: v.boolean(),
violations: v.array(v.string()),
severity: v.union(v.literal("none"), v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
}),
async handler(ctx, args) {
const violations: string[] = [];
let severity: "none" | "low" | "medium" | "high" | "critical" = "none";

// Check for profanity and explicit content (simplified - in production use AI API)
const explicitPatterns = [
/nude/i,
/porn/i,
/sex/i,
/adult/i,
/xxx/i,
];

for (const pattern of explicitPatterns) {
if (pattern.test(args.content)) {
violations.push("Adult or explicit content detected");
severity = "critical";
break;
}
}

// Check for hate speech patterns
const hateSpeechPatterns = [
/hate/i,
/kill/i,
/death/i,
/attack/i,
];

if (violations.length === 0) {
for (const pattern of hateSpeechPatterns) {
if (pattern.test(args.content)) {
violations.push("Potential hate speech or harmful content");
severity = "high";
break;
}
}
}

// Flag if violations found
if (violations.length > 0) {
await ctx.db.insert("contentFlags", {
companyId: args.companyId,
contentType: args.contentType,
contentId: args.contentId,
reason: violations.join(", "),
severity,
violationType: violations[0],
status: "pending",
flaggedAt: Date.now(),
resolvedAt: null,
});
}

return {
hasViolations: violations.length > 0,
violations,
severity,
};
},
});
