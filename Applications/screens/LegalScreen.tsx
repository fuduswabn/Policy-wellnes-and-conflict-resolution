import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../lib/theme';

type Tab = 'terms' | 'privacy';

interface LegalScreenProps {
initialTab?: Tab;
onClose: () => void;
}

const APP_NAME = 'Policy Training Platform';
const COMPANY_NAME = 'Policy Training';
const SUPPORT_EMAIL = 'lyfstylmanufactures@gmail.com';
const LAST_UPDATED = 'January 2025';

export default function LegalScreen({ initialTab = 'terms', onClose }: LegalScreenProps) {
const [activeTab, setActiveTab] = useState<Tab>(initialTab);

return (
<SafeAreaView style={styles.container}>
<View style={styles.header}>
<TouchableOpacity onPress={onClose} style={styles.closeBtn}>
<MaterialIcons name="arrow-back" size={24} color={colors.text} />
</TouchableOpacity>
<Text style={styles.headerTitle}>
{activeTab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
</Text>
<View style={{ width: 40 }} />
</View>

<View style={styles.tabBar}>
<TouchableOpacity
style={[styles.tab, activeTab === 'terms' && styles.tabActive]}
onPress={() => setActiveTab('terms')}
>
<MaterialIcons
name="gavel"
size={18}
color={activeTab === 'terms' ? colors.primary : colors.textTertiary}
/>
<Text style={[styles.tabText, activeTab === 'terms' && styles.tabTextActive]}>
{'Terms of Service'}
</Text>
</TouchableOpacity>
<TouchableOpacity
style={[styles.tab, activeTab === 'privacy' && styles.tabActive]}
onPress={() => setActiveTab('privacy')}
>
<MaterialIcons
name="privacy-tip"
size={18}
color={activeTab === 'privacy' ? colors.primary : colors.textTertiary}
/>
<Text style={[styles.tabText, activeTab === 'privacy' && styles.tabTextActive]}>
{'Privacy Policy'}
</Text>
</TouchableOpacity>
</View>

<ScrollView
style={styles.scrollView}
contentContainerStyle={styles.scrollContent}
showsVerticalScrollIndicator={false}
>
<Text style={styles.lastUpdated}>{'Last Updated: ' + LAST_UPDATED}</Text>

{activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}

<View style={styles.contactBox}>
<MaterialIcons name="email" size={20} color={colors.primary} />
<View style={{ flex: 1 }}>
<Text style={styles.contactTitle}>{'Questions or Concerns?'}</Text>
<Text style={styles.contactEmail}>{SUPPORT_EMAIL}</Text>
</View>
</View>
</ScrollView>
</SafeAreaView>
);
}

function SectionHeader({ number, title }: { number: string; title: string }) {
return (
<View style={styles.sectionHeader}>
<View style={styles.sectionNumber}>
<Text style={styles.sectionNumberText}>{number}</Text>
</View>
<Text style={styles.sectionTitle}>{title}</Text>
</View>
);
}

function P({ text }: { text: string }) {
return <Text style={styles.paragraph}>{text}</Text>;
}

function B({ text }: { text: string }) {
return (
<View style={styles.bulletItem}>
<View style={styles.bulletDot} />
<Text style={styles.bulletText}>{text}</Text>
</View>
);
}

function TermsContent() {
return (
<View>
<SectionHeader number="1" title="Acceptance of Terms" />
<P text={`By downloading, accessing, or using the ${APP_NAME} mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.`} />
<P text={`These Terms constitute a legally binding agreement between you and ${COMPANY_NAME}. We reserve the right to modify these Terms at any time, and your continued use of the App following any changes constitutes acceptance of those changes.`} />

<SectionHeader number="2" title="Age Requirement" />
<P text="You must be at least 18 years of age to use this App. By creating an account, you represent and warrant that you are 18 years or older. We do not knowingly collect personal information from individuals under 18." />
<B text="Users must verify their age during registration" />
<B text="Misrepresenting your age may result in immediate account termination" />
<B text="If we learn a user is under 18, their account will be terminated and data deleted" />

<SectionHeader number="3" title="Account Registration" />
<P text="To use the App, you must create an account with accurate, current, and complete information. You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account." />
<B text="Provide truthful and accurate registration information" />
<B text="Keep your password secure and confidential" />
<B text="Notify us immediately of any unauthorized use of your account" />
<B text="You are responsible for all activity under your account" />

<SectionHeader number="4" title="Permitted Use" />
<P text="This App is designed exclusively for legitimate business and compliance training purposes. You may use the App to:" />
<B text="Access and review company policies and procedures" />
<B text="Complete compliance training and quizzes" />
<B text="Communicate with AI assistants about workplace policies" />
<B text="Access wellness and conflict resolution resources" />
<B text="Track your training progress and compliance status" />

<SectionHeader number="5" title="Prohibited Conduct" />
<P text="You agree not to use the App to upload, create, transmit, or share any content that is:" />
<B text="Illegal, harmful, threatening, abusive, or harassing" />
<B text="Sexually explicit, pornographic, or containing nudity" />
<B text="Promoting hate speech, discrimination, or violence" />
<B text="False, misleading, or constituting misinformation" />
<B text="Infringing on intellectual property rights of others" />
<B text="Containing malware, viruses, or harmful code" />
<B text="Promoting self-harm, suicide, or eating disorders" />
<B text="Involving unauthorized collection of personal data" />
<B text="Spam, unsolicited advertising, or repetitive content" />

<SectionHeader number="6" title="AI Content Monitoring" />
<P text="The App uses artificial intelligence systems to actively monitor content for compliance with these Terms. Our AI systems may:" />
<B text="Screen content for prohibited material in real time" />
<B text="Flag potentially harmful or inappropriate content" />
<B text="Refuse to provide advice on restricted topics" />
<B text="Direct users to professional help for sensitive matters (crisis helplines, counselors, legal counsel)" />
<P text="When restricted content is detected, the AI will refuse the request, the content may be flagged for admin review, and serious or repeated violations may result in account suspension or termination." />

<SectionHeader number="7" title="Subscription & Payments" />
<P text="Certain features of the App require a paid subscription. By subscribing, you agree to the following:" />
<B text="All prices are listed in USD unless otherwise stated" />
<B text="Subscriptions auto-renew unless cancelled before the renewal date" />
<B text="Payment is processed through Apple App Store or Google Play" />
<B text="Refunds are subject to the policies of your app store provider" />
<B text="Free trials automatically convert to paid subscriptions if not cancelled" />

<SectionHeader number="8" title="Account Termination" />
<P text="We may suspend or terminate your account at any time if you violate these Terms, including but not limited to:" />
<B text="Uploading prohibited content" />
<B text="Engaging in illegal activities through the App" />
<B text="Misrepresenting your age or identity" />
<B text="Harassing other users or staff" />
<B text="Repeated violations detected by AI monitoring" />
<P text="Upon termination, your access to the App will be immediately revoked, your data may be deleted, and no refunds will be issued for active subscriptions." />

<SectionHeader number="9" title="Limitation of Liability" />
<P text={`The App is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied. ${COMPANY_NAME} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of data, profits, or business opportunities.`} />
<P text="AI-generated responses are for informational purposes only and do not constitute professional legal, medical, or psychological advice. Always consult qualified professionals for specific concerns." />

<SectionHeader number="10" title="Governing Law" />
<P text="These Terms shall be governed by and construed in accordance with the laws of the Republic of South Africa, including the Companies Act and the Protection of Personal Information Act (POPIA). Any disputes arising under these Terms shall be resolved through the courts of South Africa." />

<SectionHeader number="11" title="Changes to Terms" />
<P text="We reserve the right to modify these Terms at any time. We will notify users of material changes through the App or via email. Your continued use of the App after such changes constitutes acceptance of the updated Terms." />
</View>
);
}

function PrivacyContent() {
return (
<View>
<SectionHeader number="1" title="Introduction" />
<P text={`${COMPANY_NAME} ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use the ${APP_NAME} mobile application ("App").`} />
<P text="By using the App, you consent to the data practices described in this policy. We comply with the Protection of Personal Information Act (POPIA) of South Africa and other applicable data protection laws." />

<SectionHeader number="2" title="Information We Collect" />
<P text="We collect the following types of information:" />
<View style={styles.subSection}>
<Text style={styles.subSectionTitle}>{'Account Information'}</Text>
<B text="Full name and email address" />
<B text="Password (stored in encrypted form)" />
<B text="Date of birth (for age verification)" />
<B text="Role (employee, manager, or admin)" />
<B text="Company affiliation" />
</View>
<View style={styles.subSection}>
<Text style={styles.subSectionTitle}>{'Usage Data'}</Text>
<B text="Training progress and quiz results" />
<B text="Policy acknowledgment records" />
<B text="Chat interactions with AI assistants" />
<B text="Compliance scores and activity logs" />
<B text="App usage patterns and preferences" />
</View>
<View style={styles.subSection}>
<Text style={styles.subSectionTitle}>{'Device Information'}</Text>
<B text="Device type and operating system" />
<B text="App version" />
<B text="General location (country/region level only)" />
</View>

<SectionHeader number="3" title="How We Use Your Information" />
<P text="We use your personal information to:" />
<B text="Provide and maintain the App's functionality" />
<B text="Verify your identity and age eligibility" />
<B text="Deliver personalized training content and recommendations" />
<B text="Track your compliance and training progress" />
<B text="Generate AI-powered policy advice and quiz content" />
<B text="Monitor content for prohibited material using AI" />
<B text="Send notifications about policy updates and training requirements" />
<B text="Improve the App and develop new features" />
<B text="Comply with legal obligations" />

<SectionHeader number="4" title="Data Sharing & Disclosure" />
<P text="We do not sell your personal information to third parties. We may share your data in the following circumstances:" />
<B text="With your employer/company: Training progress, compliance status, and quiz results are visible to your company's managers and administrators" />
<B text="Service providers: We use trusted third-party services (such as cloud hosting and AI providers) to operate the App, who are bound by data protection agreements" />
<B text="Legal requirements: When required by law, court order, or government request" />
<B text="Safety: To protect the rights, safety, and property of our users and the public" />

<SectionHeader number="5" title="Data Security" />
<P text="We implement appropriate technical and organizational measures to protect your personal information, including:" />
<B text="Encryption of data in transit and at rest" />
<B text="Secure password hashing" />
<B text="Access controls and authentication requirements" />
<B text="Regular security assessments" />
<P text="While we strive to protect your data, no method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security of your information." />

<SectionHeader number="6" title="Data Retention" />
<P text="We retain your personal information for as long as your account is active or as needed to provide you with the App's services. After account deletion:" />
<B text="Personal account data is deleted within 30 days" />
<B text="Anonymized usage data may be retained for analytics" />
<B text="Compliance records may be retained as required by law" />
<B text="Backup copies are purged within 90 days" />

<SectionHeader number="7" title="Your Rights" />
<P text="Under POPIA and applicable data protection laws, you have the right to:" />
<B text="Access: Request a copy of the personal data we hold about you" />
<B text="Correction: Request correction of inaccurate or incomplete data" />
<B text="Deletion: Request deletion of your personal data (subject to legal retention requirements)" />
<B text="Objection: Object to the processing of your personal data" />
<B text="Portability: Request your data in a portable format" />
<B text="Withdraw consent: Withdraw your consent to data processing at any time" />
<P text={`To exercise any of these rights, contact us at ${SUPPORT_EMAIL}. We will respond to your request within 30 days.`} />

<SectionHeader number="8" title="AI & Automated Processing" />
<P text="The App uses artificial intelligence for several functions. You should be aware that:" />
<B text="AI analyzes your chat messages to provide relevant policy guidance" />
<B text="Automated content moderation screens all user input for prohibited material" />
<B text="AI generates personalized quiz questions based on your company's policies" />
<B text="Chat history is processed to improve response quality" />
<P text="AI-generated responses are not stored permanently unless part of your training record. You have the right to request human review of any automated decision that significantly affects you." />

<SectionHeader number="9" title="Children's Privacy" />
<P text="The App is not intended for use by individuals under 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from someone under 18, we will take steps to delete that information promptly." />

<SectionHeader number="10" title="International Data Transfers" />
<P text="Your data may be processed and stored on servers located outside of South Africa. When we transfer data internationally, we ensure appropriate safeguards are in place to protect your information in compliance with POPIA and other applicable laws." />

<SectionHeader number="11" title="Changes to This Policy" />
<P text={'We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy in the App and updating the "Last Updated" date. Your continued use of the App after changes are posted constitutes acceptance of the updated policy.'} />

<SectionHeader number="12" title="Contact Us" />
<P text="If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us:" />
<B text={'Email: ' + SUPPORT_EMAIL} />
<B text="Jurisdiction: Republic of South Africa" />
<B text="Response time: Within 30 days of your request" />
</View>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.background,
},
header: {
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
paddingHorizontal: spacing.lg,
paddingVertical: spacing.md,
borderBottomWidth: 1,
borderBottomColor: colors.border,
},
closeBtn: {
width: 40,
height: 40,
alignItems: 'center',
justifyContent: 'center',
},
headerTitle: {
...typography.h4,
color: colors.text,
},
tabBar: {
flexDirection: 'row',
paddingHorizontal: spacing.lg,
paddingTop: spacing.md,
gap: spacing.sm,
},
tab: {
flex: 1,
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
gap: spacing.xs,
paddingVertical: spacing.sm,
borderRadius: radius.md,
backgroundColor: colors.surface,
},
tabActive: {
backgroundColor: colors.primary + '15',
},
tabText: {
...typography.bodyMedium,
color: colors.textTertiary,
},
tabTextActive: {
color: colors.primary,
fontWeight: '600',
},
scrollView: {
flex: 1,
},
scrollContent: {
padding: spacing.lg,
paddingBottom: spacing.xxl,
},
lastUpdated: {
...typography.caption,
color: colors.textTertiary,
fontStyle: 'italic',
marginBottom: spacing.xl,
},
sectionHeader: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.md,
marginTop: spacing.xl,
marginBottom: spacing.md,
},
sectionNumber: {
width: 28,
height: 28,
borderRadius: 14,
backgroundColor: colors.primary,
alignItems: 'center',
justifyContent: 'center',
},
sectionNumberText: {
...typography.bodyMedium,
color: colors.background,
fontWeight: '700',
fontSize: 13,
},
sectionTitle: {
...typography.h4,
color: colors.text,
flex: 1,
fontSize: 18,
},
paragraph: {
...typography.body,
color: colors.textSecondary,
marginBottom: spacing.md,
lineHeight: 24,
},
bulletItem: {
flexDirection: 'row',
alignItems: 'flex-start',
paddingLeft: spacing.md,
marginBottom: spacing.sm,
gap: spacing.sm,
},
bulletDot: {
width: 6,
height: 6,
borderRadius: 3,
backgroundColor: colors.primary,
marginTop: 8,
},
bulletText: {
...typography.body,
color: colors.textSecondary,
flex: 1,
lineHeight: 22,
fontSize: 14,
},
subSection: {
marginBottom: spacing.md,
marginLeft: spacing.sm,
},
subSectionTitle: {
...typography.bodyMedium,
color: colors.text,
fontWeight: '600',
marginBottom: spacing.sm,
},
contactBox: {
flexDirection: 'row',
alignItems: 'center',
gap: spacing.md,
backgroundColor: colors.primary + '10',
borderRadius: radius.lg,
padding: spacing.lg,
marginTop: spacing.xl,
},
contactTitle: {
...typography.bodyMedium,
color: colors.text,
fontWeight: '600',
},
contactEmail: {
...typography.body,
color: colors.primary,
marginTop: spacing.xs,
},
});