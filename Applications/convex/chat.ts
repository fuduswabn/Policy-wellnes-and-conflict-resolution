import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Send a message (employee to manager, or manager to admin)
// Also stores recipient email for offline notification
export const sendMessage = mutation({
  args: {
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    companyId: v.id("companies"),
    message: v.string(),
  },
  returns: v.object({
    messageId: v.id("directMessages"),
    recipientEmail: v.string(),
    recipientName: v.string(),
    senderName: v.string(),
  }),
  async handler(ctx, args) {
    const sender = await ctx.db.get(args.fromUserId);
    const recipient = await ctx.db.get(args.toUserId);
    
    const messageId = await ctx.db.insert("directMessages", {
      fromUserId: args.fromUserId,
      toUserId: args.toUserId,
      companyId: args.companyId,
      message: args.message,
      isRead: false,
      createdAt: Date.now(),
    });

    return {
      messageId,
      recipientEmail: recipient?.email || "",
      recipientName: recipient?.fullName || "Unknown",
      senderName: sender?.fullName || "Unknown",
    };
  },
});

// Get conversation between two users
export const getConversation = query({
  args: { 
    userId1: v.id("users"),
    userId2: v.id("users"),
    companyId: v.id("companies"),
  },
  returns: v.array(v.object({
    _id: v.id("directMessages"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    message: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
    senderName: v.string(),
  })),
  async handler(ctx, args) {
    const messages = await ctx.db
      .query("directMessages")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const conversation = messages.filter(m => 
      (m.fromUserId === args.userId1 && m.toUserId === args.userId2) ||
      (m.fromUserId === args.userId2 && m.toUserId === args.userId1)
    );

    const result = [];
    for (const msg of conversation) {
      const sender = await ctx.db.get(msg.fromUserId);
      result.push({
        _id: msg._id,
        fromUserId: msg.fromUserId,
        toUserId: msg.toUserId,
        message: msg.message,
        isRead: msg.isRead,
        createdAt: msg.createdAt,
        senderName: sender?.fullName || "Unknown",
      });
    }

    return result.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Get company manager for employee to message
export const getCompanyManager = query({
  args: { companyId: v.id("companies") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      fullName: v.string(),
      email: v.string(),
    }),
    v.null()
  ),
  async handler(ctx, args) {
    const company = await ctx.db.get(args.companyId);
    if (!company) return null;
    
    const manager = await ctx.db.get(company.managerId);
    if (!manager) return null;
    
    return {
      _id: manager._id,
      fullName: manager.fullName,
      email: manager.email,
    };
  },
});

// Get all admins for manager to message
export const getAdminsForManager = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("users"),
    fullName: v.string(),
    email: v.string(),
  })),
  async handler(ctx) {
    const admins = await ctx.db
      .query("users")
      .withIndex("by_email")
      .collect();

    return admins
      .filter(u => u.role === "admin")
      .map(u => ({
        _id: u._id,
        fullName: u.fullName,
        email: u.email,
      }));
  },
});

// Get company employees for manager
export const getMyEmployees = query({
  args: { companyId: v.id("companies") },
  returns: v.array(v.object({
    _id: v.id("users"),
    fullName: v.string(),
    email: v.string(),
    hasUnread: v.boolean(),
  })),
  async handler(ctx, args) {
    const company = await ctx.db.get(args.companyId);
    if (!company) return [];
    
    const employees = await ctx.db
      .query("users")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const result = [];
    for (const emp of employees.filter(e => e.role === "employee")) {
      const messages = await ctx.db
        .query("directMessages")
        .withIndex("by_to_user", (q: any) => q.eq("toUserId", company.managerId))
        .collect();
      
      const hasUnread = messages.some(m => m.fromUserId === emp._id && !m.isRead);
      
      result.push({
        _id: emp._id,
        fullName: emp.fullName,
        email: emp.email,
        hasUnread,
      });
    }
    
    return result;
  },
});

