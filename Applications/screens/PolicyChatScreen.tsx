import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '../lib/auth-context';
import { sendEmailNotification, checkUserOnlineStatus, updateUserPresence } from '../lib/supabase';
import { colors, spacing, radius, typography } from '../lib/theme';
import { Id } from '../convex/_generated/dataModel';

export default function PolicyChatScreen() {
const { user } = useAuth();
const [selectedContact, setSelectedContact] = useState<{ id: Id<"users">, name: string, email: string, companyId?: Id<"companies"> } | null>(null);
const [message, setMessage] = useState('');
const [sending, setSending] = useState(false);
const scrollRef = useRef<ScrollView>(null);

const companyId = user?.companyId as Id<"companies"> | undefined;
const userId = user?.userId as Id<"users"> | undefined;

// Update presence when screen is active
useEffect(() => {
if (userId) {
updateUserPresence(userId);
const interval = setInterval(() => updateUserPresence(userId), 60000); // Every minute
return () => clearInterval(interval);
}
}, [userId]);

// Employee: Get manager
const manager = useQuery(
api.chat.getCompanyManager,
companyId && user?.role === 'employee' ? { companyId } : "skip"
);

// Manager: Get admins and employees
const admins = useQuery(api.chat.getAdminsForManager, user?.role === 'manager' ? {} : "skip");
const employees = useQuery(
api.chat.getMyEmployees,
companyId && user?.role === 'manager' ? { companyId } : "skip"
);

// Admin: Get managers
const managers = useQuery(api.chat.getManagersForAdmin, user?.role === 'admin' ? {} : "skip");

// Get conversation
const conversationArgs = selectedContact && userId && selectedContact.companyId
? { userId1: userId, userId2: selectedContact.id, companyId: selectedContact.companyId }
: null;

const conversation = useQuery(
api.chat.getConversation,
conversationArgs || "skip"
);

const sendMessageMutation = useMutation(api.chat.sendMessage);
const markAsRead = useMutation(api.chat.markAsRead);

useEffect(() => {
if (conversation && scrollRef.current) {
setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
}
}, [conversation]);

useEffect(() => {
if (conversation && userId && selectedContact) {
markAsRead({ userId, fromUserId: selectedContact.id });
}
}, [conversation, selectedContact]);

const handleSend = async () => {
if (!message.trim() || !userId || !selectedContact || sending) return;

const companyIdToUse = selectedContact.companyId || (user?.companyId as Id<"companies">);
if (!companyIdToUse) return;

setSending(true);
try {
const result = await sendMessageMutation({
fromUserId: userId,
toUserId: selectedContact.id,
companyId: companyIdToUse,
message: message.trim(),
});

// Check if recipient is offline, send email notification
try {
const isOnline = await checkUserOnlineStatus(selectedContact.id);
if (!isOnline && result.recipientEmail) {
await sendEmailNotification(
result.recipientEmail,
`New message from ${result.senderName}`,
`You have a new message:\n\n"${message.trim()}"\n\nLog in to the Policy Training app to reply.`,
result.senderName
);
}
} catch (emailError) {
// Don't fail the message send if email fails
console.log('Email notification failed (tables may not be set up):', emailError);
}

setMessage('');
} catch (error: any) {
Alert.alert('Error', 'Failed to send message');
} finally {
setSending(false);
}
};

// Employee view: Chat with manager
if (user?.role === 'employee') {
if (!selectedContact && manager) {
return (
<SafeAreaView style={styles.container} edges={['top']}>
<View style={styles.header}>
<Text style={styles.title}>Chat with Manager</Text>
<Text style={styles.subtitle}>Send messages to your manager</Text>
</View>
<View style={styles.content}>
<TouchableOpacity
style={styles.contactCard}
onPress={() => setSelectedContact({ 
id: manager._id, 
name: manager.fullName, 
email: manager.email,
companyId: companyId! 
})}
>
<View style={styles.contactAvatar}>
<MaterialIcons name="supervisor-account" size={32} color={colors.primary} />
</View>
<View style={styles.contactInfo}>
<Text style={styles.contactName}>{manager.fullName}</Text>
<Text style={styles.contactRole}>Your Manager</Text>
<Text style={styles.contactEmail}>{manager.email}</Text>
</View>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
<Text style={styles.infoText}>
Messages will be sent to your manager's email if they're offline.
</Text>
</View>
</SafeAreaView>
);
}
}

// Manager view: Select employee or admin
if (user?.role === 'manager' && !selectedContact) {
return (
<SafeAreaView style={styles.container} edges={['top']}>
<View style={styles.header}>
<Text style={styles.title}>Messages</Text>
<Text style={styles.subtitle}>Chat with admins or your employees</Text>
</View>
<ScrollView style={styles.content}>
<Text style={styles.sectionTitle}>Platform Support</Text>
{admins?.map((admin) => (
<TouchableOpacity
key={admin._id}
style={styles.contactCard}
onPress={() => setSelectedContact({ 
id: admin._id, 
name: admin.fullName, 
email: admin.email,
companyId: companyId! 
})}
>
<View style={[styles.contactAvatar, styles.adminAvatar]}>
<MaterialIcons name="admin-panel-settings" size={28} color={colors.secondary} />
</View>
<View style={styles.contactInfo}>
<Text style={styles.contactName}>{admin.fullName}</Text>
<Text style={styles.contactRole}>Platform Admin</Text>
</View>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
))}
{(!admins || admins.length === 0) && (
<Text style={styles.emptyText}>No admins available</Text>
)}

<Text style={styles.sectionTitle}>Your Employees</Text>
{employees?.map((emp) => (
<TouchableOpacity
key={emp._id}
style={styles.contactCard}
onPress={() => setSelectedContact({ 
id: emp._id, 
name: emp.fullName, 
email: emp.email,
companyId: companyId! 
})}
>
<View style={styles.contactAvatar}>
<MaterialIcons name="person" size={28} color={colors.primary} />
</View>
<View style={styles.contactInfo}>
<Text style={styles.contactName}>{emp.fullName}</Text>
<Text style={styles.contactEmail}>{emp.email}</Text>
</View>
{emp.hasUnread && <View style={styles.unreadDot} />}
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
))}
{(!employees || employees.length === 0) && (
<Text style={styles.emptyText}>No employees yet. Generate invite codes to add employees.</Text>
)}
</ScrollView>
</SafeAreaView>
);
}

// Admin view: Select manager
if (user?.role === 'admin' && !selectedContact) {
return (
<SafeAreaView style={styles.container} edges={['top']}>
<View style={styles.header}>
<Text style={styles.title}>Manager Messages</Text>
<Text style={styles.subtitle}>Support requests from company managers</Text>
</View>
<ScrollView style={styles.content}>
{managers?.map((company) => (
<View key={company.companyId} style={styles.companySection}>
<Text style={styles.companyLabel}>{company.companyName}</Text>
<TouchableOpacity
style={styles.contactCard}
onPress={() => setSelectedContact({ 
id: company.manager._id, 
name: company.manager.fullName,
email: company.manager.email,
companyId: company.companyId,
})}
>
<View style={styles.contactAvatar}>
<MaterialIcons name="business" size={28} color={colors.success} />
</View>
<View style={styles.contactInfo}>
<Text style={styles.contactName}>{company.manager.fullName}</Text>
<Text style={styles.contactEmail}>{company.manager.email}</Text>
</View>
{company.manager.hasUnread && <View style={styles.unreadDot} />}
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
</View>
))}
{(!managers || managers.length === 0) && (
<View style={styles.emptyContainer}>
<MaterialIcons name="people" size={64} color={colors.textTertiary} />
<Text style={styles.emptyTitle}>No Managers Yet</Text>
<Text style={styles.emptyText}>Managers will appear here once they sign up</Text>
</View>
)}
</ScrollView>
</SafeAreaView>
);
}

// Chat view
return (
<SafeAreaView style={styles.container} edges={['top']}>
<View style={styles.chatHeader}>
<TouchableOpacity onPress={() => setSelectedContact(null)} style={styles.backBtn}>
<MaterialIcons name="arrow-back" size={24} color={colors.text} />
</TouchableOpacity>
<View style={styles.chatHeaderInfo}>
<Text style={styles.chatTitle}>{selectedContact?.name}</Text>
<Text style={styles.chatSubtitle}>{selectedContact?.email}</Text>
</View>
</View>

<KeyboardAvoidingView 
style={styles.chatContainer}
behavior={Platform.OS === 'ios' ? 'padding' : undefined}
keyboardVerticalOffset={100}
>
<ScrollView 
ref={scrollRef}
style={styles.messagesContainer}
contentContainerStyle={styles.messagesContent}
>
{conversation?.map((msg) => {
const isMe = msg.fromUserId === userId;
return (
<View key={msg._id} style={[styles.messageRow, isMe && styles.messageRowMe]}>
<View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
<Text style={[styles.messageText, isMe && styles.messageTextMe]}>{msg.message}</Text>
<Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
</Text>
</View>
</View>
);
})}
{(!conversation || conversation.length === 0) && (
<View style={styles.emptyChat}>
<MaterialIcons name="chat-bubble-outline" size={48} color={colors.textTertiary} />
<Text style={styles.emptyChatText}>No messages yet. Start the conversation!</Text>
<Text style={styles.emailNote}>If offline, they'll receive an email notification.</Text>
</View>
)}
</ScrollView>

<View style={styles.inputContainer}>
<TextInput
style={styles.input}
placeholder="Type a message..."
value={message}
onChangeText={setMessage}
placeholderTextColor={colors.textTertiary}
multiline
maxLength={1000}
editable={!sending}
/>
<TouchableOpacity 
style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
onPress={handleSend}
disabled={!message.trim() || sending}
>
<MaterialIcons name="send" size={24} color={message.trim() && !sending ? colors.background : colors.textTertiary} />
</TouchableOpacity>
</View>
</KeyboardAvoidingView>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.background,
},
header: {
padding: spacing.lg,
borderBottomWidth: 1,
borderBottomColor: colors.border,
},
title: {
...typography.h2,
color: colors.text,
},
subtitle: {
...typography.caption,
color: colors.textSecondary,
marginTop: spacing.xs,
},
content: {
flex: 1,
padding: spacing.lg,
},
sectionTitle: {
...typography.h4,
color: colors.text,
marginTop: spacing.lg,
marginBottom: spacing.md,
},
companySection: {
marginBottom: spacing.md,
},
companyLabel: {
...typography.caption,
color: colors.textSecondary,
marginBottom: spacing.sm,
},
contactCard: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: colors.surface,
borderRadius: radius.md,
padding: spacing.md,
marginBottom: spacing.sm,
},
contactAvatar: {
width: 48,
height: 48,
borderRadius: radius.full,
backgroundColor: colors.primary + '20',
alignItems: 'center',
justifyContent: 'center',
marginRight: spacing.md,
},
adminAvatar: {
backgroundColor: colors.secondary + '20',
},
contactInfo: {
flex: 1,
},
contactName: {
...typography.body,
color: colors.text,
fontWeight: '600',
},
contactRole: {
...typography.caption,
color: colors.textSecondary,
},
contactEmail: {
...typography.caption,
color: colors.textTertiary,
},
unreadDot: {
width: 10,
height: 10,
borderRadius: radius.full,
backgroundColor: colors.primary,
marginRight: spacing.sm,
},
infoText: {
...typography.caption,
color: colors.textTertiary,
textAlign: 'center',
marginTop: spacing.lg,
fontStyle: 'italic',
},
emptyContainer: {
flex: 1,
alignItems: 'center',
justifyContent: 'center',
padding: spacing.xxl,
marginTop: spacing.xxl,
},
emptyTitle: {
...typography.h3,
color: colors.text,
marginTop: spacing.lg,
},
emptyText: {
...typography.body,
color: colors.textTertiary,
textAlign: 'center',
marginTop: spacing.sm,
},
chatHeader: {
flexDirection: 'row',
alignItems: 'center',
padding: spacing.lg,
borderBottomWidth: 1,
borderBottomColor: colors.border,
},
backBtn: {
marginRight: spacing.md,
},
chatHeaderInfo: {
flex: 1,
},
chatTitle: {
...typography.h4,
color: colors.text,
},
chatSubtitle: {
...typography.caption,
color: colors.textSecondary,
},
chatContainer: {
flex: 1,
},
messagesContainer: {
flex: 1,
},
messagesContent: {
padding: spacing.lg,
},
messageRow: {
marginBottom: spacing.sm,
alignItems: 'flex-start',
},
messageRowMe: {
alignItems: 'flex-end',
},
messageBubble: {
maxWidth: '80%',
padding: spacing.md,
borderRadius: radius.lg,
},
messageBubbleMe: {
backgroundColor: colors.primary,
borderBottomRightRadius: radius.sm,
},
messageBubbleOther: {
backgroundColor: colors.surface,
borderBottomLeftRadius: radius.sm,
},
messageText: {
...typography.body,
color: colors.text,
},
messageTextMe: {
color: colors.background,
},
messageTime: {
...typography.caption,
color: colors.textTertiary,
marginTop: spacing.xs,
},
messageTimeMe: {
color: 'rgba(255,255,255,0.7)',
},
emptyChat: {
alignItems: 'center',
padding: spacing.xxl,
},
emptyChatText: {
...typography.body,
color: colors.textTertiary,
marginTop: spacing.md,
},
emailNote: {
...typography.caption,
color: colors.textTertiary,
marginTop: spacing.sm,
fontStyle: 'italic',
},
inputContainer: {
flexDirection: 'row',
alignItems: 'flex-end',
padding: spacing.md,
borderTopWidth: 1,
borderTopColor: colors.border,
backgroundColor: colors.background,
},
input: {
flex: 1,
backgroundColor: colors.surface,
borderRadius: radius.lg,
paddingHorizontal: spacing.md,
paddingVertical: spacing.sm,
...typography.body,
color: colors.text,
maxHeight: 100,
marginRight: spacing.sm,
},
sendBtn: {
width: 44,
height: 44,
borderRadius: radius.full,
backgroundColor: colors.primary,
alignItems: 'center',
justifyContent: 'center',
},
sendBtnDisabled: {
backgroundColor: colors.surface,
},
});
