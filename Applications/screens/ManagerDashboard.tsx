import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '../lib/auth-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { Id } from '../convex/_generated/dataModel';
import { pickAndProcessDocument, validateExtractedText } from '../lib/document-processor';
import ProfessionalsManagementScreen from './ProfessionalsManagementScreen';

export default function ManagerDashboard({ navigation }: any) {
const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'groups' | 'policies' | 'professionals'>('overview');
const [showGroupModal, setShowGroupModal] = useState(false);
const [showPolicyModal, setShowPolicyModal] = useState(false);
const [newGroupName, setNewGroupName] = useState('');
const [newGroupDescription, setNewGroupDescription] = useState('');
const [isCreating, setIsCreating] = useState(false);
const [processingDocument, setProcessingDocument] = useState(false);

// Policy form state
const [policyTitle, setPolicyTitle] = useState('');
const [policyDescription, setPolicyDescription] = useState('');
const [policyContent, setPolicyContent] = useState('');
const [policyType, setPolicyType] = useState<'general' | 'group'>('general');
const [selectedGroupIds, setSelectedGroupIds] = useState<Id<"employeeGroups">[]>([]);
const [uploadedFileName, setUploadedFileName] = useState('');

const { signOut, user } = useAuth();

const companyId = user?.companyId as Id<"companies"> | undefined;
const userId = user?.userId as Id<"users"> | undefined;

const employees = useQuery(api.users.getCompanyEmployees, companyId ? { companyId } : "skip");
const groups = useQuery(api.users.getCompanyGroups, companyId ? { companyId } : "skip");
const inviteCodes = useQuery(api.users.getCompanyInviteCodes, companyId ? { companyId } : "skip");
const policies = useQuery(api.policies.listCompanyPolicies, companyId ? { companyId } : "skip");

const createInviteCode = useMutation(api.users.createInviteCode);
const createGroup = useMutation(api.users.createEmployeeGroup);
const uploadPolicy = useMutation(api.policies.uploadPolicy);

// Group policies by type
const generalPolicies = policies?.filter((p: any) => p.policyType === 'general') || [];
const groupPolicies = policies?.filter((p: any) => p.policyType === 'group') || [];

const handleAutoReadDocument = async () => {
setProcessingDocument(true);
try {
const result = await pickAndProcessDocument();
if (!result) {
setProcessingDocument(false);
return;
}
const validation = validateExtractedText(result.extractedText);
if (!validation.isValid) {
Alert.alert('Extraction Failed', validation.reason || 'Could not extract text from document.');
setProcessingDocument(false);
return;
}
setPolicyTitle(result.fileName.replace(/\.[^/.]+$/, ''));
setPolicyContent(result.extractedText);
Alert.alert('Document Read Successfully', `Extracted ${result.extractedText.length} characters from ${result.fileName}.\n\nReview and save the policy below.`);
setProcessingDocument(false);
} catch (error: any) {
setProcessingDocument(false);
Alert.alert('Error', error.message || 'Failed to read document');
}
};

const handleCreateInvite = async (groupId?: Id<"employeeGroups">) => {
if (!companyId || !userId) return;
try {
const result = await createInviteCode({ companyId, createdBy: userId, groupId });
Alert.alert(
'Invite Code Created!',
`Code: ${result.code}\n\nShare this code with your employee.\nCode expires in 7 days.`,
[
{ text: 'Share Code', onPress: () => Share.share({ message: `Join our company on Policy Training!\n\nYour Invite Code: ${result.code}\n\n1. Download the Policy Training app\n2. Sign up as Employee\n3. Enter this code: ${result.code}` }) },
{ text: 'OK' }
]
);
} catch (error: any) {
Alert.alert('Error', error.message);
}
};

const handleCreateGroup = async () => {
if (!companyId || !userId) { Alert.alert('Error', 'User or company not found'); return; }
if (!newGroupName.trim()) { Alert.alert('Error', 'Please enter a group name'); return; }
setIsCreating(true);
try {
await createGroup({ name: newGroupName.trim(), companyId, createdBy: userId, description: newGroupDescription.trim() || undefined });
setNewGroupName(''); setNewGroupDescription(''); setShowGroupModal(false);
Alert.alert('Success!', `Group "${newGroupName}" created!\n\nReady for policies. AI will generate quizzes automatically.`);
} catch (error: any) {
Alert.alert('Error', error.message || 'Failed to create group');
} finally { setIsCreating(false); }
};

const handleUploadPolicy = async () => {
if (!companyId || !userId) { Alert.alert('Error', 'User or company not found'); return; }
if (!policyTitle.trim()) { Alert.alert('Error', 'Please enter a policy title'); return; }
if (!policyContent.trim()) { Alert.alert('Error', 'Please enter or upload policy content'); return; }
if (policyType === 'group' && selectedGroupIds.length === 0) { Alert.alert('Error', 'Please select at least one group'); return; }
setIsCreating(true);
try {
await uploadPolicy({
title: policyTitle.trim(),
description: policyDescription.trim() || undefined,
content: policyContent.trim(),
fileType: 'txt',
fileUrl: uploadedFileName || 'manual-entry',
companyId,
uploadedBy: userId,
policyType,
targetGroupIds: policyType === 'group' ? selectedGroupIds : undefined,
});
setPolicyTitle(''); setPolicyDescription(''); setPolicyContent('');
setPolicyType('general'); setSelectedGroupIds([]); setUploadedFileName('');
setShowPolicyModal(false);
Alert.alert('Policy Saved!', `"${policyTitle}" is now in the system.\n\nAI will automatically generate quizzes at midnight!`);
} catch (error: any) {
Alert.alert('Error', error.message || 'Failed to save policy');
} finally { setIsCreating(false); }
};

const toggleGroupSelection = (groupId: Id<"employeeGroups">) => {
if (selectedGroupIds.includes(groupId)) {
setSelectedGroupIds(selectedGroupIds.filter((id: any) => id !== groupId));
} else {
setSelectedGroupIds([...selectedGroupIds, groupId]);
}
};

const renderHeader = () => (
<View style={styles.header}>
<View>
<Text style={styles.title}>{user?.companyName || 'My Company'}</Text>
<Text style={styles.subtitle}>Manager Dashboard</Text>
</View>
<TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
<MaterialIcons name="logout" size={24} color={colors.primary} />
</TouchableOpacity>
</View>
);

const renderTabs = () => (
<View style={styles.tabs}>
{(['overview', 'employees', 'groups', 'policies', 'professionals'] as const).map((tab) => (
<TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
<Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
{tab === 'professionals' ? 'Support' : tab.charAt(0).toUpperCase() + tab.slice(1)}
</Text>
</TouchableOpacity>
))}
</View>
);

// EMPLOYEES TAB
if (activeTab === 'employees') {
return (
<SafeAreaView style={styles.container} edges={['top']}>
{renderHeader()}
{renderTabs()}
<ScrollView style={styles.content}>
<TouchableOpacity style={styles.createBtn} onPress={() => handleCreateInvite()}>
<MaterialIcons name="person-add" size={24} color={colors.background} />
<Text style={styles.createBtnText}>Generate Invite Code</Text>
</TouchableOpacity>
<View style={styles.infoBox}>
<MaterialIcons name="info" size={20} color={colors.primary} />
<Text style={styles.infoText}>Share the invite code with employees. They'll enter it when signing up to join your company automatically.</Text>
</View>
{inviteCodes && inviteCodes.length > 0 && (
<View style={styles.section}>
<Text style={styles.sectionTitle}>Active Invite Codes</Text>
{inviteCodes.map((code: any) => (
<TouchableOpacity key={code._id} style={styles.codeCard} onPress={() => Share.share({ message: `Join our company!\n\nInvite Code: ${code.code}` })}>
<View>
<Text style={styles.codeText}>{code.code}</Text>
<Text style={styles.codeExpiry}>Expires: {new Date(code.expiresAt).toLocaleDateString()}</Text>
</View>
<MaterialIcons name="share" size={24} color={colors.primary} />
</TouchableOpacity>
))}
</View>
)}
<View style={styles.section}>
<Text style={styles.sectionTitle}>Employees ({employees?.length || 0})</Text>
{employees?.map((emp: any) => (
<View key={emp._id} style={styles.employeeCard}>
<View style={styles.employeeAvatar}><MaterialIcons name="person" size={24} color={colors.primary} /></View>
<View style={styles.employeeInfo}>
<Text style={styles.employeeName}>{emp.fullName}</Text>
<Text style={styles.employeeEmail}>{emp.email}</Text>
</View>
</View>
))}
{(!employees || employees.length === 0) && <Text style={styles.emptyText}>No employees yet. Generate an invite code to add employees.</Text>}
</View>
</ScrollView>
</SafeAreaView>
);
}

// GROUPS TAB
if (activeTab === 'groups') {
return (
<SafeAreaView style={styles.container} edges={['top']}>
{renderHeader()}
{renderTabs()}
<ScrollView style={styles.content}>
<TouchableOpacity style={styles.createBtn} onPress={() => setShowGroupModal(true)}>
<MaterialIcons name="create-new-folder" size={24} color={colors.background} />
<Text style={styles.createBtnText}>Create New Group</Text>
</TouchableOpacity>
<View style={styles.infoBox}>
<MaterialIcons name="info" size={20} color={colors.primary} />
<Text style={styles.infoText}>Groups organize employees by role. Each group gets AI-generated quizzes based on their specific policies.</Text>
</View>
<View style={styles.section}>
<Text style={styles.sectionTitle}>Employee Groups ({groups?.length || 0})</Text>
{groups?.map((group: any) => (
<View key={group._id} style={styles.groupCard}>
<View style={styles.groupIcon}><MaterialIcons name="folder" size={28} color={colors.secondary} /></View>
<View style={styles.groupInfo}>
<Text style={styles.groupName}>{group.name}</Text>
<Text style={styles.groupMembers}>{group.memberCount} members</Text>
{group.description && <Text style={styles.groupDescription}>{group.description}</Text>}
</View>
<TouchableOpacity style={styles.inviteGroupBtn} onPress={() => handleCreateInvite(group._id)}>
<MaterialIcons name="person-add" size={20} color={colors.primary} />
</TouchableOpacity>
</View>
))}
{(!groups || groups.length === 0) && <Text style={styles.emptyText}>No groups yet. Create groups like "Electricians", "Sales Team", etc.</Text>}
</View>
</ScrollView>
<Modal visible={showGroupModal} transparent animationType="slide">
<View style={styles.modalOverlay}>
<View style={styles.modalContent}>
<Text style={styles.modalTitle}>Create New Group</Text>
<Text style={styles.inputLabel}>Group Name *</Text>
<TextInput style={styles.modalInput} placeholder="e.g., Electricians, Sales Team" value={newGroupName} onChangeText={setNewGroupName} placeholderTextColor={colors.textTertiary} />
<Text style={styles.inputLabel}>Description (optional)</Text>
<TextInput style={[styles.modalInput, styles.textArea]} placeholder="What is this group for?" value={newGroupDescription} onChangeText={setNewGroupDescription} placeholderTextColor={colors.textTertiary} multiline numberOfLines={3} />
<View style={styles.modalButtons}>
<TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowGroupModal(false); setNewGroupName(''); setNewGroupDescription(''); }} disabled={isCreating}>
<Text style={styles.modalCancelText}>Cancel</Text>
</TouchableOpacity>
<TouchableOpacity style={[styles.modalConfirmBtn, isCreating && styles.btnDisabled]} onPress={handleCreateGroup} disabled={isCreating}>
{isCreating ? <ActivityIndicator color={colors.background} size="small" /> : <Text style={styles.modalConfirmText}>Save Group</Text>}
</TouchableOpacity>
</View>
</View>
</View>
</Modal>
</SafeAreaView>
);
}

