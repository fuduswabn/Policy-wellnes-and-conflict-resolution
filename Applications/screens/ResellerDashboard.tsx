import React, { useState, useEffect } from "react";
import {
View,
ScrollView,
StyleSheet,
Alert,
TouchableOpacity,
Text,
TextInput,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { colors, spacing, typography } from "../lib/theme";

export default function ResellerDashboard({ resellerId }: { resellerId: string }) {
const [activeTab, setActiveTab] = useState<"dashboard" | "branding" | "companies">("dashboard");
const [branding, setBranding] = useState<any>(null);
const [loading, setLoading] = useState(false);

const updateBranding = useMutation(api.resellers.updateResellerBranding);
const getResellerInfo = useQuery(api.resellers.getReseller, { resellerId: resellerId as any });
const getBrandingInfo = useQuery(api.resellers.getResellerBranding, { resellerId: resellerId as any });
const getUsage = useQuery(api.resellers.getCurrentMonthUsage, { resellerId: resellerId as any });

useEffect(() => {
if (getBrandingInfo) {
setBranding(getBrandingInfo);
}
}, [getBrandingInfo]);

const handleBrandingUpdate = async (updates: any) => {
try {
setLoading(true);
await updateBranding({
resellerId: resellerId as any,
...updates,
});
Alert.alert("Success", "Branding updated");
setBranding({ ...branding, ...updates });
} catch (error) {
Alert.alert("Error", String(error));
} finally {
setLoading(false);
}
};

return (
<View style={styles.container}>
<View style={styles.tabBar}>
{(["dashboard", "branding", "companies"] as const).map((tab) => (
<TouchableOpacity
key={tab}
style={[styles.tab, activeTab === tab && styles.activeTab]}
onPress={() => setActiveTab(tab)}
>
<Text style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}>
{tab.charAt(0).toUpperCase() + tab.slice(1)}
</Text>
</TouchableOpacity>
))}
</View>

<ScrollView style={styles.content}>
{activeTab === "dashboard" && (
<DashboardTab resellerId={resellerId} reseller={getResellerInfo} usage={getUsage} />
)}
{activeTab === "branding" && (
<BrandingTab branding={branding} onUpdate={handleBrandingUpdate} loading={loading} />
)}
{activeTab === "companies" && (
<CompaniesTab resellerId={resellerId} />
)}
</ScrollView>
</View>
);
}

function DashboardTab({ reseller, usage }: any) {
return (
<View style={styles.section}>
<Text style={styles.sectionTitle}>Account Overview</Text>

{reseller && (
<View style={styles.card}>
<Text style={styles.label}>Plan: {reseller.subscriptionPlan}</Text>
<Text style={styles.label}>Status: {reseller.subscriptionStatus}</Text>
<Text style={styles.label}>Companies: {reseller.usedCompanies}/{reseller.maxCompanies}</Text>
</View>
)}

{usage && (
<View style={[styles.card, { marginTop: spacing.md }]}>
<Text style={styles.sectionTitle}>This Month's Usage</Text>
<Text style={styles.label}>Employees: {usage.employeesCreated}</Text>
<Text style={styles.label}>Policies: {usage.policiesUploaded}</Text>
<Text style={styles.label}>Quizzes: {usage.quizzesCreated}</Text>
<Text style={styles.label}>Storage: {usage.storageUsedMB}MB</Text>
</View>
)}

<TouchableOpacity style={styles.button}>
<Text style={styles.buttonText}>Upgrade Plan</Text>
</TouchableOpacity>
</View>
);
}

