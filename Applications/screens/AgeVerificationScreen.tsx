import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../lib/theme';
import LegalScreen from './LegalScreen';

interface AgeVerificationScreenProps {
onContinue: () => void;
onCancel: () => void;
}

export default function AgeVerificationScreen({ onContinue, onCancel }: AgeVerificationScreenProps) {
const [day, setDay] = useState('');
const [month, setMonth] = useState('');
const [year, setYear] = useState('');
const [agreed, setAgreed] = useState(false);
const [showLegal, setShowLegal] = useState(false);
const [legalTab, setLegalTab] = useState<'terms' | 'privacy'>('terms');

const isValidDate = day && month && year && day !== '' && month !== '' && year !== '';

const calculateAge = () => {
const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
const today = new Date();
let age = today.getFullYear() - birthDate.getFullYear();
const monthDiff = today.getMonth() - birthDate.getMonth();

if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
age--;
}

return age;
};

const handleContinue = () => {
if (!isValidDate) {
Alert.alert('Error', 'Please enter a valid date of birth');
return;
}

const age = calculateAge();

if (age < 18) {
Alert.alert(
'Age Restriction',
'You must be at least 18 years old to use this service. This is a professional training platform for business use only.',
);
return;
}

if (!agreed) {
Alert.alert('Error', 'Please agree to the Terms of Service and Privacy Policy');
return;
}

onContinue();
};

