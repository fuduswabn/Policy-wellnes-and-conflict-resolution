import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '../lib/auth-context';
import { pickAndProcessDocument, validateExtractedText } from '../lib/document-processor';
import { colors, spacing, radius, typography } from '../lib/theme';

export default function DocumentUploadScreen({ navigation }: any) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<{
    fileName: string;
    extractedText: string;
  } | null>(null);

  const createPolicy = useMutation(api.policies.createPolicy);

  const handleDocumentPick = async () => {
    if (!user?.companyId) {
      Alert.alert('Error', 'No company associated with your account');
      return;
    }

    setProcessing(true);
    try {
      const result = await pickAndProcessDocument();
      
      if (!result) {
        setProcessing(false);
        return;
      }

      // Validate extracted text
      const validation = validateExtractedText(result.extractedText);
      if (!validation.isValid) {
        Alert.alert(
          'Extraction Failed',
          validation.reason || 'Could not extract text from document'
        );
        setProcessing(false);
        return;
      }

      setUploadedDoc({
        fileName: result.fileName,
        extractedText: result.extractedText,
      });

      setProcessing(false);

      // Confirm save
      Alert.alert(
        'Document Processed',
        `Successfully extracted ${result.extractedText.length} characters from ${result.fileName}.\n\nSave as policy?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save Policy',
            onPress: () => handleSavePolicy(result.fileName, result.extractedText),
          },
        ]
      );
    } catch (error: any) {
      setProcessing(false);
      Alert.alert('Error', error.message || 'Failed to process document');
    }
  };

  const handleSavePolicy = async (fileName: string, content: string) => {
    if (!user?.companyId || !user?.userId) {
      Alert.alert('Error', 'Authentication error');
      return;
    }

    setProcessing(true);
    try {
      await createPolicy({
        title: fileName.replace(/\.[^/.]+$/, ''), // Remove file extension
        content,
        companyId: user.companyId,
        uploadedBy: user.userId,
        policyType: 'general',
        fileType: 'txt',
        fileUrl: 'processed-document',
      });

      Alert.alert('Success', 'Policy created successfully!');
      setUploadedDoc(null);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save policy');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Upload Document</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoCard}>
          <MaterialIcons name="info" size={24} color={colors.primary} />
          <Text style={styles.infoText}>
            Upload any document (PDF, Word, images, etc.) and we'll automatically extract the text content using AI.
          </Text>
        </View>

        <View style={styles.supportedFormats}>
          <Text style={styles.sectionTitle}>Supported Formats</Text>
          <View style={styles.formatGrid}>
            {[
              { icon: 'picture-as-pdf', label: 'PDF', color: colors.error },
              { icon: 'image', label: 'Images', color: colors.secondary },
              { icon: 'description', label: 'Word', color: colors.primary },
              { icon: 'text-fields', label: 'Text', color: colors.success },
            ].map((format, index) => (
              <View key={index} style={styles.formatCard}>
                <MaterialIcons name={format.icon as any} size={32} color={format.color} />
                <Text style={styles.formatLabel}>{format.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {uploadedDoc && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <MaterialIcons name="check-circle" size={24} color={colors.success} />
              <Text style={styles.previewTitle}>Document Processed</Text>
            </View>
            <Text style={styles.previewFileName}>{uploadedDoc.fileName}</Text>
            <Text style={styles.previewStats}>
              {uploadedDoc.extractedText.length} characters extracted
            </Text>
            <ScrollView style={styles.previewTextContainer} nestedScrollEnabled>
              <Text style={styles.previewText}>{uploadedDoc.extractedText}</Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => handleSavePolicy(uploadedDoc.fileName, uploadedDoc.extractedText)}
              disabled={processing}
            >
              <Text style={styles.saveBtnText}>
                {processing ? 'Saving...' : 'Save as Policy'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.uploadBtn, processing && styles.uploadBtnDisabled]}
          onPress={handleDocumentPick}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <MaterialIcons name="cloud-upload" size={32} color={colors.background} />
              <Text style={styles.uploadBtnText}>
                {uploadedDoc ? 'Upload Another Document' : 'Select Document'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {processing && (
          <Text style={styles.processingText}>
            Processing document... This may take a moment for large files.
          </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  supportedFormats: {
    marginTop: spacing.md,
  },
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  formatCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formatLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.success,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  previewTitle: {
    ...typography.h4,
    color: colors.text,
  },
  previewFileName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  previewStats: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  previewTextContainer: {
    maxHeight: 200,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewText: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 18,
  },
  saveBtn: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  saveBtnText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  uploadBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  uploadBtnDisabled: {
    opacity: 0.6,
  },
  uploadBtnText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '700',
  },
  processingText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});