// POLICIES TAB
if (activeTab === 'policies') {
return (
<SafeAreaView style={styles.container} edges={['top']}>
{renderHeader()}
{renderTabs()}
<ScrollView style={styles.content}>
<TouchableOpacity style={styles.createBtn} onPress={() => setShowPolicyModal(true)}>
<MaterialIcons name="add-circle" size={24} color={colors.background} />
<Text style={styles.createBtnText}>Add New Policy</Text>
</TouchableOpacity>
<View style={styles.infoBox}>
<MaterialIcons name="smart-toy" size={20} color={colors.success} />
<Text style={styles.infoText}>AI reads your policies and automatically generates quizzes. Upload files or paste text!</Text>
</View>
<View style={styles.policyFolder}>
<View style={styles.folderHeader}>
<MaterialIcons name="folder" size={24} color={colors.primary} />
<Text style={styles.folderTitle}>General Policies</Text>
<Text style={styles.folderCount}>({generalPolicies.length})</Text>
</View>
<Text style={styles.folderHint}>For all employees - AI generates quizzes from these</Text>
{generalPolicies.map((policy: any) => (
<View key={policy._id} style={styles.policyItem}>
<MaterialIcons name="description" size={20} color={colors.textSecondary} />
<View style={styles.policyItemInfo}>
<Text style={styles.policyItemTitle}>{policy.title}</Text>
<Text style={styles.policyItemMeta}>v{policy.version} - {new Date(policy.createdAt).toLocaleDateString()}</Text>
</View>
<View style={[styles.statusDot, policy.isActive ? styles.activeDot : styles.inactiveDot]} />
</View>
))}
{generalPolicies.length === 0 && <Text style={styles.emptyFolderText}>No general policies yet</Text>}
</View>
{groups?.map((group: any) => {
const gp = groupPolicies.filter((p: any) => p.targetGroupIds?.includes(group._id));
return (
<View key={group._id} style={styles.policyFolder}>
<View style={styles.folderHeader}>
<MaterialIcons name="folder-special" size={24} color={colors.secondary} />
<Text style={styles.folderTitle}>{group.name} Policies</Text>
<Text style={styles.folderCount}>({gp.length})</Text>
</View>
<Text style={styles.folderHint}>Only for {group.name}</Text>
{gp.map((policy: any) => (
<View key={policy._id} style={styles.policyItem}>
<MaterialIcons name="description" size={20} color={colors.textSecondary} />
<View style={styles.policyItemInfo}>
<Text style={styles.policyItemTitle}>{policy.title}</Text>
<Text style={styles.policyItemMeta}>v{policy.version}</Text>
</View>
<View style={[styles.statusDot, policy.isActive ? styles.activeDot : styles.inactiveDot]} />
</View>
))}
{gp.length === 0 && <Text style={styles.emptyFolderText}>No policies for this group yet</Text>}
</View>
);
})}
</ScrollView>
<Modal visible={showPolicyModal} animationType="slide" transparent>
<View style={styles.modalOverlay}>
<View style={styles.modalContentLarge}>
<View style={styles.modalHeader}>
<Text style={styles.modalTitle}>Add Policy</Text>
<TouchableOpacity onPress={() => { setShowPolicyModal(false); setPolicyTitle(''); setPolicyContent(''); setSelectedGroupIds([]); }}>
<MaterialIcons name="close" size={24} color={colors.text} />
</TouchableOpacity>
</View>
<ScrollView>
<TouchableOpacity style={[styles.aiReaderButton, processingDocument && styles.btnDisabled]} onPress={handleAutoReadDocument} disabled={processingDocument}>
{processingDocument ? <ActivityIndicator color={colors.primary} /> : (
<>
<MaterialIcons name="auto-awesome" size={24} color={colors.primary} />
<Text style={styles.aiReaderButtonText}>Pick Document - AI Reads It</Text>
</>
)}
</TouchableOpacity>
<Text style={styles.inputLabel}>Policy Title *</Text>
<TextInput style={styles.input} placeholder="Policy Title" placeholderTextColor={colors.textTertiary} value={policyTitle} onChangeText={setPolicyTitle} />
<Text style={styles.inputLabel}>Policy Content *</Text>
<TextInput style={[styles.input, styles.contentArea]} placeholder="Policy Content (or use AI reader above)" placeholderTextColor={colors.textTertiary} value={policyContent} onChangeText={setPolicyContent} multiline numberOfLines={10} />
<Text style={styles.inputLabel}>Policy Type *</Text>
<View style={styles.policyTypeContainer}>
<TouchableOpacity style={[styles.typeBtn, policyType === 'general' && styles.typeBtnActive]} onPress={() => setPolicyType('general')}>
<MaterialIcons name="public" size={20} color={policyType === 'general' ? colors.background : colors.text} />
<Text style={[styles.typeBtnText, policyType === 'general' && styles.typeBtnTextActive]}>General (All)</Text>
</TouchableOpacity>
<TouchableOpacity style={[styles.typeBtn, policyType === 'group' && styles.typeBtnActive]} onPress={() => setPolicyType('group')}>
<MaterialIcons name="group" size={20} color={policyType === 'group' ? colors.background : colors.text} />
<Text style={[styles.typeBtnText, policyType === 'group' && styles.typeBtnTextActive]}>Group-Specific</Text>
</TouchableOpacity>
</View>
{policyType === 'group' && (
<>
<Text style={styles.inputLabel}>Select Groups *</Text>
{groups && groups.length > 0 ? (
<View style={styles.groupSelectContainer}>
{groups.map((group: any) => (
<TouchableOpacity key={group._id} style={[styles.groupSelectBtn, selectedGroupIds.includes(group._id) && styles.groupSelectBtnActive]} onPress={() => toggleGroupSelection(group._id)}>
<MaterialIcons name={selectedGroupIds.includes(group._id) ? "check-box" : "check-box-outline-blank"} size={20} color={selectedGroupIds.includes(group._id) ? colors.primary : colors.textTertiary} />
<Text style={styles.groupSelectText}>{group.name}</Text>
</TouchableOpacity>
))}
</View>
) : <Text style={styles.noGroupsText}>Create groups first in the Groups tab</Text>}
</>
)}
<View style={styles.modalButtons}>
<TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowPolicyModal(false); setPolicyTitle(''); setPolicyContent(''); setPolicyType('general'); setSelectedGroupIds([]); }} disabled={isCreating}>
<Text style={styles.modalCancelText}>Cancel</Text>
</TouchableOpacity>
<TouchableOpacity style={[styles.modalConfirmBtn, isCreating && styles.btnDisabled]} onPress={handleUploadPolicy} disabled={isCreating}>
{isCreating ? <ActivityIndicator color={colors.background} size="small" /> : (
<>
<MaterialIcons name="smart-toy" size={18} color={colors.background} />
<Text style={styles.modalConfirmText}>Save & Generate</Text>
</>
)}
</TouchableOpacity>
</View>
</ScrollView>
</View>
</View>
</Modal>
</SafeAreaView>
);
}

