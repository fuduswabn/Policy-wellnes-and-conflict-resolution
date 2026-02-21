import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '../lib/auth-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { Id } from '../convex/_generated/dataModel';

interface Policy {
_id: Id<"policies">;
title: string;
description?: string;
content: string;
policyType: string;
version: number;
acknowledged: boolean;
acknowledgedAt?: number;
}

export default function ComplianceScreen() {
const { user } = useAuth();
const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
const [acknowledging, setAcknowledging] = useState(false);
const [modalVisible, setModalVisible] = useState(false);

const companyId = user?.companyId as Id<"companies"> | undefined;
const userId = user?.userId as Id<"users"> | undefined;

const policies = useQuery(
api.policies.getEmployeePolicies, 
companyId && userId ? { employeeId: userId, companyId } : "skip"
);

const acknowledgePolicy = useMutation(api.policies.acknowledgePolicy);

const acknowledgedPolicies = policies?.filter(p => p.acknowledged) || [];
const pendingPolicies = policies?.filter(p => !p.acknowledged) || [];
const overallCompliance = policies?.length 
? Math.round((acknowledgedPolicies.length / policies.length) * 100) 
: 100;

const openPolicy = (policy: Policy) => {
setSelectedPolicy(policy);
setModalVisible(true);
};

const closeModal = () => {
setModalVisible(false);
setSelectedPolicy(null);
};

const handleAcknowledge = async () => {
if (!selectedPolicy || !userId) return;
setAcknowledging(true);
try {
await acknowledgePolicy({
employeeId: userId,
policyId: selectedPolicy._id,
});
Alert.alert('Success', 'Policy acknowledged successfully!');
closeModal();
} catch (error: any) {
Alert.alert('Error', error.message || 'Failed to acknowledge policy');
} finally {
setAcknowledging(false);
}
};

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
<View style={styles.header}>
<Text style={styles.title}>Compliance</Text>
<Text style={styles.subtitle}>{user?.companyName || 'Your Company'}</Text>
</View>

<View style={styles.progressContainer}>
<View style={styles.progressHeader}>
<Text style={styles.progressLabel}>Overall Compliance</Text>
<Text style={styles.progressValue}>{overallCompliance}%</Text>
</View>
<View style={styles.progressBar}>
<View style={[styles.progressFill, { width: `${overallCompliance}%` }]} />
</View>
<Text style={styles.progressDetails}>
{acknowledgedPolicies.length} of {policies?.length || 0} policies acknowledged
</Text>
</View>

{pendingPolicies.length > 0 && (
<View style={styles.section}>
<View style={styles.sectionHeader}>
<Text style={styles.sectionTitle}>Pending Review</Text>
<View style={styles.pendingBadge}>
<Text style={styles.pendingCount}>{pendingPolicies.length}</Text>
</View>
</View>
<Text style={styles.sectionHint}>Tap a policy to read and acknowledge</Text>
{pendingPolicies.map((policy) => (
<TouchableOpacity 
key={policy._id} 
style={styles.policyCard}
onPress={() => openPolicy(policy)}
activeOpacity={0.7}
>
<View style={styles.policyIcon}>
<MaterialIcons name="description" size={24} color={colors.warning} />
</View>
<View style={styles.policyInfo}>
<Text style={styles.policyTitle}>{policy.title}</Text>
<Text style={styles.policyMeta}>
{policy.policyType === 'general' ? 'General Policy' : 'Team Policy'} • v{policy.version}
</Text>
</View>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
))}
</View>
)}

<View style={styles.section}>
<View style={styles.sectionHeader}>
<Text style={styles.sectionTitle}>Acknowledged Policies</Text>
</View>
{acknowledgedPolicies.length > 0 ? (
acknowledgedPolicies.map((policy) => (
<TouchableOpacity 
key={policy._id} 
style={styles.policyCard}
onPress={() => openPolicy(policy)}
activeOpacity={0.7}
>
<View style={[styles.policyIcon, styles.acknowledgedIcon]}>
<MaterialIcons name="check-circle" size={24} color={colors.success} />
</View>
<View style={styles.policyInfo}>
<Text style={styles.policyTitle}>{policy.title}</Text>
<Text style={styles.policyMeta}>
Acknowledged {policy.acknowledgedAt ? new Date(policy.acknowledgedAt).toLocaleDateString() : ''}
</Text>
</View>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
))
) : (
<Text style={styles.emptyText}>No policies acknowledged yet</Text>
)}
</View>
</ScrollView>

{/* Policy Detail Modal */}
<Modal
visible={modalVisible}
animationType="slide"
presentationStyle="pageSheet"
onRequestClose={closeModal}
>
<SafeAreaView style={styles.modalContainer}>
<View style={styles.modalHeader}>
<TouchableOpacity onPress={closeModal} style={styles.closeButton}>
<MaterialIcons name="close" size={24} color={colors.text} />
</TouchableOpacity>
<Text style={styles.modalTitle} numberOfLines={1}>{selectedPolicy?.title}</Text>
<View style={{ width: 40 }} />
</View>

<ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
<View style={styles.policyHeader}>
<View style={styles.policyTypeBadge}>
<Text style={styles.policyTypeText}>
{selectedPolicy?.policyType === 'general' ? 'General Policy' : 'Team Policy'}
</Text>
</View>
<Text style={styles.policyVersion}>Version {selectedPolicy?.version}</Text>
</View>

{selectedPolicy?.description && (
<Text style={styles.policyDescription}>{selectedPolicy.description}</Text>
)}

<View style={styles.divider} />

<Text style={styles.policyContent}>{selectedPolicy?.content}</Text>
</ScrollView>

<View style={styles.modalFooter}>
{selectedPolicy && !selectedPolicy.acknowledged ? (
<TouchableOpacity 
style={[styles.acknowledgeBtn, acknowledging && styles.acknowledgeBtnDisabled]}
onPress={handleAcknowledge}
disabled={acknowledging}
activeOpacity={0.8}
>
{acknowledging ? (
<ActivityIndicator color={colors.background} />
) : (
<>
<MaterialIcons name="check" size={24} color={colors.background} />
<Text style={styles.acknowledgeBtnText}>I Acknowledge This Policy</Text>
</>
)}
</TouchableOpacity>
) : (
<View style={styles.alreadyAcknowledged}>
<MaterialIcons name="verified" size={28} color={colors.success} />
<View>
<Text style={styles.alreadyAcknowledgedText}>Already Acknowledged</Text>
<Text style={styles.acknowledgedDate}>
{selectedPolicy?.acknowledgedAt ? new Date(selectedPolicy.acknowledgedAt).toLocaleDateString() : ''}
</Text>
</View>
</View>
)}
</View>
</SafeAreaView>
</Modal>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.background,
},
scroll: {
flex: 1,
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
},
progressContainer: {
margin: spacing.lg,
padding: spacing.lg,
backgroundColor: colors.surface,
borderRadius: radius.lg,
},
progressHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: spacing.sm,
},
progressLabel: {
...typography.body,
color: colors.text,
fontWeight: '600',
},
progressValue: {
...typography.h3,
color: colors.primary,
},
progressBar: {
height: 8,
backgroundColor: colors.border,
borderRadius: radius.full,
overflow: 'hidden',
},
progressFill: {
height: '100%',
backgroundColor: colors.success,
borderRadius: radius.full,
},
progressDetails: {
...typography.caption,
color: colors.textSecondary,
marginTop: spacing.sm,
},
section: {
padding: spacing.lg,
},
sectionHeader: {
flexDirection: 'row',
alignItems: 'center',
marginBottom: spacing.sm,
gap: spacing.sm,
},
sectionTitle: {
...typography.h4,
color: colors.text,
},
sectionHint: {
...typography.caption,
color: colors.textTertiary,
marginBottom: spacing.md,
},
pendingBadge: {
backgroundColor: colors.warning,
borderRadius: radius.full,
paddingHorizontal: spacing.sm,
paddingVertical: 2,
},
pendingCount: {
...typography.caption,
color: colors.background,
fontWeight: '600',
},
policyCard: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: colors.surface,
borderRadius: radius.md,
padding: spacing.md,
marginBottom: spacing.sm,
},
policyIcon: {
width: 44,
height: 44,
borderRadius: radius.md,
backgroundColor: colors.warning + '20',
alignItems: 'center',
justifyContent: 'center',
marginRight: spacing.md,
},
acknowledgedIcon: {
backgroundColor: colors.success + '20',
},
policyInfo: {
flex: 1,
},
policyTitle: {
...typography.body,
color: colors.text,
fontWeight: '600',
},
policyMeta: {
...typography.caption,
color: colors.textSecondary,
marginTop: 2,
},
emptyText: {
...typography.body,
color: colors.textTertiary,
textAlign: 'center',
padding: spacing.xl,
},
// Modal styles
modalContainer: {
flex: 1,
backgroundColor: colors.background,
},
modalHeader: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
padding: spacing.lg,
borderBottomWidth: 1,
borderBottomColor: colors.border,
},
closeButton: {
width: 40,
height: 40,
alignItems: 'center',
justifyContent: 'center',
},
modalTitle: {
...typography.h4,
color: colors.text,
flex: 1,
textAlign: 'center',
},
modalContent: {
flex: 1,
padding: spacing.lg,
},
policyHeader: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.md,
marginBottom: spacing.lg,
},
policyTypeBadge: {
backgroundColor: colors.primary + '20',
paddingHorizontal: spacing.md,
paddingVertical: spacing.xs,
borderRadius: radius.full,
},
policyTypeText: {
...typography.caption,
color: colors.primary,
fontWeight: '600',
},
policyVersion: {
...typography.caption,
color: colors.textTertiary,
},
policyDescription: {
...typography.body,
color: colors.textSecondary,
marginBottom: spacing.md,
fontStyle: 'italic',
},
divider: {
height: 1,
backgroundColor: colors.border,
marginVertical: spacing.lg,
},
policyContent: {
...typography.body,
color: colors.text,
lineHeight: 26,
},
modalFooter: {
padding: spacing.lg,
borderTopWidth: 1,
borderTopColor: colors.border,
backgroundColor: colors.background,
},
acknowledgeBtn: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
backgroundColor: colors.primary,
borderRadius: radius.md,
padding: spacing.md,
gap: spacing.sm,
},
acknowledgeBtnDisabled: {
opacity: 0.7,
},
acknowledgeBtnText: {
...typography.body,
color: colors.background,
fontWeight: '600',
},
alreadyAcknowledged: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
gap: spacing.md,
padding: spacing.md,
backgroundColor: colors.success + '10',
borderRadius: radius.md,
},
alreadyAcknowledgedText: {
...typography.body,
color: colors.success,
fontWeight: '600',
},
acknowledgedDate: {
...typography.caption,
color: colors.textSecondary,
},
});
