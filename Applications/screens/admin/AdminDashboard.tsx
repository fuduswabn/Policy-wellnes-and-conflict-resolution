import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing, radius, typography } from '../../lib/theme';

export default function AdminDashboard() {
const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'support' | 'settings'>('overview');
const { signOut, user } = useAuth();

const companies = useQuery(api.users.getAllCompanies);
const supportMessages = useQuery(api.support.listMessages, {});
const replyToMessage = useMutation(api.support.replyToMessage);
const closeMessage = useMutation(api.support.closeMessage);

const [selectedTicket, setSelectedTicket] = useState<any>(null);
const [replyText, setReplyText] = useState('');
const [supportFilter, setSupportFilter] = useState<'all' | 'open' | 'replied' | 'closed'>('all');

const activeCompanies = companies?.filter(c => c.subscriptionStatus === 'active' || c.subscriptionStatus === 'trial') || [];
const expiredCompanies = companies?.filter(c => c.subscriptionStatus === 'expired' || c.subscriptionStatus === 'cancelled') || [];
const openCount = supportMessages?.filter((m: any) => m.status === 'open').length || 0;
const filteredMessages = supportFilter === 'all' ? supportMessages : supportMessages?.filter((m: any) => m.status === supportFilter);

const getStatusColor = (status: string) => {
switch (status) {
case 'active': return colors.success;
case 'trial': return colors.warning;
case 'expired': return colors.error;
case 'cancelled': return colors.textTertiary;
default: return colors.textSecondary;
}
};

const getStatusLabel = (status: string, trialEndsAt?: number, paymentDueDate?: number) => {
if (status === 'trial' && trialEndsAt) {
const daysLeft = Math.ceil((trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24));
return `Trial (${daysLeft} days left)`;
}
if (status === 'expired') {
return 'Account Closed';
}
return status.charAt(0).toUpperCase() + status.slice(1);
};

const renderHeader = () => (
<View style={styles.header}>
<View>
<Text style={styles.title}>Admin Dashboard</Text>
<Text style={styles.subtitle}>Platform Overview</Text>
</View>
<TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
<MaterialIcons name="logout" size={24} color={colors.primary} />
</TouchableOpacity>
</View>
);

const renderTabs = () => (
<View style={styles.tabs}>
{(['overview', 'companies', 'support', 'settings'] as const).map((tab) => (
<TouchableOpacity
key={tab}
style={[styles.tab, activeTab === tab && styles.tabActive]}
onPress={() => setActiveTab(tab)}
>
<Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
{tab === 'support' ? `Support${openCount > 0 ? ` (${openCount})` : ''}` : tab.charAt(0).toUpperCase() + tab.slice(1)}
</Text>
</TouchableOpacity>
))}
</View>
);

if (activeTab === 'companies') {
return (
<SafeAreaView style={styles.container} edges={['top']}>
{renderHeader()}
{renderTabs()}
<ScrollView style={styles.content}>
<View style={styles.section}>
<Text style={styles.sectionTitle}>Active Companies ({activeCompanies.length})</Text>
{activeCompanies.map((company) => (
<TouchableOpacity 
key={company._id} 
style={styles.companyCard}
onPress={() => Alert.alert(company.name, `Manager: ${company.managerName}\nEmail: ${company.managerEmail}\nEmployees: ${company.employeeCount}`)}
>
<View style={styles.companyInfo}>
<Text style={styles.companyName}>{company.name}</Text>
<Text style={styles.companyManager}>{company.managerName} • {company.managerEmail}</Text>
<Text style={styles.companyMeta}>{company.employeeCount} employees</Text>
</View>
<View style={[styles.statusBadge, { backgroundColor: getStatusColor(company.subscriptionStatus) + '20' }]}>
<Text style={[styles.statusText, { color: getStatusColor(company.subscriptionStatus) }]}>
{getStatusLabel(company.subscriptionStatus, company.trialEndsAt, company.paymentDueDate)}
</Text>
</View>
</TouchableOpacity>
))}
{activeCompanies.length === 0 && (
<Text style={styles.emptyText}>No active companies yet</Text>
)}
</View>

<View style={styles.section}>
<Text style={styles.sectionTitle}>Closed Accounts ({expiredCompanies.length})</Text>
{expiredCompanies.map((company) => (
<View key={company._id} style={[styles.companyCard, styles.expiredCard]}>
<View style={styles.companyInfo}>
<Text style={[styles.companyName, styles.expiredText]}>{company.name}</Text>
<Text style={styles.companyManager}>{company.managerName} • {company.managerEmail}</Text>
</View>
<View style={[styles.statusBadge, { backgroundColor: colors.error + '20' }]}>
<Text style={[styles.statusText, { color: colors.error }]}>Account Closed</Text>
</View>
</View>
))}
{expiredCompanies.length === 0 && (
<Text style={styles.emptyText}>No closed accounts</Text>
)}
</View>
</ScrollView>
</SafeAreaView>
);
}

if (activeTab === 'support') {
  const getSupportStatusColor = (status: string) => {
    switch (status) {
      case 'open': return colors.warning;
      case 'replied': return colors.success;
      case 'closed': return colors.textTertiary;
      default: return colors.textSecondary;
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    try {
      await replyToMessage({ messageId: selectedTicket._id, reply: replyText.trim() });
      setReplyText('');
      setSelectedTicket(null);
      Alert.alert('Sent', 'Reply sent to user');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send reply');
    }
  };

  const handleClose = async (ticketId: any) => {
    Alert.alert('Close Ticket', 'Mark this ticket as closed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Close', style: 'destructive', onPress: async () => {
        try {
          await closeMessage({ messageId: ticketId });
        } catch (e: any) {
          Alert.alert('Error', e.message);
        }
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {renderHeader()}
      {renderTabs()}
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.xs }}>
        {(['all', 'open', 'replied', 'closed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setSupportFilter(f)}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radius.md,
              backgroundColor: supportFilter === f ? colors.primary : colors.surface,
            }}
          >
            <Text style={{
              ...typography.caption,
              color: supportFilter === f ? colors.background : colors.textSecondary,
              fontWeight: supportFilter === f ? '600' : '400',
            }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={styles.content}>
        {filteredMessages?.map((msg: any) => (
          <View key={msg._id} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: msg.status === 'open' ? colors.warning + '40' : colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.bodyMedium, color: colors.text, fontWeight: '600' }}>{msg.subject}</Text>
                <Text style={{ ...typography.caption, color: colors.textSecondary, marginTop: 2 }}>
                  {msg.userName} ({msg.userEmail})
                </Text>
              </View>
              <View style={{ backgroundColor: getSupportStatusColor(msg.status) + '20', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm }}>
                <Text style={{ ...typography.caption, color: getSupportStatusColor(msg.status), fontWeight: '600' }}>{msg.status}</Text>
              </View>
            </View>
            <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm }}>{msg.message}</Text>
            <Text style={{ ...typography.caption, color: colors.textTertiary, marginBottom: spacing.sm }}>
              {new Date(msg.createdAt).toLocaleDateString()} at {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {msg.adminReply && (
              <View style={{ backgroundColor: colors.primary + '10', borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm }}>
                <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '600', marginBottom: spacing.xs }}>Your Reply</Text>
                <Text style={{ ...typography.body, color: colors.text }}>{msg.adminReply}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {msg.status !== 'closed' && (
                <TouchableOpacity
                  onPress={() => { setSelectedTicket(msg); setReplyText(msg.adminReply || ''); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary + '15', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md }}
                >
                  <MaterialIcons name="reply" size={16} color={colors.primary} />
                  <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '600' }}>Reply</Text>
                </TouchableOpacity>
              )}
              {msg.status !== 'closed' && (
                <TouchableOpacity
                  onPress={() => handleClose(msg._id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }}
                >
                  <MaterialIcons name="check-circle" size={16} color={colors.textTertiary} />
                  <Text style={{ ...typography.caption, color: colors.textSecondary }}>Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
        {(!filteredMessages || filteredMessages.length === 0) && (
          <Text style={styles.emptyText}>No support messages</Text>
        )}
      </ScrollView>

      {/* Reply Modal */}
      <Modal visible={!!selectedTicket} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.xl, width: '90%', maxWidth: 400 }}>
            <Text style={{ ...typography.h4, color: colors.text, marginBottom: spacing.xs }}>Reply to {selectedTicket?.userName}</Text>
            <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md }}>Re: {selectedTicket?.subject}</Text>
            <TextInput
              style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, ...typography.body, color: colors.text, borderWidth: 1, borderColor: colors.border, height: 120, textAlignVertical: 'top', marginBottom: spacing.md }}
              placeholder="Type your reply..."
              placeholderTextColor={colors.textTertiary}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              numberOfLines={5}
            />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <TouchableOpacity
                onPress={() => { setSelectedTicket(null); setReplyText(''); }}
                style={{ flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center' }}
              >
                <Text style={{ ...typography.body, color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReply}
                style={{ flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' }}
              >
                <Text style={{ ...typography.body, color: colors.background, fontWeight: '600' }}>Send Reply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

if (activeTab === 'settings') {
return (
<SafeAreaView style={styles.container} edges={['top']}>
{renderHeader()}
{renderTabs()}
<ScrollView style={styles.content}>
<View style={styles.section}>
<Text style={styles.sectionTitle}>Platform Settings</Text>
<TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert('Coming Soon', 'Package management coming soon')}>
<MaterialIcons name="card-membership" size={24} color={colors.primary} />
<Text style={styles.settingText}>Manage Packages</Text>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
<TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert('Coming Soon', 'Payment settings coming soon')}>
<MaterialIcons name="payment" size={24} color={colors.primary} />
<Text style={styles.settingText}>Payment Settings</Text>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
<TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert('Coming Soon', 'Email settings coming soon')}>
<MaterialIcons name="email" size={24} color={colors.primary} />
<Text style={styles.settingText}>Email Notifications</Text>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
</View>
</ScrollView>
</SafeAreaView>
);
}

// Overview tab
return (
<SafeAreaView style={styles.container} edges={['top']}>
{renderHeader()}
{renderTabs()}
<ScrollView style={styles.content}>
<View style={styles.statsGrid}>
<View style={styles.statCard}>
<MaterialIcons name="business" size={32} color={colors.primary} />
<Text style={styles.statValue}>{companies?.length || 0}</Text>
<Text style={styles.statLabel}>Total Companies</Text>
</View>
<View style={styles.statCard}>
<MaterialIcons name="check-circle" size={32} color={colors.success} />
<Text style={styles.statValue}>{activeCompanies.length}</Text>
<Text style={styles.statLabel}>Active</Text>
</View>
<View style={styles.statCard}>
<MaterialIcons name="access-time" size={32} color={colors.warning} />
<Text style={styles.statValue}>{companies?.filter(c => c.subscriptionStatus === 'trial').length || 0}</Text>
<Text style={styles.statLabel}>On Trial</Text>
</View>
<View style={styles.statCard}>
<MaterialIcons name="cancel" size={32} color={colors.error} />
<Text style={styles.statValue}>{expiredCompanies.length}</Text>
<Text style={styles.statLabel}>Closed</Text>
</View>
<View style={styles.statCard}>
<MaterialIcons name="support-agent" size={32} color={openCount > 0 ? colors.warning : colors.success} />
<Text style={styles.statValue}>{openCount}</Text>
<Text style={styles.statLabel}>Open Tickets</Text>
</View>
</View>

<View style={styles.section}>
<Text style={styles.sectionTitle}>Recent Signups</Text>
{companies?.slice(0, 5).map((company) => (
<View key={company._id} style={styles.recentItem}>
<View style={styles.recentInfo}>
<Text style={styles.recentName}>{company.name}</Text>
<Text style={styles.recentDate}>{new Date(company.createdAt).toLocaleDateString()}</Text>
</View>
<View style={[styles.statusBadge, { backgroundColor: getStatusColor(company.subscriptionStatus) + '20' }]}>
<Text style={[styles.statusText, { color: getStatusColor(company.subscriptionStatus) }]}>
{company.subscriptionStatus}
</Text>
</View>
</View>
))}
{(!companies || companies.length === 0) && (
<Text style={styles.emptyText}>No companies signed up yet</Text>
)}
</View>
</ScrollView>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.background,
},
header: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
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
},
logoutBtn: {
padding: spacing.sm,
},
tabs: {
flexDirection: 'row',
borderBottomWidth: 1,
borderBottomColor: colors.border,
},
tab: {
flex: 1,
paddingVertical: spacing.md,
alignItems: 'center',
},
tabActive: {
borderBottomWidth: 2,
borderBottomColor: colors.primary,
},
tabText: {
...typography.caption,
color: colors.textSecondary,
},
tabTextActive: {
color: colors.primary,
fontWeight: '600',
},
content: {
flex: 1,
padding: spacing.lg,
},
statsGrid: {
flexDirection: 'row',
flexWrap: 'wrap',
gap: spacing.md,
marginBottom: spacing.xl,
},
statCard: {
width: '47%',
backgroundColor: colors.surface,
borderRadius: radius.lg,
padding: spacing.lg,
alignItems: 'center',
},
statValue: {
...typography.h1,
color: colors.text,
marginTop: spacing.sm,
},
statLabel: {
...typography.caption,
color: colors.textSecondary,
},
section: {
marginBottom: spacing.xl,
},
sectionTitle: {
...typography.h3,
color: colors.text,
marginBottom: spacing.md,
},
companyCard: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: colors.surface,
borderRadius: radius.md,
padding: spacing.md,
marginBottom: spacing.sm,
},
expiredCard: {
opacity: 0.7,
},
companyInfo: {
flex: 1,
},
companyName: {
...typography.body,
color: colors.text,
fontWeight: '600',
},
expiredText: {
textDecorationLine: 'line-through',
},
companyManager: {
...typography.caption,
color: colors.textSecondary,
},
companyMeta: {
...typography.caption,
color: colors.textTertiary,
marginTop: spacing.xs,
},
statusBadge: {
paddingHorizontal: spacing.sm,
paddingVertical: spacing.xs,
borderRadius: radius.sm,
},
statusText: {
...typography.caption,
fontWeight: '600',
},
emptyText: {
...typography.body,
color: colors.textTertiary,
textAlign: 'center',
padding: spacing.xl,
},
recentItem: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: colors.surface,
borderRadius: radius.md,
padding: spacing.md,
marginBottom: spacing.sm,
},
recentInfo: {
flex: 1,
},
recentName: {
...typography.body,
color: colors.text,
fontWeight: '600',
},
recentDate: {
...typography.caption,
color: colors.textSecondary,
},
settingItem: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: colors.surface,
borderRadius: radius.md,
padding: spacing.md,
marginBottom: spacing.sm,
gap: spacing.md,
},
settingText: {
flex: 1,
...typography.body,
color: colors.text,
},
});