function BrandingTab({ branding, onUpdate, loading }: any) {
const [primaryColor, setPrimaryColor] = useState(branding?.primaryColor || "#3B82F6");
const [secondaryColor, setSecondaryColor] = useState(branding?.secondaryColor || "#8B5CF6");
const [accentColor, setAccentColor] = useState(branding?.accentColor || "#F59E0B");
const [companyName, setCompanyName] = useState(branding?.companyName || "");

return (
<View style={styles.section}>
<Text style={styles.sectionTitle}>Brand Customization</Text>

<View style={styles.card}>
<Text style={styles.label}>Company Name</Text>
<TextInput
style={styles.input}
placeholder="Your Company Name"
value={companyName}
onChangeText={setCompanyName}
editable={!loading}
/>

<Text style={[styles.label, { marginTop: spacing.md }]}>Primary Color</Text>
<View style={styles.colorPicker}>
<View style={[styles.colorSwatch, { backgroundColor: primaryColor }]} />
<TextInput
style={[styles.input, styles.colorInput]}
placeholder="#3B82F6"
value={primaryColor}
onChangeText={setPrimaryColor}
editable={!loading}
/>
</View>

<Text style={[styles.label, { marginTop: spacing.md }]}>Secondary Color</Text>
<View style={styles.colorPicker}>
<View style={[styles.colorSwatch, { backgroundColor: secondaryColor }]} />
<TextInput
style={[styles.input, styles.colorInput]}
placeholder="#8B5CF6"
value={secondaryColor}
onChangeText={setSecondaryColor}
editable={!loading}
/>
</View>

<Text style={[styles.label, { marginTop: spacing.md }]}>Accent Color</Text>
<View style={styles.colorPicker}>
<View style={[styles.colorSwatch, { backgroundColor: accentColor }]} />
<TextInput
style={[styles.input, styles.colorInput]}
placeholder="#F59E0B"
value={accentColor}
onChangeText={setAccentColor}
editable={!loading}
/>
</View>
</View>

<TouchableOpacity
style={[styles.button, loading && styles.buttonDisabled]}
onPress={() =>
onUpdate({
companyName,
primaryColor,
secondaryColor,
accentColor,
})
}
disabled={loading}
>
<Text style={styles.buttonText}>{loading ? "Saving..." : "Save Branding"}</Text>
</TouchableOpacity>
</View>
);
}

function CompaniesTab({ resellerId }: any) {
const companies = useQuery(api.resellers.getResellerCompanies, { resellerId: resellerId as any });

return (
<View style={styles.section}>
<Text style={styles.sectionTitle}>Your Companies</Text>

{companies && companies.length > 0 ? (
companies.map((companyId: string) => (
<View key={companyId} style={styles.card}>
<Text style={styles.label}>Company ID: {companyId}</Text>
<TouchableOpacity style={styles.button}>
<Text style={styles.buttonText}>Manage</Text>
</TouchableOpacity>
</View>
))
) : (
<Text style={styles.label}>No companies yet.</Text>
)}

<TouchableOpacity style={styles.button}>
<Text style={styles.buttonText}>+ Create Company</Text>
</TouchableOpacity>
</View>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.background,
},
tabBar: {
flexDirection: "row",
borderBottomWidth: 1,
borderBottomColor: colors.border,
backgroundColor: colors.surface,
},
tab: {
flex: 1,
paddingVertical: spacing.md,
alignItems: "center",
},
activeTab: {
borderBottomWidth: 2,
borderBottomColor: colors.primary,
},
tabLabel: {
fontSize: 12,
color: colors.textSecondary,
fontWeight: "500",
},
activeTabLabel: {
color: colors.primary,
},
content: {
flex: 1,
padding: spacing.lg,
},
section: {
marginBottom: spacing.lg,
},
sectionTitle: {
...typography.h4,
color: colors.text,
marginBottom: spacing.md,
},
card: {
backgroundColor: colors.surface,
borderRadius: 12,
padding: spacing.md,
marginBottom: spacing.md,
borderWidth: 1,
borderColor: colors.border,
},
label: {
...typography.bodyMedium,
color: colors.text,
marginBottom: spacing.sm,
},
input: {
borderWidth: 1,
borderColor: colors.border,
borderRadius: 8,
padding: spacing.sm,
fontSize: 14,
backgroundColor: colors.background,
color: colors.text,
},
colorPicker: {
flexDirection: "row",
alignItems: "center",
gap: spacing.sm,
},
colorSwatch: {
width: 40,
height: 40,
borderRadius: 8,
borderWidth: 1,
borderColor: colors.border,
},
colorInput: {
flex: 1,
},
button: {
backgroundColor: colors.primary,
borderRadius: 8,
padding: spacing.md,
alignItems: "center",
marginTop: spacing.md,
},
buttonText: {
color: "white",
fontSize: 14,
fontWeight: "600",
},
buttonDisabled: {
opacity: 0.5,
},
});
