import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// Submit a support message (from any user)
export const submitMessage = mutation({
  args: {
    userId: v.id("users"),
    subject: v.string(),
    message: v.string(),
  },
  returns: v.id("supportMessages"),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    return await ctx.db.insert("supportMessages", {
      userId: args.userId,
      userName: user.fullName,
      userEmail: user.email,
      subject: args.subject,
      message: args.message,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

// List all support messages (admin only)
export const listMessages = query({
  args: {
    status: v.optional(v.union(v.literal("open"), v.literal("replied"), v.literal("closed"))),
  },
  returns: v.array(
    v.object({
      _id: v.id("supportMessages"),
      _creationTime: v.number(),
      userId: v.id("users"),
      userName: v.string(),
      userEmail: v.string(),
      subject: v.string(),
      message: v.string(),
      status: v.union(v.literal("open"), v.literal("replied"), v.literal("closed")),
      adminReply: v.optional(v.string()),
      repliedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    let messages;
    if (args.status) {
      const statusFilter = args.status;
      messages = await ctx.db
        .query("supportMessages")
        .withIndex("by_status", (q: any) => q.eq("status", statusFilter))
        .order("desc")
        .collect();
    } else {
      messages = await ctx.db
        .query("supportMessages")
        .order("desc")
        .collect();
    }
    return messages.map((m: Doc<"supportMessages">) => ({
      _id: m._id,
      _creationTime: m._creationTime,
      userId: m.userId,
      userName: m.userName,
      userEmail: m.userEmail,
      subject: m.subject,
      message: m.message,
      status: m.status,
      adminReply: m.adminReply,
      repliedAt: m.repliedAt,
      createdAt: m.createdAt,
    }));
  },
});

// Reply to a support message (admin only)
export const replyToMessage = mutation({
  args: {
    messageId: v.id("supportMessages"),
    reply: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Message not found");
    await ctx.db.patch(args.messageId, {
      adminReply: args.reply,
      status: "replied",
      repliedAt: Date.now(),
    });
    return null;
  },
});

// Close a support message (admin only)
export const closeMessage = mutation({
  args: {
    messageId: v.id("supportMessages"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Message not found");
    await ctx.db.patch(args.messageId, { status: "closed" });
    return null;
  },
});

// Get user's own support messages
export const getMyMessages = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("supportMessages"),
      _creationTime: v.number(),
      subject: v.string(),
      message: v.string(),
      status: v.union(v.literal("open"), v.literal("replied"), v.literal("closed")),
      adminReply: v.optional(v.string()),
      repliedAt: v.optional(v.number()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("supportMessages")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return messages.map((m: Doc<"supportMessages">) => ({
      _id: m._id,
      _creationTime: m._creationTime,
      subject: m.subject,
      message: m.message,
      status: m.status,
      adminReply: m.adminReply,
      repliedAt: m.repliedAt,
      createdAt: m.createdAt,
    }));
  },
});