import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Add a professional (counselor, psychologist, lawyer)
export const addProfessional = mutation({
args: {
companyId: v.id("companies"),
type: v.union(v.literal("counselor"), v.literal("psychologist"), v.literal("lawyer")),
name: v.string(),
phone: v.string(),
email: v.string(),
specialty: v.optional(v.string()),
notes: v.optional(v.string()),
},
returns: v.id("professionals"),
async handler(ctx, args) {
return await ctx.db.insert("professionals", {
companyId: args.companyId,
type: args.type,
name: args.name,
phone: args.phone,
email: args.email,
specialty: args.specialty,
notes: args.notes,
isActive: true,
createdAt: Date.now(),
});
},
});

// Get all professionals for a company
export const getCompanyProfessionals = query({
args: { companyId: v.id("companies") },
returns: v.array(v.object({
_id: v.id("professionals"),
type: v.string(),
name: v.string(),
phone: v.string(),
email: v.string(),
specialty: v.optional(v.string()),
notes: v.optional(v.string()),
isActive: v.boolean(),
})),
async handler(ctx, args) {
const professionals = await ctx.db
.query("professionals")
.withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
.collect();

return professionals
.filter(p => p.isActive)
.map(p => ({
_id: p._id,
type: p.type,
name: p.name,
phone: p.phone,
email: p.email,
specialty: p.specialty,
notes: p.notes,
isActive: p.isActive,
}));
},
});

// Remove a professional
export const removeProfessional = mutation({
args: { professionalId: v.id("professionals") },
returns: v.null(),
async handler(ctx, args) {
await ctx.db.patch(args.professionalId, { isActive: false });
return null;
},
});

// Get professionals by type
export const getProfessionalsByType = query({
args: { 
companyId: v.id("companies"),
type: v.union(v.literal("counselor"), v.literal("psychologist"), v.literal("lawyer")),
},
returns: v.array(v.object({
_id: v.id("professionals"),
name: v.string(),
phone: v.string(),
email: v.string(),
specialty: v.optional(v.string()),
})),
async handler(ctx, args) {
const professionals = await ctx.db
.query("professionals")
.withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
.collect();

return professionals
.filter(p => p.isActive && p.type === args.type)
.map(p => ({
_id: p._id,
name: p.name,
phone: p.phone,
email: p.email,
specialty: p.specialty,
}));
},
});