// PROFESSIONALS TAB
if (activeTab === 'professionals') {
return (
<SafeAreaView style={styles.container} edges={['top']}>
{renderHeader()}
{renderTabs()}
<ProfessionalsManagementScreen />
</SafeAreaView>
);
}

// OVERVIEW TAB (default)
return (
<SafeAreaView style={styles.container} edges={['top']}>
{renderHeader()}
{renderTabs()}
<ScrollView style={styles.content}>
<View style={styles.statsGrid}>
<View style={styles.statCard}>
<MaterialIcons name="people" size={32} color={colors.primary} />
<Text style={styles.statValue}>{employees?.length || 0}</Text>
<Text style={styles.statLabel}>Employees</Text>
</View>
<View style={styles.statCard}>
<MaterialIcons name="folder" size={32} color={colors.secondary} />
<Text style={styles.statValue}>{groups?.length || 0}</Text>
<Text style={styles.statLabel}>Groups</Text>
</View>
<View style={styles.statCard}>
<MaterialIcons name="description" size={32} color={colors.success} />
<Text style={styles.statValue}>{policies?.length || 0}</Text>
<Text style={styles.statLabel}>Policies</Text>
</View>
<View style={styles.statCard}>
<MaterialIcons name="smart-toy" size={32} color={colors.warning} />
<Text style={styles.statValue}>AI</Text>
<Text style={styles.statLabel}>Quiz Generator</Text>
</View>
</View>
<View style={styles.quickActions}>
<Text style={styles.sectionTitle}>Quick Actions</Text>
<TouchableOpacity style={styles.actionItem} onPress={() => handleCreateInvite()}>
<MaterialIcons name="person-add" size={24} color={colors.primary} />
<Text style={styles.actionText}>Invite Employee</Text>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
<TouchableOpacity style={styles.actionItem} onPress={() => setActiveTab('groups')}>
<MaterialIcons name="create-new-folder" size={24} color={colors.primary} />
<Text style={styles.actionText}>Create Group</Text>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
<TouchableOpacity style={styles.actionItem} onPress={() => { setActiveTab('policies'); setShowPolicyModal(true); }}>
<MaterialIcons name="add-circle" size={24} color={colors.primary} />
<Text style={styles.actionText}>Add Policy</Text>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
</View>
<View style={styles.infoBox}>
<MaterialIcons name="auto-awesome" size={20} color={colors.success} />
<Text style={styles.infoText}>AI reads your policies and generates intelligent quizzes automatically at midnight.</Text>
</View>
</ScrollView>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
title: { ...typography.h2, color: colors.text },
subtitle: { ...typography.caption, color: colors.textSecondary },
logoutBtn: { padding: spacing.sm },
tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border },
tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center' },
tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
tabText: { ...typography.caption, color: colors.textSecondary },
tabTextActive: { color: colors.primary, fontWeight: '600' },
content: { flex: 1, padding: spacing.lg },
statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
statCard: { width: '47%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' },
statValue: { ...typography.h1, color: colors.text, marginTop: spacing.sm },
statLabel: { ...typography.caption, color: colors.textSecondary },
section: { marginBottom: spacing.xl },
sectionTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.md },
createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.lg },
createBtnText: { ...typography.body, color: colors.background, fontWeight: '600' },
infoBox: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.lg, alignItems: 'flex-start' },
infoText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
employeeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
employeeAvatar: { width: 44, height: 44, borderRadius: radius.full, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
employeeInfo: { flex: 1 },
employeeName: { ...typography.body, color: colors.text, fontWeight: '600' },
employeeEmail: { ...typography.caption, color: colors.textSecondary },
groupCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
groupIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.secondary + '20', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
groupInfo: { flex: 1 },
groupName: { ...typography.body, color: colors.text, fontWeight: '600' },
groupMembers: { ...typography.caption, color: colors.textSecondary },
groupDescription: { ...typography.caption, color: colors.textTertiary, marginTop: 2 },
inviteGroupBtn: { padding: spacing.sm },
codeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 4, borderLeftColor: colors.primary },
codeText: { ...typography.h4, color: colors.primary, fontFamily: 'monospace' },
codeExpiry: { ...typography.caption, color: colors.textSecondary },
emptyText: { ...typography.body, color: colors.textTertiary, textAlign: 'center', padding: spacing.xl },
quickActions: { marginBottom: spacing.xl },
actionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.md },
actionText: { flex: 1, ...typography.body, color: colors.text },
policyFolder: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
folderHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
folderTitle: { ...typography.body, color: colors.text, fontWeight: '600', flex: 1 },
folderCount: { ...typography.caption, color: colors.textTertiary },
folderHint: { ...typography.caption, color: colors.textTertiary, marginBottom: spacing.sm },
policyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
policyItemInfo: { flex: 1 },
policyItemTitle: { ...typography.body, color: colors.text },
policyItemMeta: { ...typography.caption, color: colors.textTertiary },
statusDot: { width: 8, height: 8, borderRadius: radius.full },
activeDot: { backgroundColor: colors.success },
inactiveDot: { backgroundColor: colors.textTertiary },
emptyFolderText: { ...typography.caption, color: colors.textTertiary, fontStyle: 'italic', paddingVertical: spacing.sm },
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
modalContent: { backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.xl, width: '90%', maxWidth: 400 },
modalContentLarge: { backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.xl, margin: spacing.lg, marginTop: 60, maxHeight: '85%' },
modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
modalTitle: { ...typography.h3, color: colors.text },
inputLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md, fontWeight: '600' },
modalInput: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, ...typography.body, color: colors.text, borderWidth: 1, borderColor: colors.border },
input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, ...typography.body, color: colors.text, borderWidth: 1, borderColor: colors.border },
textArea: { minHeight: 80, textAlignVertical: 'top' },
contentArea: { minHeight: 150, textAlignVertical: 'top' },
modalButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
modalCancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center' },
modalCancelText: { ...typography.body, color: colors.textSecondary },
modalConfirmBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, gap: spacing.xs },
modalConfirmText: { ...typography.body, color: colors.background, fontWeight: '600' },
btnDisabled: { opacity: 0.6 },
policyTypeContainer: { flexDirection: 'row', gap: spacing.sm },
typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
typeBtnText: { ...typography.caption, color: colors.text },
typeBtnTextActive: { color: colors.background },
groupSelectContainer: { gap: spacing.sm },
groupSelectBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface },
groupSelectBtnActive: { backgroundColor: colors.primary + '15' },
groupSelectText: { ...typography.body, color: colors.text },
noGroupsText: { ...typography.caption, color: colors.textTertiary, fontStyle: 'italic', padding: spacing.md },
aiReaderButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primary, marginBottom: spacing.md },
aiReaderButtonText: { ...typography.body, color: colors.primary, fontWeight: '600' },
});
