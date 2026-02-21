import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useA0Purchases } from 'a0-purchases';
import { colors, spacing, radius, typography } from '../lib/theme';

interface PackageSelectionScreenProps {
onPackageSelected: (packageRef: string) => void;
onSkip: () => void; // For free trial
}

export default function PackageSelectionScreen({ onPackageSelected, onSkip }: PackageSelectionScreenProps) {
const { offerings, purchase, isPremium, isLoading } = useA0Purchases();
const [purchasing, setPurchasing] = useState(false);

const packages = offerings?.current?.availablePackages || [];

const packageDetails = {
starter_monthly: {
icon: 'business',
color: colors.primary,
features: [
'Up to 10 employees',
'Up to 3 employee groups',
'Daily auto-generated quizzes',
'Policy management',
'Basic compliance tracking',
],
},
pro_monthly: {
icon: 'trending-up',
color: colors.secondary,
features: [
'Up to 50 employees',
'Up to 10 employee groups',
'Daily auto-generated quizzes',
'Priority support',
'Advanced analytics',
'Custom branding',
],
popular: true,
},
enterprise_monthly: {
icon: 'business-center',
color: colors.success,
features: [
'Up to 200 employees',
'Up to 50 employee groups',
'Daily auto-generated quizzes',
'Priority support',
'Dedicated account manager',
'Custom integrations',
'API access',
],
},
};

const handlePurchase = async (packageIdentifier: string) => {
setPurchasing(true);
try {
await purchase(packageIdentifier);
onPackageSelected(packageIdentifier);
} catch (error: any) {
if (!error.userCancelled) {
console.error('Purchase failed:', error);
}
} finally {
setPurchasing(false);
}
};

if (isLoading) {
return (
<SafeAreaView style={styles.container}>
<View style={styles.loadingContainer}>
<ActivityIndicator size="large" color={colors.primary} />
<Text style={styles.loadingText}>Loading packages...</Text>
</View>
</SafeAreaView>
);
}

return (
<SafeAreaView style={styles.container}>
<ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
<View style={styles.header}>
<Text style={styles.title}>Choose Your Plan</Text>
<Text style={styles.subtitle}>
Select the perfect plan for your company. All plans include a 14-day free trial.
</Text>
</View>

{/* Free Trial Card */}
<TouchableOpacity style={styles.freeCard} onPress={onSkip}>
<View style={styles.freeCardHeader}>
<MaterialIcons name="schedule" size={32} color={colors.warning} />
<View style={styles.freeCardInfo}>
<Text style={styles.freeCardTitle}>Start with Free Trial</Text>
<Text style={styles.freeCardSubtitle}>14 days • No credit card required</Text>
</View>
</View>
<Text style={styles.freeCardText}>
Try out the platform with limited features. Upgrade anytime to unlock full functionality.
</Text>
<View style={styles.freeCardButton}>
<Text style={styles.freeCardButtonText}>Start Free Trial</Text>
<MaterialIcons name="arrow-forward" size={20} color={colors.primary} />
</View>
</TouchableOpacity>

<View style={styles.divider}>
<View style={styles.dividerLine} />
<Text style={styles.dividerText}>OR CHOOSE A PLAN</Text>
<View style={styles.dividerLine} />
</View>

{/* Package Cards */}
{packages.map((pkg) => {
const details = packageDetails[pkg.identifier as keyof typeof packageDetails];
if (!details) return null;

return (
<View key={pkg.identifier} style={styles.packageCard}>
{details.popular && (
<View style={styles.popularBadge}>
<Text style={styles.popularBadgeText}>MOST POPULAR</Text>
</View>
)}

<View style={styles.packageHeader}>
<View style={[styles.packageIcon, { backgroundColor: details.color + '20' }]}>
<MaterialIcons name={details.icon as any} size={32} color={details.color} />
</View>
<View style={styles.packageTitleContainer}>
<Text style={styles.packageName}>{pkg.product.title}</Text>
<Text style={styles.packagePrice}>{pkg.product.priceString}/month</Text>
</View>
</View>

{pkg.product.description && (
<Text style={styles.packageDescription}>{pkg.product.description}</Text>
)}

<View style={styles.featuresContainer}>
{details.features.map((feature, index) => (
<View key={index} style={styles.featureRow}>
<MaterialIcons name="check-circle" size={20} color={details.color} />
<Text style={styles.featureText}>{feature}</Text>
</View>
))}
</View>

<TouchableOpacity
style={[
styles.selectButton,
{ backgroundColor: details.color },
(purchasing || isPremium) && styles.selectButtonDisabled,
]}
onPress={() => handlePurchase(pkg.identifier)}
disabled={purchasing || isPremium}
>
{purchasing ? (
<ActivityIndicator color={colors.background} />
) : (
<Text style={styles.selectButtonText}>
Select {pkg.product.title}
</Text>
)}
</TouchableOpacity>

<Text style={styles.trialNote}>14-day free trial included</Text>
</View>
);
})}

{packages.length === 0 && (
<View style={styles.emptyState}>
<MaterialIcons name="error-outline" size={64} color={colors.textTertiary} />
<Text style={styles.emptyTitle}>No packages available</Text>
<Text style={styles.emptyText}>
Please contact support or start with the free trial.
</Text>
<TouchableOpacity style={styles.emptyButton} onPress={onSkip}>
<Text style={styles.emptyButtonText}>Start Free Trial</Text>
</TouchableOpacity>
</View>
)}
</ScrollView>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.background,
},
loadingContainer: {
flex: 1,
justifyContent: 'center',
alignItems: 'center',
},
loadingText: {
...typography.body,
color: colors.textSecondary,
marginTop: spacing.md,
},
scroll: {
flex: 1,
},
scrollContent: {
padding: spacing.lg,
},
header: {
marginBottom: spacing.xl,
},
title: {
...typography.h1,
color: colors.text,
marginBottom: spacing.sm,
},
subtitle: {
...typography.body,
color: colors.textSecondary,
lineHeight: 22,
},
freeCard: {
backgroundColor: colors.surface,
borderRadius: radius.lg,
padding: spacing.lg,
borderWidth: 2,
borderColor: colors.warning,
marginBottom: spacing.lg,
},
freeCardHeader: {
flexDirection: 'row',
alignItems: 'center',
marginBottom: spacing.md,
},
freeCardInfo: {
marginLeft: spacing.md,
flex: 1,
},
freeCardTitle: {
...typography.h4,
color: colors.text,
},
freeCardSubtitle: {
...typography.caption,
color: colors.textSecondary,
},
freeCardText: {
...typography.body,
color: colors.text,
marginBottom: spacing.md,
},
freeCardButton: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
gap: spacing.sm,
},
freeCardButtonText: {
...typography.body,
color: colors.primary,
fontWeight: '600',
},
divider: {
flexDirection: 'row',
alignItems: 'center',
marginVertical: spacing.xl,
},
dividerLine: {
flex: 1,
height: 1,
backgroundColor: colors.border,
},
dividerText: {
...typography.caption,
color: colors.textTertiary,
paddingHorizontal: spacing.md,
},
packageCard: {
backgroundColor: colors.surface,
borderRadius: radius.lg,
padding: spacing.lg,
marginBottom: spacing.lg,
borderWidth: 1,
borderColor: colors.border,
},
popularBadge: {
position: 'absolute',
top: -12,
right: spacing.lg,
backgroundColor: colors.secondary,
paddingHorizontal: spacing.md,
paddingVertical: spacing.xs,
borderRadius: radius.full,
},
popularBadgeText: {
...typography.caption,
color: colors.background,
fontWeight: '700',
fontSize: 10,
},
packageHeader: {
flexDirection: 'row',
alignItems: 'center',
marginBottom: spacing.md,
},
packageIcon: {
width: 56,
height: 56,
borderRadius: radius.md,
alignItems: 'center',
justifyContent: 'center',
},
packageTitleContainer: {
marginLeft: spacing.md,
flex: 1,
},
packageName: {
...typography.h3,
color: colors.text,
},
packagePrice: {
...typography.body,
color: colors.textSecondary,
marginTop: spacing.xs,
},
packageDescription: {
...typography.body,
color: colors.textSecondary,
marginBottom: spacing.md,
},
featuresContainer: {
marginBottom: spacing.lg,
},
featureRow: {
flexDirection: 'row',
alignItems: 'center',
marginBottom: spacing.sm,
gap: spacing.sm,
},
featureText: {
...typography.body,
color: colors.text,
flex: 1,
},
selectButton: {
borderRadius: radius.md,
padding: spacing.md,
alignItems: 'center',
},
selectButtonDisabled: {
opacity: 0.6,
},
selectButtonText: {
...typography.body,
color: colors.background,
fontWeight: '600',
},
trialNote: {
...typography.caption,
color: colors.textTertiary,
textAlign: 'center',
marginTop: spacing.sm,
},
emptyState: {
alignItems: 'center',
padding: spacing.xxl,
},
emptyTitle: {
...typography.h3,
color: colors.text,
marginTop: spacing.lg,
marginBottom: spacing.sm,
},
emptyText: {
...typography.body,
color: colors.textTertiary,
textAlign: 'center',
marginBottom: spacing.lg,
},
emptyButton: {
backgroundColor: colors.primary,
paddingHorizontal: spacing.xl,
paddingVertical: spacing.md,
borderRadius: radius.md,
},
emptyButtonText: {
...typography.body,
color: colors.background,
fontWeight: '600',
},
});
