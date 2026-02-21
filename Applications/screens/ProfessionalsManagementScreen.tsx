import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '../lib/auth-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { Id } from '../convex/_generated/dataModel';

export default function ProfessionalsManagementScreen() {
const { user } = useAuth();
const [showModal, setShowModal] = useState(false);
const [selectedType, setSelectedType] = useState<'counselor' | 'psychologist' | 'lawyer'>('counselor');
const [name, setName] = useState('');
const [phone, setPhone] = useState('');
const [email, setEmail] = useState('');
const [specialty, setSpecialty] = useState('');
const [notes, setNotes] = useState('');

const companyId = user?.companyId as Id<"companies"> | undefined;
const professionals = useQuery(
api.professionals.getCompanyProfessionals,
companyId ? { companyId } : "skip"
);

const addProfessional = useMutation(api.professionals.addProfessional);
const removeProfessional = useMutation(api.professionals.removeProfessional);

const handleAdd = async () => {
if (!companyId || !name.trim() || !phone.trim() || !email.trim()) {
Alert.alert('Error', 'Please fill in all required fields');
return;
}

try {
await addProfessional({
companyId,
type: selectedType,
name: name.trim(),
phone: phone.trim(),
email: email.trim(),
specialty: specialty.trim() || undefined,
notes: notes.trim() || undefined,
});

// Reset form
setName('');
setPhone('');
setEmail('');
setSpecialty('');
setNotes('');
setShowModal(false);

Alert.alert('Success!', `${name} has been added to your professional contacts.`);
} catch (error: any) {
Alert.alert('Error', error.message || 'Failed to add professional');
}
};

const handleRemove = (id: Id<"professionals">, name: string) => {
Alert.alert(
'Remove Professional',
`Remove ${name} from your contacts?`,
[
{ text: 'Cancel', style: 'cancel' },
{
text: 'Remove',
style: 'destructive',
onPress: async () => {
try {
await removeProfessional({ professionalId: id });
} catch (error: any) {
Alert.alert('Error', error.message);
}
},
},
]
);
};

const handleCall = (phone: string) => {
Linking.openURL(`tel:${phone}`);
};

const handleEmail = (email: string) => {
Linking.openURL(`mailto:${email}`);
};

const counselors = professionals?.filter(p => p.type === 'counselor') || [];
const psychologists = professionals?.filter(p => p.type === 'psychologist') || [];
const lawyers = professionals?.filter(p => p.type === 'lawyer') || [];

const getIcon = (type: string) => {
switch (type) {
case 'counselor': return 'psychology';
case 'psychologist': return 'medical-services';
case 'lawyer': return 'gavel';
default: return 'person';
}
};

const getColor = (type: string) => {
switch (type) {
case 'counselor': return colors.success;
case 'psychologist': return colors.secondary;
case 'lawyer': return colors.warning;
default: return colors.primary;
}
};

return (
<SafeAreaView style={styles.container} edges={['top']}>
<View style={styles.header}>
<Text style={styles.title}>Professional Support</Text>
<Text style={styles.subtitle}>Manage counselors, psychologists & lawyers</Text>
</View>

<ScrollView style={styles.content}>
<View style={styles.infoBox}>
<MaterialIcons name="info" size={20} color={colors.primary} />
<Text style={styles.infoText}>
Add professional contacts that employees can reach out to for specialized support. The AI will recommend these professionals when needed.
</Text>
</View>

<TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
<MaterialIcons name="add-circle" size={24} color={colors.background} />
<Text style={styles.addBtnText}>Add Professional</Text>
</TouchableOpacity>

{/* Counselors */}
<View style={styles.section}>
<View style={styles.sectionHeader}>
<MaterialIcons name="psychology" size={24} color={colors.success} />
<Text style={styles.sectionTitle}>Counselors ({counselors.length})</Text>
</View>
{counselors.map(pro => (
<View key={pro._id} style={styles.professionalCard}>
<View style={[styles.proIcon, { backgroundColor: colors.success + '20' }]}>
<MaterialIcons name="psychology" size={24} color={colors.success} />
</View>
<View style={styles.proInfo}>
<Text style={styles.proName}>{pro.name}</Text>
{pro.specialty && <Text style={styles.proSpecialty}>{pro.specialty}</Text>}
<View style={styles.contactRow}>
<TouchableOpacity onPress={() => handleCall(pro.phone)} style={styles.contactBtn}>
<MaterialIcons name="phone" size={16} color={colors.primary} />
<Text style={styles.contactText}>{pro.phone}</Text>
</TouchableOpacity>
<TouchableOpacity onPress={() => handleEmail(pro.email)} style={styles.contactBtn}>
<MaterialIcons name="email" size={16} color={colors.primary} />
<Text style={styles.contactText}>{pro.email}</Text>
</TouchableOpacity>
</View>
</View>
<TouchableOpacity onPress={() => handleRemove(pro._id, pro.name)} style={styles.removeBtn}>
<MaterialIcons name="delete" size={20} color={colors.error} />
</TouchableOpacity>
</View>
))}
{counselors.length === 0 && (
<Text style={styles.emptyText}>No counselors added yet</Text>
)}
</View>

{/* Psychologists */}
<View style={styles.section}>
<View style={styles.sectionHeader}>
<MaterialIcons name="medical-services" size={24} color={colors.secondary} />
<Text style={styles.sectionTitle}>Psychologists ({psychologists.length})</Text>
</View>
{psychologists.map(pro => (
<View key={pro._id} style={styles.professionalCard}>
<View style={[styles.proIcon, { backgroundColor: colors.secondary + '20' }]}>
<MaterialIcons name="medical-services" size={24} color={colors.secondary} />
</View>
<View style={styles.proInfo}>
<Text style={styles.proName}>{pro.name}</Text>
{pro.specialty && <Text style={styles.proSpecialty}>{pro.specialty}</Text>}
<View style={styles.contactRow}>
<TouchableOpacity onPress={() => handleCall(pro.phone)} style={styles.contactBtn}>
<MaterialIcons name="phone" size={16} color={colors.primary} />
<Text style={styles.contactText}>{pro.phone}</Text>
</TouchableOpacity>
<TouchableOpacity onPress={() => handleEmail(pro.email)} style={styles.contactBtn}>
<MaterialIcons name="email" size={16} color={colors.primary} />
<Text style={styles.contactText}>{pro.email}</Text>
</TouchableOpacity>
</View>
</View>
<TouchableOpacity onPress={() => handleRemove(pro._id, pro.name)} style={styles.removeBtn}>
<MaterialIcons name="delete" size={20} color={colors.error} />
</TouchableOpacity>
</View>
))}
{psychologists.length === 0 && (
<Text style={styles.emptyText}>No psychologists added yet</Text>
)}
</View>

{/* Lawyers */}
<View style={styles.section}>
<View style={styles.sectionHeader}>
<MaterialIcons name="gavel" size={24} color={colors.warning} />
<Text style={styles.sectionTitle}>Lawyers ({lawyers.length})</Text>
</View>
{lawyers.map(pro => (
<View key={pro._id} style={styles.professionalCard}>
<View style={[styles.proIcon, { backgroundColor: colors.warning + '20' }]}>
<MaterialIcons name="gavel" size={24} color={colors.warning} />
</View>
<View style={styles.proInfo}>
<Text style={styles.proName}>{pro.name}</Text>
{pro.specialty && <Text style={styles.proSpecialty}>{pro.specialty}</Text>}
<View style={styles.contactRow}>
<TouchableOpacity onPress={() => handleCall(pro.phone)} style={styles.contactBtn}>
<MaterialIcons name="phone" size={16} color={colors.primary} />
<Text style={styles.contactText}>{pro.phone}</Text>
</TouchableOpacity>
<TouchableOpacity onPress={() => handleEmail(pro.email)} style={styles.contactBtn}>
<MaterialIcons name="email" size={16} color={colors.primary} />
<Text style={styles.contactText}>{pro.email}</Text>
</TouchableOpacity>
</View>
</View>
<TouchableOpacity onPress={() => handleRemove(pro._id, pro.name)} style={styles.removeBtn}>
<MaterialIcons name="delete" size={20} color={colors.error} />
</TouchableOpacity>
</View>
))}
{lawyers.length === 0 && (
<Text style={styles.emptyText}>No lawyers added yet</Text>
)}
</View>
</ScrollView>

{/* Add Professional Modal */}
<Modal visible={showModal} transparent animationType="slide">
<View style={styles.modalOverlay}>
<View style={styles.modalContent}>
<Text style={styles.modalTitle}>Add Professional</Text>

<Text style={styles.inputLabel}>Type *</Text>
<View style={styles.typeContainer}>
{(['counselor', 'psychologist', 'lawyer'] as const).map((type) => (
<TouchableOpacity
key={type}
style={[styles.typeBtn, selectedType === type && styles.typeBtnActive]}
onPress={() => setSelectedType(type)}
>
<MaterialIcons name={getIcon(type) as any} size={20} color={selectedType === type ? colors.background : colors.text} />
<Text style={[styles.typeBtnText, selectedType === type && styles.typeBtnTextActive]}>
{type.charAt(0).toUpperCase() + type.slice(1)}
</Text>
</TouchableOpacity>
))}
</View>

<Text style={styles.inputLabel}>Name *</Text>
<TextInput
style={styles.input}
placeholder="Dr. Jane Smith"
value={name}
onChangeText={setName}
placeholderTextColor={colors.textTertiary}
/>

<Text style={styles.inputLabel}>Phone *</Text>
<TextInput
style={styles.input}
placeholder="+27 12 345 6789"
value={phone}
onChangeText={setPhone}
keyboardType="phone-pad"
placeholderTextColor={colors.textTertiary}
/>

<Text style={styles.inputLabel}>Email *</Text>
<TextInput
style={styles.input}
placeholder="professional@example.com"
value={email}
onChangeText={setEmail}
keyboardType="email-address"
autoCapitalize="none"
placeholderTextColor={colors.textTertiary}
/>

<Text style={styles.inputLabel}>Specialty (optional)</Text>
<TextInput
style={styles.input}
placeholder="e.g., Trauma, Family Law, etc."
value={specialty}
onChangeText={setSpecialty}
placeholderTextColor={colors.textTertiary}
/>

<Text style={styles.inputLabel}>Notes (optional)</Text>
<TextInput
style={[styles.input, styles.textArea]}
placeholder="Additional information..."
value={notes}
onChangeText={setNotes}
multiline
numberOfLines={3}
placeholderTextColor={colors.textTertiary}
/>

<View style={styles.modalButtons}>
<TouchableOpacity
style={styles.modalCancelBtn}
onPress={() => {
setShowModal(false);
setName('');
setPhone('');
setEmail('');
setSpecialty('');
setNotes('');
}}
>
<Text style={styles.modalCancelText}>Cancel</Text>
</TouchableOpacity>
<TouchableOpacity style={styles.modalConfirmBtn} onPress={handleAdd}>
<Text style={styles.modalConfirmText}>Add</Text>
</TouchableOpacity>
</View>
</View>
</View>
</Modal>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: colors.background },
header: { padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
title: { ...typography.h2, color: colors.text },
subtitle: { ...typography.caption, color: colors.textSecondary },
content: { flex: 1, padding: spacing.lg },
infoBox: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.lg },
infoText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.lg },
addBtnText: { ...typography.body, color: colors.background, fontWeight: '600' },
section: { marginBottom: spacing.xl },
sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
sectionTitle: { ...typography.h4, color: colors.text },
professionalCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
proIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
proInfo: { flex: 1 },
proName: { ...typography.body, color: colors.text, fontWeight: '600' },
proSpecialty: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
contactRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
contactBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
contactText: { ...typography.caption, color: colors.primary },
removeBtn: { padding: spacing.sm },
emptyText: { ...typography.caption, color: colors.textTertiary, fontStyle: 'italic', textAlign: 'center', paddingVertical: spacing.md },
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
modalContent: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, maxHeight: '90%' },
modalTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.lg },
inputLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: spacing.md, fontWeight: '600' },
input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, ...typography.body, color: colors.text, borderWidth: 1, borderColor: colors.border },
textArea: { minHeight: 80, textAlignVertical: 'top' },
typeContainer: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
typeBtn: { flex: 1, flexDirection: 'column', alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
typeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
typeBtnText: { ...typography.caption, color: colors.text, fontSize: 11 },
typeBtnTextActive: { color: colors.background },
modalButtons: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
modalCancelBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center' },
modalCancelText: { ...typography.body, color: colors.textSecondary },
modalConfirmBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center' },
modalConfirmText: { ...typography.body, color: colors.background, fontWeight: '600' },
});
