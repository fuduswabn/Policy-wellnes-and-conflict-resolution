import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth as useAppAuth } from '../lib/auth-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { Id } from '../convex/_generated/dataModel';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { pickAndProcessDocument } from '../lib/document-processor';
import { Audio as AudioPicker } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

type TabType = 'my_cases' | 'new_case' | 'join_case' | 'saved';

export default function ConflictResolutionScreen() {
  const { user } = useAppAuth();
  const [activeTab, setActiveTab] = useState<TabType>('my_cases');
  const [selectedCaseId, setSelectedCaseId] = useState<Id<'conflictCases'> | null>(null);

  // Get user's cases
  const userCases = useQuery(
    api.conflictResolution.getUserCases,
    user?.userId ? { userId: user.userId as Id<'users'> } : 'skip'
  );

  // Get saved judgments
  const savedJudgments = useQuery(
    api.conflictResolution.getSavedJudgments,
    user?.userId ? { userId: user.userId as Id<'users'> } : 'skip'
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Please log in to access conflict resolution</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Conflict Resolution</Text>
        <Text style={styles.subtitle}>AI-Powered Mediation & Judgment</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my_cases' && styles.tabActive]}
          onPress={() => {
            setActiveTab('my_cases');
            setSelectedCaseId(null);
          }}
        >
          <MaterialIcons
            name="folder"
            size={20}
            color={activeTab === 'my_cases' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'my_cases' && styles.tabTextActive]}>
            My Cases
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'new_case' && styles.tabActive]}
          onPress={() => {
            setActiveTab('new_case');
            setSelectedCaseId(null);
          }}
        >
          <MaterialIcons
            name="add-circle"
            size={20}
            color={activeTab === 'new_case' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'new_case' && styles.tabTextActive]}>
            New Case
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'join_case' && styles.tabActive]}
          onPress={() => {
            setActiveTab('join_case');
            setSelectedCaseId(null);
          }}
        >
          <MaterialIcons
            name="group-add"
            size={20}
            color={activeTab === 'join_case' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'join_case' && styles.tabTextActive]}>
            Join Case
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'saved' && styles.tabActive]}
          onPress={() => {
            setActiveTab('saved');
            setSelectedCaseId(null);
          }}
        >
          <MaterialIcons
            name="bookmark"
            size={20}
            color={activeTab === 'saved' ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
            Saved
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {selectedCaseId ? (
          <CaseDetailView
            caseId={selectedCaseId}
            userId={user.userId as Id<'users'>}
            onBack={() => setSelectedCaseId(null)}
          />
        ) : (
          <>
            {activeTab === 'my_cases' && (
              <MyCasesTab cases={userCases || []} onSelectCase={setSelectedCaseId} />
            )}
            {activeTab === 'new_case' && (
              <NewCaseTab
                user={user}
                onCaseCreated={(caseId) => {
                  setSelectedCaseId(caseId);
                  setActiveTab('my_cases');
                }}
              />
            )}
            {activeTab === 'join_case' && (
              <JoinCaseTab
                user={user}
                onCaseJoined={(caseId) => {
                  setSelectedCaseId(caseId);
                  setActiveTab('my_cases');
                }}
              />
            )}
            {activeTab === 'saved' && <SavedJudgmentsTab judgments={savedJudgments || []} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// My Cases Tab
function MyCasesTab({
  cases,
  onSelectCase,
}: {
  cases: any[];
  onSelectCase: (id: Id<'conflictCases'>) => void;
}) {
  if (cases.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="folder-open" size={64} color={colors.textTertiary} />
        <Text style={styles.emptyText}>No cases yet</Text>
        <Text style={styles.emptySubtext}>Create a new case or join an existing one</Text>
      </View>
    );
  }

  return (
    <View style={styles.casesList}>
      {cases.map((item) => (
        <TouchableOpacity
          key={item._id}
          style={styles.caseCard}
          onPress={() => onSelectCase(item._id)}
        >
          <View style={styles.caseHeader}>
            <View>
              <Text style={styles.caseNumber}>{item.caseNumber}</Text>
              <Text style={styles.caseTitle}>{item.title}</Text>
            </View>
            <View style={[styles.statusBadge, styles[`status_${item.status}`]]}>
              <Text style={styles.statusText}>{item.status.replace(/_/g, ' ').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.caseInfo}>
            <View style={styles.caseInfoRow}>
              <MaterialIcons name="person" size={16} color={colors.textSecondary} />
              <Text style={styles.caseInfoText}>Your role: {item.userRole}</Text>
            </View>
            <View style={styles.caseInfoRow}>
              <MaterialIcons
                name={item.hasSubmittedStatement ? 'check-circle' : 'radio-button-unchecked'}
                size={16}
                color={item.hasSubmittedStatement ? colors.success : colors.textSecondary}
              />
              <Text style={styles.caseInfoText}>
                {item.hasSubmittedStatement ? 'Statement submitted' : 'Statement pending'}
              </Text>
            </View>
            {item.hasJudgment && (
              <View style={styles.caseInfoRow}>
                <MaterialIcons name="gavel" size={16} color={colors.primary} />
                <Text style={[styles.caseInfoText, { color: colors.primary, fontWeight: '600' }]}>
                  AI Judgment Available
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// New Case Tab
function NewCaseTab({
  user,
  onCaseCreated,
}: {
  user: any;
  onCaseCreated: (caseId: Id<'conflictCases'>) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const createCase = useMutation(api.conflictResolution.createCase);

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Required Fields', 'Please provide a title and description');
      return;
    }

    setCreating(true);
    try {
      const result = await createCase({
        title,
        description,
        companyId: user.companyId ? (user.companyId as Id<'companies'>) : undefined,
        userId: user.userId as Id<'users'>,
        userName: user.fullName,
        userEmail: user.email,
      });

      Alert.alert(
        'Case Created!',
        `Case Number: ${result.caseNumber}\nInvite Code: ${result.inviteCode}\n\nShare this invite code with the other party so they can join the case.`,
        [{ text: 'OK', onPress: () => onCaseCreated(result.caseId) }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create case');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.infoBox}>
        <MaterialIcons name="info" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Create a conflict case to get AI mediation. You'll receive an invite code to share with the
          other party.
        </Text>
      </View>

      <Text style={styles.inputLabel}>Case Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Brief description (e.g., Workplace Dispute)"
        placeholderTextColor={colors.textTertiary}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.inputLabel}>Case Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe the conflict and what you hope to resolve..."
        placeholderTextColor={colors.textTertiary}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={6}
      />

      <TouchableOpacity
        style={[styles.primaryButton, creating && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={creating}
      >
        {creating ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <>
            <MaterialIcons name="add-circle" size={20} color={colors.background} />
            <Text style={styles.primaryButtonText}>Create Case</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Join Case Tab
function JoinCaseTab({
  user,
  onCaseJoined,
}: {
  user: any;
  onCaseJoined: (caseId: Id<'conflictCases'>) => void;
}) {
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);

  const joinCase = useMutation(api.conflictResolution.joinCase);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Required', 'Please enter an invite code');
      return;
    }

    setJoining(true);
    try {
      const result = await joinCase({
        inviteCode: inviteCode.toUpperCase().trim(),
        userId: user.userId as Id<'users'>,
        userName: user.fullName,
        userEmail: user.email,
      });

      Alert.alert('Success', result.message, [
        { text: 'OK', onPress: () => onCaseJoined(result.caseId) },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join case');
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.infoBox}>
        <MaterialIcons name="info" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Enter the invite code shared by the other party to join their conflict case.
        </Text>
      </View>

      <Text style={styles.inputLabel}>Invite Code</Text>
      <TextInput
        style={[styles.input, styles.codeInput]}
        placeholder="XXXXXX"
        placeholderTextColor={colors.textTertiary}
        value={inviteCode}
        onChangeText={(text: string) => setInviteCode(text.toUpperCase())}
        autoCapitalize="characters"
        maxLength={6}
      />

      <TouchableOpacity
        style={[styles.primaryButton, joining && styles.buttonDisabled]}
        onPress={handleJoin}
        disabled={joining}
      >
        {joining ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <>
            <MaterialIcons name="group-add" size={20} color={colors.background} />
            <Text style={styles.primaryButtonText}>Join Case</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Saved Judgments Tab
function SavedJudgmentsTab({ judgments }: { judgments: any[] }) {
  const [selectedJudgment, setSelectedJudgment] = useState<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleReadAloud = (text: string) => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(text, {
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  if (judgments.length === 0) {
    return (
      <View style={styles.emptyState}>
        <MaterialIcons name="bookmark-border" size={64} color={colors.textTertiary} />
        <Text style={styles.emptyText}>No saved judgments</Text>
        <Text style={styles.emptySubtext}>Judgments you save will appear here</Text>
      </View>
    );
  }

  if (selectedJudgment) {
    return (
      <View style={styles.judgmentDetailContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Speech.stop();
            setIsSpeaking(false);
            setSelectedJudgment(null);
          }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          <Text style={styles.backButtonText}>Back to Saved</Text>
        </TouchableOpacity>

        <View style={styles.judgmentCard}>
          <Text style={styles.judgmentCaseTitle}>{selectedJudgment.caseTitle}</Text>
          <Text style={styles.judgmentCaseNumber}>{selectedJudgment.caseNumber}</Text>

          <TouchableOpacity
            style={styles.readAloudButton}
            onPress={() => handleReadAloud(selectedJudgment.judgment.judgmentText)}
          >
            <MaterialIcons
              name={isSpeaking ? 'volume-off' : 'volume-up'}
              size={24}
              color={colors.background}
            />
            <Text style={styles.readAloudButtonText}>
              {isSpeaking ? 'Stop Reading' : 'Read Aloud'}
            </Text>
          </TouchableOpacity>

          <ScrollView style={styles.judgmentTextContainer}>
            <Text style={styles.judgmentText}>{selectedJudgment.judgment.judgmentText}</Text>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.savedList}>
      {judgments.map((item) => (
        <TouchableOpacity
          key={item._id}
          style={styles.savedCard}
          onPress={() => setSelectedJudgment(item)}
        >
          <View style={styles.savedCardHeader}>
            <MaterialIcons name="gavel" size={24} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.savedCaseTitle}>{item.caseTitle}</Text>
              <Text style={styles.savedCaseNumber}>{item.caseNumber}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </View>
          <Text style={styles.savedSummary} numberOfLines={2}>
            {item.judgment.summary}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Case Detail View
function CaseDetailView({
  caseId,
  userId,
  onBack,
}: {
  caseId: Id<'conflictCases'>;
  userId: Id<'users'>;
  onBack: () => void;
}) {
  const caseDetails = useQuery(api.conflictResolution.getCaseDetails, { caseId });
  const [activeSection, setActiveSection] = useState<'statement' | 'witnesses' | 'evidence' | 'judgment'>('statement');

  if (!caseDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { case: conflictCase, parties, statements, witnesses, evidence, judgment } = caseDetails;
  const myParty = parties.find((p: any) => p.userId === userId);
  const myStatement = statements.find((s: any) => s.userId === userId);

  return (
    <View>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.backButtonText}>Back to Cases</Text>
      </TouchableOpacity>

      <View style={styles.caseDetailHeader}>
        <Text style={styles.caseDetailNumber}>{conflictCase.caseNumber}</Text>
        <Text style={styles.caseDetailTitle}>{conflictCase.title}</Text>
        <View style={[styles.statusBadge, styles[`status_${conflictCase.status}`]]}>
          <Text style={styles.statusText}>{conflictCase.status.replace(/_/g, ' ').toUpperCase()}</Text>
        </View>

        {conflictCase.status === 'pending_parties' && (
          <View style={styles.inviteCodeBox}>
            <Text style={styles.inviteCodeLabel}>Share this invite code:</Text>
            <Text style={styles.inviteCodeText}>{conflictCase.inviteCode}</Text>
          </View>
        )}
      </View>

      {/* Section Tabs */}
      <View style={styles.sectionTabs}>
        <TouchableOpacity
          style={[styles.sectionTab, activeSection === 'statement' && styles.sectionTabActive]}
          onPress={() => setActiveSection('statement')}
        >
          <Text style={[styles.sectionTabText, activeSection === 'statement' && styles.sectionTabTextActive]}>
            Statement
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sectionTab, activeSection === 'witnesses' && styles.sectionTabActive]}
          onPress={() => setActiveSection('witnesses')}
        >
          <Text style={[styles.sectionTabText, activeSection === 'witnesses' && styles.sectionTabTextActive]}>
            Witnesses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sectionTab, activeSection === 'evidence' && styles.sectionTabActive]}
          onPress={() => setActiveSection('evidence')}
        >
          <Text style={[styles.sectionTabText, activeSection === 'evidence' && styles.sectionTabTextActive]}>
            Evidence
          </Text>
        </TouchableOpacity>
        {judgment && (
          <TouchableOpacity
            style={[styles.sectionTab, activeSection === 'judgment' && styles.sectionTabActive]}
            onPress={() => setActiveSection('judgment')}
          >
            <Text style={[styles.sectionTabText, activeSection === 'judgment' && styles.sectionTabTextActive]}>
              Judgment
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Section Content */}
      {activeSection === 'statement' && (
        <StatementSection
          caseId={caseId}
          userId={userId}
          myStatement={myStatement}
          myParty={myParty}
        />
      )}
      {activeSection === 'witnesses' && (
        <WitnessesSection caseId={caseId} userId={userId} witnesses={witnesses} myParty={myParty} />
      )}
      {activeSection === 'evidence' && (
        <EvidenceSection caseId={caseId} userId={userId} evidence={evidence} myParty={myParty} />
      )}
      {activeSection === 'judgment' && judgment && (
        <JudgmentSection caseId={caseId} userId={userId} judgment={judgment} conflictCase={conflictCase} />
      )}

      {/* Request Judgment Button */}
      {!judgment && conflictCase.status === 'pending_statements' && (
        <RequestJudgmentButton caseId={caseId} parties={parties} />
      )}
    </View>
  );
}

// Statement Section
function StatementSection({
  caseId,
  userId,
  myStatement,
  myParty,
}: {
  caseId: Id<'conflictCases'>;
  userId: Id<'users'>;
  myStatement: any;
  myParty: any;
}) {
  const [statement, setStatement] = useState(myStatement?.statement || '');
  const [saving, setSaving] = useState(false);

  const submitStatement = useMutation(api.conflictResolution.submitStatement);

  const handleSave = async () => {
    if (!statement.trim()) {
      Alert.alert('Required', 'Please write your statement');
      return;
    }

    setSaving(true);
    try {
      await submitStatement({ caseId, userId, statement });
      Alert.alert('Success', 'Your statement has been saved');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save statement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.sectionContent}>
      <View style={styles.infoBox}>
        <MaterialIcons name="info" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Write your side of the story in detail. Include dates, events, and any relevant context.
        </Text>
      </View>

      <Text style={styles.inputLabel}>Your Statement</Text>
      <TextInput
        style={[styles.input, styles.largeTextArea]}
        placeholder="Describe your side of the conflict in detail..."
        placeholderTextColor={colors.textTertiary}
        value={statement}
        onChangeText={setStatement}
        multiline
        numberOfLines={15}
      />

      <TouchableOpacity
        style={[styles.primaryButton, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <>
            <MaterialIcons name="save" size={20} color={colors.background} />
            <Text style={styles.primaryButtonText}>
              {myStatement ? 'Update Statement' : 'Submit Statement'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Witnesses Section
function WitnessesSection({
  caseId,
  userId,
  witnesses,
  myParty,
}: {
  caseId: Id<'conflictCases'>;
  userId: Id<'users'>;
  witnesses: any[];
  myParty: any;
}) {
  const [showAddWitness, setShowAddWitness] = useState(false);
  const [witnessName, setWitnessName] = useState('');
  const [witnessContact, setWitnessContact] = useState('');
  const [witnessStatement, setWitnessStatement] = useState('');
  const [adding, setAdding] = useState(false);

  const addWitness = useMutation(api.conflictResolution.addWitness);

  const myWitnesses = witnesses.filter((w) => w.partyId === myParty?._id);

  const handleAddWitness = async () => {
    if (!witnessName.trim() || !witnessContact.trim() || !witnessStatement.trim()) {
      Alert.alert('Required', 'Please fill in all witness fields');
      return;
    }

    setAdding(true);
    try {
      await addWitness({
        caseId,
        userId,
        witnessName,
        witnessContact,
        witnessStatement,
      });
      Alert.alert('Success', 'Witness added');
      setWitnessName('');
      setWitnessContact('');
      setWitnessStatement('');
      setShowAddWitness(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add witness');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.sectionContent}>
      <View style={styles.infoBox}>
        <MaterialIcons name="info" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Add witnesses who can support your side of the story. Include their contact and statement.
        </Text>
      </View>

      {myWitnesses.length > 0 && (
        <View style={styles.witnessList}>
          {myWitnesses.map((witness) => (
            <View key={witness._id} style={styles.witnessCard}>
              <View style={styles.witnessHeader}>
                <MaterialIcons name="person" size={20} color={colors.primary} />
                <Text style={styles.witnessName}>{witness.witnessName}</Text>
              </View>
              <Text style={styles.witnessContact}>{witness.witnessContact}</Text>
              <Text style={styles.witnessStatement}>{witness.witnessStatement}</Text>
            </View>
          ))}
        </View>
      )}

      {!showAddWitness ? (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowAddWitness(true)}
        >
          <MaterialIcons name="add" size={20} color={colors.primary} />
          <Text style={styles.secondaryButtonText}>Add Witness</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.addWitnessForm}>
          <Text style={styles.inputLabel}>Witness Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={colors.textTertiary}
            value={witnessName}
            onChangeText={setWitnessName}
          />

          <Text style={styles.inputLabel}>Contact (Phone/Email)</Text>
          <TextInput
            style={styles.input}
            placeholder="Contact information"
            placeholderTextColor={colors.textTertiary}
            value={witnessContact}
            onChangeText={setWitnessContact}
          />

          <Text style={styles.inputLabel}>Witness Statement</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What this witness can confirm..."
            placeholderTextColor={colors.textTertiary}
            value={witnessStatement}
            onChangeText={setWitnessStatement}
            multiline
            numberOfLines={5}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, { flex: 1 }]}
              onPress={() => setShowAddWitness(false)}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { flex: 1 }, adding && styles.buttonDisabled]}
              onPress={handleAddWitness}
              disabled={adding}
            >
              {adding ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.primaryButtonText}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// Evidence Section
function EvidenceSection({
  caseId,
  userId,
  evidence,
  myParty,
}: {
  caseId: Id<'conflictCases'>;
  userId: Id<'users'>;
  evidence: any[];
  myParty: any;
}) {
  const [uploading, setUploading] = useState(false);

  const addEvidence = useMutation(api.conflictResolution.addEvidence);

  const myEvidence = evidence.filter((e) => e.partyId === myParty?._id);

  const handleAddEvidence = async (type: 'document' | 'image' | 'video' | 'audio') => {
    setUploading(true);
    try {
      let result: any;
      let fileName = '';
      let description = '';

      if (type === 'document') {
        const doc = await pickAndProcessDocument();
        if (!doc) {
          setUploading(false);
          return;
        }
        fileName = doc.fileName;
        description = `Document: ${doc.fileName}`;
        result = { uri: doc.uri, extractedText: doc.extractedText };
      } else if (type === 'image') {
        const imageResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.8,
        });
        if (imageResult.canceled) {
          setUploading(false);
          return;
        }
        fileName = `image_${Date.now()}.jpg`;
        description = 'Photo evidence';
        result = { uri: imageResult.assets[0].uri };
      } else if (type === 'video') {
        const videoResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: false,
        });
        if (videoResult.canceled) {
          setUploading(false);
          return;
        }
        fileName = `video_${Date.now()}.mp4`;
        description = 'Video evidence';
        result = { uri: videoResult.assets[0].uri };
      } else if (type === 'audio') {
        // For now, just simulate audio recording
        Alert.alert('Audio Recording', 'Audio recording feature - simulated for now');
        setUploading(false);
        return;
      }

      // Add evidence
      await addEvidence({
        caseId,
        userId,
        evidenceType: type,
        fileName,
        fileUrl: result.uri,
        description,
        storageId: undefined,
      });

      Alert.alert('Success', 'Evidence added');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add evidence');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.sectionContent}>
      <View style={styles.infoBox}>
        <MaterialIcons name="info" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          Upload supporting evidence like documents, photos, videos, or voice recordings.
        </Text>
      </View>

      {myEvidence.length > 0 && (
        <View style={styles.evidenceList}>
          {myEvidence.map((item) => (
            <View key={item._id} style={styles.evidenceCard}>
              <View style={styles.evidenceHeader}>
                <MaterialIcons
                  name={
                    item.evidenceType === 'document'
                      ? 'description'
                      : item.evidenceType === 'image'
                      ? 'image'
                      : item.evidenceType === 'video'
                      ? 'videocam'
                      : 'mic'
                  }
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles.evidenceFileName}>{item.fileName}</Text>
              </View>
              <Text style={styles.evidenceDescription}>{item.description}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionSubtitle}>Add Evidence</Text>
      <View style={styles.evidenceButtons}>
        <TouchableOpacity
          style={styles.evidenceButton}
          onPress={() => handleAddEvidence('document')}
          disabled={uploading}
        >
          <MaterialIcons name="description" size={32} color={colors.primary} />
          <Text style={styles.evidenceButtonText}>Document</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.evidenceButton}
          onPress={() => handleAddEvidence('image')}
          disabled={uploading}
        >
          <MaterialIcons name="image" size={32} color={colors.primary} />
          <Text style={styles.evidenceButtonText}>Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.evidenceButton}
          onPress={() => handleAddEvidence('video')}
          disabled={uploading}
        >
          <MaterialIcons name="videocam" size={32} color={colors.primary} />
          <Text style={styles.evidenceButtonText}>Video</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.evidenceButton}
          onPress={() => handleAddEvidence('audio')}
          disabled={uploading}
        >
          <MaterialIcons name="mic" size={32} color={colors.primary} />
          <Text style={styles.evidenceButtonText}>Audio</Text>
        </TouchableOpacity>
      </View>

      {uploading && (
        <View style={styles.uploadingIndicator}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.uploadingText}>Uploading evidence...</Text>
        </View>
      )}
    </View>
  );
}

// Judgment Section
function JudgmentSection({
  caseId,
  userId,
  judgment,
  conflictCase,
}: {
  caseId: Id<'conflictCases'>;
  userId: Id<'users'>;
  judgment: any;
  conflictCase: any;
}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveJudgment = useMutation(api.conflictResolution.saveJudgment);

  const handleReadAloud = () => {
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(judgment.judgmentText, {
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleSaveJudgment = async () => {
    setSaving(true);
    try {
      await saveJudgment({
        userId,
        caseId,
        judgmentId: judgment._id,
      });
      Alert.alert('Success', 'Judgment saved to your account');
    } catch (error: any) {
      Alert.alert('Info', error.message || 'Could not save judgment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.sectionContent}>
      <View style={styles.judgmentHeader}>
        <MaterialIcons name="gavel" size={32} color={colors.primary} />
        <Text style={styles.judgmentTitle}>AI Judgment</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.readAloudButton} onPress={handleReadAloud}>
          <MaterialIcons
            name={isSpeaking ? 'volume-off' : 'volume-up'}
            size={24}
            color={colors.background}
          />
          <Text style={styles.readAloudButtonText}>
            {isSpeaking ? 'Stop Reading' : 'Read Aloud'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, saving && styles.buttonDisabled]}
          onPress={handleSaveJudgment}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <MaterialIcons name="bookmark" size={20} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.judgmentContent}>
        <Text style={styles.judgmentSummary}>{judgment.summary}</Text>

        <Text style={styles.judgmentSectionTitle}>Full Judgment</Text>
        <Text style={styles.judgmentFullText}>{judgment.judgmentText}</Text>

        {judgment.recommendations && judgment.recommendations.length > 0 && (
          <>
            <Text style={styles.judgmentSectionTitle}>Recommendations</Text>
            {judgment.recommendations.map((rec: string, idx: number) => (
              <View key={idx} style={styles.recommendationItem}>
                <MaterialIcons name="check-circle" size={16} color={colors.success} />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

// Request Judgment Button
function RequestJudgmentButton({
  caseId,
  parties,
}: {
  caseId: Id<'conflictCases'>;
  parties: any[];
}) {
  const [requesting, setRequesting] = useState(false);

  const requestJudgment = useAction(api.conflictResolution.requestJudgment);

  const allSubmitted = parties.every((p) => p.hasSubmittedStatement);

  const handleRequest = async () => {
    if (!allSubmitted) {
      Alert.alert(
        'Not Ready',
        'All parties must submit their statements before requesting AI judgment.'
      );
      return;
    }

    Alert.alert(
      'Request AI Judgment',
      'This will submit all statements, witnesses, and evidence to AI for mediation. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Judgment',
          onPress: async () => {
            setRequesting(true);
            try {
              await requestJudgment({ caseId });
              Alert.alert(
                'Success',
                'AI has reviewed the case. View the judgment in the Judgment tab.'
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to request judgment');
            } finally {
              setRequesting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.requestJudgmentContainer}>
      <TouchableOpacity
        style={[
          styles.requestJudgmentButton,
          !allSubmitted && styles.buttonDisabled,
          requesting && styles.buttonDisabled,
        ]}
        onPress={handleRequest}
        disabled={!allSubmitted || requesting}
      >
        {requesting ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <>
            <MaterialIcons name="gavel" size={24} color={colors.background} />
            <Text style={styles.requestJudgmentText}>Request AI Judgment</Text>
          </>
        )}
      </TouchableOpacity>
      {!allSubmitted && (
        <Text style={styles.requestJudgmentHelp}>
          All parties must submit their statements first
        </Text>
      )}
    </View>
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.xs,
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
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl * 2,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  casesList: {
    padding: spacing.md,
    gap: spacing.md,
  },
  caseCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  caseNumber: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  caseTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  status_pending_parties: {
    backgroundColor: colors.warning + '20',
  },
  status_pending_statements: {
    backgroundColor: colors.secondary + '20',
  },
  status_under_review: {
    backgroundColor: colors.primary + '20',
  },
  status_judged: {
    backgroundColor: colors.success + '20',
  },
  status_closed: {
    backgroundColor: colors.textTertiary + '20',
  },
  statusText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
  },
  caseInfo: {
    gap: spacing.sm,
  },
  caseInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  caseInfoText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  formContainer: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '15',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoText: {
    ...typography.caption,
    color: colors.text,
    flex: 1,
  },
  inputLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  largeTextArea: {
    minHeight: 200,
    textAlignVertical: 'top',
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  backButtonText: {
    ...typography.body,
    color: colors.text,
  },
  caseDetailHeader: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    margin: spacing.md,
    gap: spacing.sm,
  },
  caseDetailNumber: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  caseDetailTitle: {
    ...typography.h3,
    color: colors.text,
  },
  inviteCodeBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primary + '15',
    borderRadius: radius.md,
    alignItems: 'center',
  },
  inviteCodeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  inviteCodeText: {
    ...typography.h2,
    color: colors.primary,
    fontFamily: 'monospace',
    letterSpacing: 4,
  },
  sectionTabs: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTab: {
    flex: 1,
    padding: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  sectionTabActive: {
    backgroundColor: colors.primary,
  },
  sectionTabText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sectionTabTextActive: {
    color: colors.background,
  },
  sectionContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionSubtitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.md,
  },
  witnessList: {
    gap: spacing.md,
  },
  witnessCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  witnessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  witnessName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  witnessContact: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  witnessStatement: {
    ...typography.body,
    color: colors.text,
    marginTop: spacing.xs,
  },
  addWitnessForm: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  evidenceList: {
    gap: spacing.md,
  },
  evidenceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  evidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  evidenceFileName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  evidenceDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  evidenceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  evidenceButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  evidenceButtonText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  uploadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  judgmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  judgmentTitle: {
    ...typography.h3,
    color: colors.text,
  },
  readAloudButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  readAloudButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  judgmentContent: {
    gap: spacing.lg,
  },
  judgmentSummary: {
    ...typography.h4,
    color: colors.primary,
    fontStyle: 'italic',
  },
  judgmentSectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.md,
  },
  judgmentFullText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  recommendationItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  recommendationText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  requestJudgmentContainer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  requestJudgmentButton: {
    backgroundColor: colors.success,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  requestJudgmentText: {
    ...typography.h4,
    color: colors.background,
    fontWeight: '700',
  },
  requestJudgmentHelp: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  savedList: {
    padding: spacing.md,
    gap: spacing.md,
  },
  savedCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  savedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedCaseTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  savedCaseNumber: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginTop: spacing.xs,
  },
  savedSummary: {
    ...typography.body,
    color: colors.textSecondary,
  },
  judgmentDetailContainer: {
    padding: spacing.md,
  },
  judgmentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  judgmentCaseTitle: {
    ...typography.h3,
    color: colors.text,
  },
  judgmentCaseNumber: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  judgmentTextContainer: {
    maxHeight: 400,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  judgmentText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.xl,
  },
});