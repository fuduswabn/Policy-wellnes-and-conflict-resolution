import React, { useState } from 'react';
import {
View,
TextInput,
TouchableOpacity,
Text,
StyleSheet,
ActivityIndicator,
Alert,
ScrollView,
Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth-context';
import { colors, spacing, radius, typography } from '../lib/theme';

export default function LoginScreen() {
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const [showSignUp, setShowSignUp] = useState(false);
const [fullName, setFullName] = useState('');
const [role, setRole] = useState<'employee' | 'manager' | 'admin'>('employee');
const [companyName, setCompanyName] = useState('');
const [inviteCode, setInviteCode] = useState('');
const [showPackageSelection, setShowPackageSelection] = useState(false);
const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

const { signIn, signUp } = useAuth();

// Package data - these match monetization.yaml
const packages = [
{
id: 'free',
name: 'Free Trial',
price: 'Free for 14 days',
icon: 'timer',
color: colors.warning,
features: [
'Up to 5 employees',
'Up to 2 groups',
'Basic quizzes',
'Try before you buy',
],
},
{
id: 'starter',
name: 'Starter',
price: '$29/month',
icon: 'business',
color: colors.primary,
features: [
'Up to 10 employees',
'Up to 3 groups',
'Daily auto-generated quizzes',
'Policy management',
'Basic compliance tracking',
],
},
{
id: 'pro',
name: 'Pro',
price: '$79/month',
icon: 'trending-up',
color: colors.secondary,
popular: true,
features: [
'Up to 50 employees',
'Up to 10 groups',
'Daily auto-generated quizzes',
'Priority support',
'Advanced analytics',
'Custom branding',
],
},
{
id: 'enterprise',
name: 'Enterprise',
price: '$199/month',
icon: 'corporate-fare',
color: colors.success,
features: [
'Up to 200 employees',
'Up to 50 groups',
'Priority support',
'Dedicated account manager',
'Custom integrations',
'API access',
],
},
];

const handleSubmit = async () => {
if (!email || !password) {
Alert.alert('Error', 'Please fill in all fields');
return;
}

if (showSignUp && !fullName) {
Alert.alert('Error', 'Please enter your name');
return;
}

if (showSignUp && role === 'manager' && !companyName) {
Alert.alert('Error', 'Please enter your company name');
return;
}

if (showSignUp && role === 'employee' && !inviteCode) {
Alert.alert('Error', 'Please enter your invite code from your manager');
return;
}

// If manager signup, show package selection
if (showSignUp && role === 'manager') {
setShowPackageSelection(true);
return;
}

await completeSignUp();
};

const completeSignUp = async () => {
setLoading(true);
try {
if (showSignUp) {
await signUp(email, password, fullName, role, companyName || undefined, inviteCode || undefined);
if (role === 'manager' && selectedPackage && selectedPackage !== 'free') {
// TODO: Process payment for selected package
Alert.alert('Success!', `Your company has been created with the ${selectedPackage} plan!\n\nYour 14-day free trial starts now.`);
}
} else {
await signIn(email, password);
}
} catch (error: any) {
Alert.alert('Error', error.message || 'Something went wrong');
} finally {
setLoading(false);
setShowPackageSelection(false);
}
};

const handlePackageSelect = async (packageId: string) => {
setSelectedPackage(packageId);
await completeSignUp();
};

const resetForm = () => {
setShowSignUp(!showSignUp);
setEmail('');
setPassword('');
setFullName('');
setCompanyName('');
setInviteCode('');
setRole('employee');
setSelectedPackage(null);
};

return (
<>
<ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
<View style={styles.container}>
<View style={styles.header}>
<MaterialIcons name="school" size={64} color={colors.primary} />
<Text style={styles.title}>Policy Training</Text>
<Text style={styles.subtitle}>
{showSignUp ? 'Create your account' : 'Sign in to continue'}
</Text>
</View>

<View style={styles.form}>
{showSignUp && (
<TextInput
style={styles.input}
placeholder="Full Name"
value={fullName}
onChangeText={setFullName}
placeholderTextColor={colors.textTertiary}
/>
)}

<TextInput
style={styles.input}
placeholder="Email"
value={email}
onChangeText={setEmail}
keyboardType="email-address"
autoCapitalize="none"
placeholderTextColor={colors.textTertiary}
/>

<TextInput
style={styles.input}
placeholder="Password"
value={password}
onChangeText={setPassword}
secureTextEntry
placeholderTextColor={colors.textTertiary}
/>

{showSignUp && (
<>
<Text style={styles.roleLabel}>I am a:</Text>
<View style={styles.roleContainer}>
{(['employee', 'manager', 'admin'] as const).map((r) => (
<TouchableOpacity
key={r}
style={[styles.roleBtn, role === r && styles.roleBtnActive]}
onPress={() => setRole(r)}
>
<MaterialIcons 
name={r === 'employee' ? 'person' : r === 'manager' ? 'business' : 'admin-panel-settings'} 
size={20} 
color={role === r ? colors.background : colors.textSecondary} 
/>
<Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
{r.charAt(0).toUpperCase() + r.slice(1)}
</Text>
</TouchableOpacity>
))}
</View>

{role === 'manager' && (
<>
<TextInput
style={styles.input}
placeholder="Company Name"
value={companyName}
onChangeText={setCompanyName}
placeholderTextColor={colors.textTertiary}
/>
<View style={styles.noteBox}>
<MaterialIcons name="info" size={18} color={colors.primary} />
<Text style={styles.noteText}>
Next: Choose your subscription plan
</Text>
</View>
</>
)}

{role === 'employee' && (
<>
<TextInput
style={styles.input}
placeholder="Invite Code (from your manager)"
value={inviteCode}
onChangeText={(text) => setInviteCode(text.toUpperCase())}
autoCapitalize="characters"
placeholderTextColor={colors.textTertiary}
/>
<View style={styles.noteBox}>
<MaterialIcons name="info" size={18} color={colors.primary} />
<Text style={styles.noteText}>
Ask your manager for an invite code. You'll join their company automatically.
</Text>
</View>
</>
)}

{role === 'admin' && (
<View style={styles.noteBox}>
<MaterialIcons name="warning" size={18} color={colors.warning} />
<Text style={styles.noteText}>
Admin accounts are for platform administrators only.
</Text>
</View>
)}
</>
)}

<TouchableOpacity
style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
onPress={handleSubmit}
disabled={loading}
>
{loading ? (
<ActivityIndicator color={colors.background} />
) : (
<Text style={styles.submitBtnText}>
{showSignUp ? (role === 'manager' ? 'Choose Plan →' : 'Sign Up') : 'Sign In'}
</Text>
)}
</TouchableOpacity>

<TouchableOpacity style={styles.switchBtn} onPress={resetForm}>
<Text style={styles.switchBtnText}>
{showSignUp
? 'Already have an account? Sign In'
: "Don't have an account? Sign Up"}
</Text>
</TouchableOpacity>
</View>
</View>
</ScrollView>

{/* Package Selection Modal */}
<Modal visible={showPackageSelection} animationType="slide">
<ScrollView style={styles.packageContainer}>
<View style={styles.packageHeader}>
<TouchableOpacity onPress={() => setShowPackageSelection(false)} style={styles.backButton}>
<MaterialIcons name="arrow-back" size={24} color={colors.text} />
</TouchableOpacity>
<Text style={styles.packageTitle}>Choose Your Plan</Text>
</View>

<Text style={styles.packageSubtitle}>
Select a plan for {companyName}. All paid plans include a 14-day free trial.
</Text>

{packages.map((pkg) => (
<TouchableOpacity
key={pkg.id}
style={[
styles.packageCard,
pkg.popular && styles.packageCardPopular,
]}
onPress={() => handlePackageSelect(pkg.id)}
disabled={loading}
>
{pkg.popular && (
<View style={styles.popularBadge}>
<Text style={styles.popularText}>MOST POPULAR</Text>
</View>
)}

<View style={styles.packageCardHeader}>
<View style={[styles.packageIcon, { backgroundColor: pkg.color + '20' }]}>
<MaterialIcons name={pkg.icon as any} size={32} color={pkg.color} />
</View>
<View style={styles.packageInfo}>
<Text style={styles.packageName}>{pkg.name}</Text>
<Text style={styles.packagePrice}>{pkg.price}</Text>
</View>
</View>

<View style={styles.featuresContainer}>
{pkg.features.map((feature, index) => (
<View key={index} style={styles.featureRow}>
<MaterialIcons name="check" size={18} color={pkg.color} />
<Text style={styles.featureText}>{feature}</Text>
</View>
))}
</View>

<View style={[styles.selectPackageBtn, { backgroundColor: pkg.color }]}>
<Text style={styles.selectPackageText}>
{pkg.id === 'free' ? 'Start Free Trial' : `Select ${pkg.name}`}
</Text>
</View>
</TouchableOpacity>
))}

<Text style={styles.trialNote}>
All plans include a 14-day free trial. Cancel anytime.
</Text>
</ScrollView>
</Modal>
</>
);
}

const styles = StyleSheet.create({
scrollContainer: {
flexGrow: 1,
},
container: {
flex: 1,
backgroundColor: colors.background,
justifyContent: 'center',
padding: spacing.xl,
},
header: {
alignItems: 'center',
marginBottom: spacing.xxl,
},
title: {
...typography.h1,
color: colors.primary,
marginTop: spacing.md,
marginBottom: spacing.sm,
},
subtitle: {
...typography.body,
color: colors.textSecondary,
},
form: {
gap: spacing.md,
},
input: {
backgroundColor: colors.surface,
borderRadius: radius.md,
padding: spacing.md,
...typography.body,
color: colors.text,
borderWidth: 1,
borderColor: colors.border,
},
roleLabel: {
...typography.body,
color: colors.text,
fontWeight: '600',
marginTop: spacing.sm,
},
roleContainer: {
flexDirection: 'row',
gap: spacing.sm,
},
roleBtn: {
flex: 1,
flexDirection: 'column',
alignItems: 'center',
paddingVertical: spacing.md,
paddingHorizontal: spacing.sm,
borderRadius: radius.md,
backgroundColor: colors.surface,
borderWidth: 1,
borderColor: colors.border,
gap: spacing.xs,
},
roleBtnActive: {
backgroundColor: colors.primary,
borderColor: colors.primary,
},
roleBtnText: {
...typography.caption,
color: colors.textSecondary,
textAlign: 'center',
},
roleBtnTextActive: {
color: colors.background,
fontWeight: '600',
},
noteBox: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: colors.surface,
padding: spacing.md,
borderRadius: radius.md,
gap: spacing.sm,
},
noteText: {
...typography.caption,
color: colors.textSecondary,
flex: 1,
},
submitBtn: {
backgroundColor: colors.primary,
borderRadius: radius.md,
padding: spacing.md,
alignItems: 'center',
marginTop: spacing.md,
},
submitBtnDisabled: {
opacity: 0.7,
},
submitBtnText: {
...typography.body,
color: colors.background,
fontWeight: '600',
},
switchBtn: {
alignItems: 'center',
padding: spacing.sm,
},
switchBtnText: {
...typography.caption,
color: colors.primary,
},
// Package selection styles
packageContainer: {
flex: 1,
backgroundColor: colors.background,
},
packageHeader: {
flexDirection: 'row',
alignItems: 'center',
padding: spacing.lg,
paddingTop: 60,
borderBottomWidth: 1,
borderBottomColor: colors.border,
},
backButton: {
marginRight: spacing.md,
},
packageTitle: {
...typography.h2,
color: colors.text,
},
packageSubtitle: {
...typography.body,
color: colors.textSecondary,
padding: spacing.lg,
paddingBottom: spacing.sm,
},
packageCard: {
backgroundColor: colors.surface,
borderRadius: radius.lg,
padding: spacing.lg,
marginHorizontal: spacing.lg,
marginBottom: spacing.md,
borderWidth: 1,
borderColor: colors.border,
},
packageCardPopular: {
borderColor: colors.secondary,
borderWidth: 2,
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
popularText: {
...typography.caption,
color: colors.background,
fontWeight: '700',
fontSize: 10,
},
packageCardHeader: {
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
marginRight: spacing.md,
},
packageInfo: {
flex: 1,
},
packageName: {
...typography.h3,
color: colors.text,
},
packagePrice: {
...typography.body,
color: colors.textSecondary,
},
featuresContainer: {
marginBottom: spacing.md,
},
featureRow: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.sm,
marginBottom: spacing.xs,
},
featureText: {
...typography.body,
color: colors.text,
flex: 1,
},
selectPackageBtn: {
borderRadius: radius.md,
padding: spacing.md,
alignItems: 'center',
},
selectPackageText: {
...typography.body,
color: colors.background,
fontWeight: '600',
},
trialNote: {
...typography.caption,
color: colors.textTertiary,
textAlign: 'center',
padding: spacing.xl,
},
});