return (
<SafeAreaView style={styles.container}>
<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
<View style={styles.header}>
<MaterialIcons name="verified-user" size={64} color={colors.primary} />
<Text style={styles.title}>Age Verification Required</Text>
<Text style={styles.subtitle}>This platform is for professional business use only</Text>
</View>

<View style={styles.infoBox}>
<MaterialIcons name="info" size={24} color={colors.primary} />
<Text style={styles.infoText}>
You must be 18 years or older to use this service. By continuing, you confirm you are 18+.
</Text>
</View>

<View style={styles.form}>
<Text style={styles.formLabel}>Date of Birth *</Text>

<View style={styles.dateContainer}>
<View style={styles.dateField}>
<Text style={styles.dateFieldLabel}>Day</Text>
<TextInput
style={styles.dateInput}
placeholder="DD"
value={day}
onChangeText={(text) => setDay(text.substring(0, 2))}
maxLength={2}
keyboardType="numeric"
placeholderTextColor={colors.textTertiary}
/>
</View>

<View style={styles.dateField}>
<Text style={styles.dateFieldLabel}>Month</Text>
<TextInput
style={styles.dateInput}
placeholder="MM"
value={month}
onChangeText={(text) => setMonth(text.substring(0, 2))}
maxLength={2}
keyboardType="numeric"
placeholderTextColor={colors.textTertiary}
/>
</View>

<View style={[styles.dateField, styles.dateFieldYear]}>
<Text style={styles.dateFieldLabel}>Year</Text>
<TextInput
style={styles.dateInput}
placeholder="YYYY"
value={year}
onChangeText={(text) => setYear(text.substring(0, 4))}
maxLength={4}
keyboardType="numeric"
placeholderTextColor={colors.textTertiary}
/>
</View>
</View>

{isValidDate && (
<Text style={styles.calculatedAge}>
You will be {calculateAge()} years old
</Text>
)}
</View>

<View style={styles.termsContainer}>
<TouchableOpacity 
style={styles.checkboxContainer}
onPress={() => setAgreed(!agreed)}
>
<MaterialIcons 
name={agreed ? "check-box" : "check-box-outline-blank"} 
size={24} 
color={agreed ? colors.primary : colors.textTertiary}
/>
<Text style={styles.checkboxLabel}>
I am 18 years or older and agree to the Terms of Service and Privacy Policy
</Text>
</TouchableOpacity>

<View style={styles.policiesContainer}>
<TouchableOpacity style={styles.policyLink} onPress={() => { setLegalTab('terms'); setShowLegal(true); }}>
<Text style={styles.policyLinkText}>Read Terms of Service</Text>
<MaterialIcons name="open-in-new" size={16} color={colors.primary} />
</TouchableOpacity>

<TouchableOpacity style={styles.policyLink} onPress={() => { setLegalTab('privacy'); setShowLegal(true); }}>
<Text style={styles.policyLinkText}>Privacy Policy</Text>
<MaterialIcons name="open-in-new" size={16} color={colors.primary} />
</TouchableOpacity>
</View>
</View>

<View style={styles.contentPolicy}>
<Text style={styles.contentPolicyTitle}>Content Guidelines</Text>
<View style={styles.guidelineItem}>
<MaterialIcons name="check-circle" size={20} color={colors.success} />
<Text style={styles.guidelineText}>Business and compliance training only</Text>
</View>
<View style={styles.guidelineItem}>
<MaterialIcons name="cancel" size={20} color={colors.error} />
<Text style={styles.guidelineText}>No adult or explicit content</Text>
</View>
<View style={styles.guidelineItem}>
<MaterialIcons name="cancel" size={20} color={colors.error} />
<Text style={styles.guidelineText}>No hate speech or harassment</Text>
</View>
<View style={styles.guidelineItem}>
<MaterialIcons name="cancel" size={20} color={colors.error} />
<Text style={styles.guidelineText}>No illegal content</Text>
</View>
</View>

<View style={styles.buttonContainer}>
<TouchableOpacity 
style={styles.cancelBtn}
onPress={onCancel}
>
<Text style={styles.cancelBtnText}>Cancel</Text>
</TouchableOpacity>

<TouchableOpacity 
style={[styles.continueBtn, (!isValidDate || !agreed) && styles.continueBtnDisabled]}
onPress={handleContinue}
disabled={!isValidDate || !agreed}
>
<Text style={styles.continueBtnText}>Continue</Text>
<MaterialIcons name="arrow-forward" size={20} color={colors.background} />
</TouchableOpacity>
</View>

<Text style={styles.disclaimer}>
Misrepresenting your age may result in account termination. We use AI to monitor content and compliance.
</Text>
</ScrollView>

<Modal visible={showLegal} animationType="slide">
  <LegalScreen initialTab={legalTab} onClose={() => setShowLegal(false)} />
</Modal>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.background,
},
content: {
padding: spacing.lg,
},
header: {
alignItems: 'center',
marginBottom: spacing.xl,
},
title: {
...typography.h2,
color: colors.text,
marginTop: spacing.md,
marginBottom: spacing.xs,
},
subtitle: {
...typography.body,
color: colors.textSecondary,
textAlign: 'center',
},
infoBox: {
flexDirection: 'row',
gap: spacing.md,
backgroundColor: colors.primary + '10',
borderRadius: radius.lg,
padding: spacing.md,
marginBottom: spacing.xl,
},
infoText: {
flex: 1,
...typography.body,
color: colors.text,
},
form: {
marginBottom: spacing.xl,
},
formLabel: {
...typography.body,
color: colors.text,
fontWeight: '600',
marginBottom: spacing.md,
},
dateContainer: {
flexDirection: 'row',
gap: spacing.sm,
},
dateField: {
flex: 1,
},
dateFieldYear: {
flex: 1.5,
},
dateFieldLabel: {
...typography.caption,
color: colors.textSecondary,
marginBottom: spacing.xs,
fontWeight: '600',
},
dateInput: {
backgroundColor: colors.surface,
borderRadius: radius.md,
padding: spacing.md,
...typography.h4,
color: colors.text,
borderWidth: 1,
borderColor: colors.border,
textAlign: 'center',
},
calculatedAge: {
...typography.caption,
color: colors.success,
fontWeight: '600',
marginTop: spacing.sm,
},
termsContainer: {
backgroundColor: colors.surface,
borderRadius: radius.lg,
padding: spacing.md,
marginBottom: spacing.lg,
},
checkboxContainer: {
flexDirection: 'row',
alignItems: 'flex-start',
gap: spacing.md,
marginBottom: spacing.md,
},
checkboxLabel: {
flex: 1,
...typography.body,
color: colors.text,
},
policiesContainer: {
gap: spacing.sm,
},
policyLink: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.xs,
},
policyLinkText: {
...typography.caption,
color: colors.primary,
textDecorationLine: 'underline',
},
contentPolicy: {
backgroundColor: colors.surface,
borderRadius: radius.lg,
padding: spacing.md,
marginBottom: spacing.lg,
},
contentPolicyTitle: {
...typography.body,
color: colors.text,
fontWeight: '600',
marginBottom: spacing.md,
},
guidelineItem: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.sm,
marginBottom: spacing.sm,
},
guidelineText: {
flex: 1,
...typography.caption,
color: colors.textSecondary,
},
buttonContainer: {
flexDirection: 'row',
gap: spacing.md,
marginBottom: spacing.lg,
},
cancelBtn: {
flex: 1,
paddingVertical: spacing.md,
borderRadius: radius.md,
backgroundColor: colors.surface,
alignItems: 'center',
},
cancelBtnText: {
...typography.body,
color: colors.textSecondary,
fontWeight: '600',
},
continueBtn: {
flex: 1,
flexDirection: 'row',
paddingVertical: spacing.md,
borderRadius: radius.md,
backgroundColor: colors.primary,
alignItems: 'center',
justifyContent: 'center',
gap: spacing.xs,
},
continueBtnDisabled: {
opacity: 0.5,
},
continueBtnText: {
...typography.body,
color: colors.background,
fontWeight: '600',
},
disclaimer: {
...typography.caption,
color: colors.textTertiary,
textAlign: 'center',
fontStyle: 'italic',
},
});