// Get all managers for admin to message
export const getManagersForAdmin = query({
  args: {},
  returns: v.array(v.object({
    companyId: v.id("companies"),
    companyName: v.string(),
    manager: v.object({
      _id: v.id("users"),
      fullName: v.string(),
      email: v.string(),
      hasUnread: v.boolean(),
    }),
  })),
  async handler(ctx) {
    const companies = await ctx.db.query("companies").collect();
    const result = [];

    for (const company of companies) {
      const manager = await ctx.db.get(company.managerId);
      if (!manager) continue;

      const admins = await ctx.db
        .query("users")
        .withIndex("by_email")
        .collect();
      
      const adminIds = admins.filter(a => a.role === "admin").map(a => a._id);
      
      let hasUnread = false;
      for (const adminId of adminIds) {
        const messages = await ctx.db
          .query("directMessages")
          .withIndex("by_to_user", (q: any) => q.eq("toUserId", adminId))
          .collect();
        
        if (messages.some(m => m.fromUserId === manager._id && !m.isRead)) {
          hasUnread = true;
          break;
        }
      }

      result.push({
        companyId: company._id,
        companyName: company.name,
        manager: {
          _id: manager._id,
          fullName: manager.fullName,
          email: manager.email,
          hasUnread,
        },
      });
    }

    return result;
  },
});

// Get unread count
export const getUnreadCount = query({
  args: { userId: v.id("users") },
  returns: v.number(),
  async handler(ctx, args) {
    const messages = await ctx.db
      .query("directMessages")
      .withIndex("by_to_user", (q: any) => q.eq("toUserId", args.userId))
      .collect();

    return messages.filter(m => !m.isRead).length;
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: {
    userId: v.id("users"),
    fromUserId: v.id("users"),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const messages = await ctx.db
      .query("directMessages")
      .withIndex("by_to_user", (q: any) => q.eq("toUserId", args.userId))
      .collect();

    for (const msg of messages) {
      if (msg.fromUserId === args.fromUserId && !msg.isRead) {
        await ctx.db.patch(msg._id, { isRead: true });
      }
    }
    return null;
  },
});

// Get recent chats for dashboard
export const getRecentChats = query({
  args: { userId: v.id("users") },
  returns: v.array(v.object({
    otherUserId: v.id("users"),
    otherUserName: v.string(),
    lastMessage: v.string(),
    lastMessageTime: v.number(),
    unreadCount: v.number(),
  })),
  async handler(ctx, args) {
    const messages = await ctx.db
      .query("directMessages")
      .withIndex("by_company")
      .collect();

    const userMessages = messages.filter(
      m => m.fromUserId === args.userId || m.toUserId === args.userId
    );

    const conversations = new Map<string, any>();
    for (const msg of userMessages) {
      const otherUserId = msg.fromUserId === args.userId ? msg.toUserId : msg.fromUserId;
      const key = otherUserId;
      
      if (!conversations.has(key) || msg.createdAt > conversations.get(key).lastMessageTime) {
        const otherUser = await ctx.db.get(otherUserId);
        const unread = userMessages.filter(
          m => m.toUserId === args.userId && m.fromUserId === otherUserId && !m.isRead
        ).length;
        
        conversations.set(key, {
          otherUserId,
          otherUserName: otherUser?.fullName || "Unknown",
          lastMessage: msg.message,
          lastMessageTime: msg.createdAt,
          unreadCount: unread,
        });
      }
    }

    return Array.from(conversations.values())
      .sort((a, b) => b.lastMessageTime - a.lastMessageTime)
      .slice(0, 5);
  },
});

// Legacy chat functions for backwards compatibility
export const saveChatMessage = mutation({
  args: {
    userId: v.id("users"),
    message: v.string(),
    response: v.string(),
    sourcePolicies: v.array(v.id("policies")),
  },
  returns: v.id("chatMessages"),
  async handler(ctx, args) {
    return await ctx.db.insert("chatMessages", {
      userId: args.userId,
      message: args.message,
      response: args.response,
      sourcePolicies: args.sourcePolicies,
      createdAt: Date.now(),
    });
  },
});

export const getChatHistory = query({
  args: { userId: v.id("users") },
  returns: v.array(v.object({
    _id: v.id("chatMessages"),
    message: v.string(),
    response: v.string(),
    createdAt: v.number(),
  })),
  async handler(ctx, args) {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();
    
    return messages.map(m => ({
      _id: m._id,
      message: m.message,
      response: m.response,
      createdAt: m.createdAt,
    }));
  },
});