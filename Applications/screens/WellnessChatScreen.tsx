import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '../lib/auth-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { API_KEYS, detectRestrictedTopic, AI_PROMPTS } from '../lib/config';
import { Id } from '../convex/_generated/dataModel';

interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export default function WellnessChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      text: "Hello! I'm here to support your wellbeing. This is a safe, confidential space. How are you feeling today?",
      timestamp: Date.now(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProfessionals, setShowProfessionals] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const companyId = user?.companyId as Id<"companies"> | undefined;
  const professionals = useQuery(
    api.professionals.getCompanyProfessionals,
    companyId ? { companyId } : "skip"
  );

  // Filter counselors and psychologists
  const mentalHealthPros = professionals?.filter(
    p => p.type === 'counselor' || p.type === 'psychologist'
  ) || [];

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    // Check for restricted topics BEFORE sending
    const safety = detectRestrictedTopic(input);
    if (safety.isRestricted && safety.severity === 'critical') {
      let crisisMessage = '';
      if (safety.topic === 'suicide') {
        crisisMessage = "I'm very concerned about what you've shared. Please reach out for immediate help:\n\n🚨 Emergency: 911 or 112\n📞 Crisis Helpline: [Your local crisis line]\n\nYou matter, and there are people who want to help you right now.";
        
        if (mentalHealthPros.length > 0) {
          crisisMessage += "\n\nYour company also provides these professionals:\n\n";
          mentalHealthPros.forEach(pro => {
            crisisMessage += `${pro.name}\n📞 ${pro.phone}\n✉️ ${pro.email}\n\n`;
          });
        }
      } else if (safety.topic === 'violence') {
        crisisMessage = "I'm concerned about what you've mentioned. If you or someone else is in danger:\n\n🚨 Emergency: 911 or 112\n👮 Report to Security/Police immediately\n\nI cannot provide advice on violent situations. Please seek immediate professional help.";
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: crisisMessage,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'user',
        text: input.trim(),
        timestamp: Date.now(),
      }, aiMessage]);
      setInput('');
      setShowProfessionals(true);
      return;
    }

    // Continue with normal AI response
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input;
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(API_KEYS.ai_api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: AI_PROMPTS.wellness,
            },
            ...messages.map(m => ({
              role: m.type === 'user' ? 'user' : 'assistant',
              content: m.text,
            })),
            {
              role: 'user',
              content: userInput,
            },
          ],
        }),
      });

      const data = await response.json();
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: data.completion || "I'm here to listen. Can you tell me more about how you're feeling?",
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        text: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <MaterialIcons name="spa" size={32} color={colors.success} />
        <View style={styles.headerInfo}>
          <Text style={styles.title}>Wellness Support</Text>
          <Text style={styles.subtitle}>Confidential • AI-Powered</Text>
        </View>
        {mentalHealthPros.length > 0 && (
          <TouchableOpacity onPress={() => setShowProfessionals(!showProfessionals)} style={styles.prosBtn}>
            <MaterialIcons name="contacts" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {showProfessionals && mentalHealthPros.length > 0 && (
        <View style={styles.professionalsBar}>
          <Text style={styles.professionalsTitle}>Available Professionals:</Text>
          {mentalHealthPros.map(pro => (
            <View key={pro._id} style={styles.professionalItem}>
              <Text style={styles.professionalName}>
                {pro.name} {pro.specialty && `(${pro.specialty})`}
              </Text>
              <View style={styles.professionalContact}>
                <TouchableOpacity onPress={() => handleCall(pro.phone)} style={styles.contactBtnSmall}>
                  <MaterialIcons name="phone" size={14} color={colors.primary} />
                  <Text style={styles.contactTextSmall}>{pro.phone}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleEmail(pro.email)} style={styles.contactBtnSmall}>
                  <MaterialIcons name="email" size={14} color={colors.primary} />
                  <Text style={styles.contactTextSmall}>{pro.email}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoBar}>
        <MaterialIcons name="lock" size={16} color={colors.success} />
        <Text style={styles.infoText}>
          Private and confidential. Not monitored by your employer.
        </Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView 
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.messageRow, msg.type === 'user' && styles.messageRowUser]}>
              <View style={[styles.messageBubble, msg.type === 'user' ? styles.messageBubbleUser : styles.messageBubbleAI]}>
                <Text style={[styles.messageText, msg.type === 'user' && styles.messageTextUser]}>
                  {msg.text}
                </Text>
                <Text style={[styles.messageTime, msg.type === 'user' && styles.messageTimeUser]}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.success} />
              <Text style={styles.loadingText}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Share how you're feeling..."
            value={input}
            onChangeText={setInput}
            placeholderTextColor={colors.textTertiary}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <MaterialIcons name="send" size={24} color={input.trim() && !loading ? colors.background : colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <View style={styles.disclaimer}>
        <MaterialIcons name="info" size={14} color={colors.textTertiary} />
        <Text style={styles.disclaimerText}>
          If you're in crisis, please contact a professional helpline immediately.
        </Text>
      </View>
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
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  prosBtn: {
    padding: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: radius.lg,
  },
  professionalsBar: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  professionalsTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  professionalItem: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  professionalName: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  professionalContact: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contactBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  contactTextSmall: {
    ...typography.caption,
    color: colors.text,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.success + '15',
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  infoText: {
    ...typography.caption,
    color: colors.success,
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.lg,
  },
  messageRow: {
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  messageRowUser: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  messageBubbleUser: {
    backgroundColor: colors.success,
    borderBottomRightRadius: radius.sm,
  },
  messageBubbleAI: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radius.sm,
  },
  messageText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  messageTextUser: {
    color: colors.background,
  },
  messageTime: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    fontSize: 11,
  },
  messageTimeUser: {
    color: 'rgba(255,255,255,0.7)',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.surface,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  disclaimerText: {
    ...typography.caption,
    color: colors.textTertiary,
    fontSize: 10,
    flex: 1,
  },
});