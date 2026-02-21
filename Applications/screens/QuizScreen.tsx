import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuth } from '../lib/auth-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { Id } from '../convex/_generated/dataModel';

const DAILY_MOTIVATIONS = [
  "Every expert was once a beginner — keep showing up.",
  "Small daily improvements lead to stunning long-term results.",
  "You don't have to be perfect, just be consistent.",
  "Today's effort is tomorrow's expertise.",
  "The only bad training day is the one you skip.",
  "Growth happens one question at a time.",
  "Knowledge is the one thing nobody can take from you.",
  "You're building something powerful — one day at a time.",
  "Discipline today, confidence tomorrow.",
  "Progress, not perfection, is what matters.",
  "Your future self will thank you for today's effort.",
  "Learning never exhausts the mind — it ignites it.",
  "Stay curious, stay sharp, stay ahead.",
  "Champions are made in the daily grind.",
  "Every correct answer is proof you're growing.",
  "Invest in your mind — the returns are limitless.",
  "Showing up is half the battle. You already won.",
  "Be proud of how far you've come. Keep going.",
  "The more you learn, the more doors open.",
  "Consistency beats talent when talent doesn't show up.",
  "You're one quiz closer to mastery.",
  "Believe in the power of daily practice.",
  "Hard work compounds. Trust the process.",
  "Your dedication today sets the standard for tomorrow.",
  "Great things never come from comfort zones.",
  "A little progress each day adds up to big results.",
  "You are capable of more than you know.",
  "Success is the sum of small efforts repeated daily.",
  "Keep pushing — breakthroughs are closer than you think.",
  "Embrace the grind. It's shaping who you'll become.",
  "The best time to grow is right now.",
];

function getDailyMotivation(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_MOTIVATIONS[dayOfYear % DAILY_MOTIVATIONS.length];
}

interface QuizQuestion {
  _id: Id<"dailyQuizQuestions">;
  question: string;
  options: string[];
  order: number;
}

export default function QuizScreen() {
  const { user } = useAuth();
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<{ questionId: Id<"dailyQuizQuestions">, selectedAnswer: number }>>([]);
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [questionsReady, setQuestionsReady] = useState(false);
  const [isEnsuring, setIsEnsuring] = useState(false);

  const companyId = user?.companyId as Id<"companies"> | undefined;
  const userId = user?.userId as Id<"users"> | undefined;

  // Get today's scripts and quizzes
  const scripts = useQuery(
    api.dailyQuizzes.getTodayScripts,
    companyId && userId ? { userId, companyId } : "skip"
  );

  const quizzes = useQuery(
    api.dailyQuizzes.getTodayQuizzes,
    companyId && userId ? { userId, companyId } : "skip"
  );

  const questions = useQuery(
    api.dailyQuizzes.getQuizQuestions,
    selectedQuiz && questionsReady ? { quizId: selectedQuiz._id } : "skip"
  );

  const markScriptRead = useMutation(api.dailyQuizzes.markScriptAsRead);
  const submitQuiz = useMutation(api.dailyQuizzes.submitQuizAttempt);
  const generateFreshQuestions = useAction(api.dailyQuizzes.generateFreshQuizQuestions);
  const ensureTodayContent = useAction(api.dailyQuizzes.ensureTodayContent);

  // On mount: ensure today's content exists (safety net for missed cron)
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    const ensure = async () => {
      setIsEnsuring(true);
      try {
        await ensureTodayContent({ companyId });
      } catch (e) {
        console.log('ensureTodayContent failed:', e);
      } finally {
        if (!cancelled) setIsEnsuring(false);
      }
    };
    ensure();
    return () => { cancelled = true; };
  }, [companyId]);

  const handleStartQuiz = async (quiz: any) => {
    if (!userId || !companyId) return;

    setSelectedQuiz(quiz);
    setIsGenerating(true);
    setQuestionsReady(false);

    try {
      // Generate fresh questions from the user's notes/policies
      const result = await generateFreshQuestions({
        userId,
        companyId,
        quizId: quiz._id,
      });

      if (result.success && result.questionCount > 0) {
        setQuestionsReady(true);
      } else {
        Alert.alert('Error', 'Could not generate quiz questions. Make sure policies are uploaded.');
        setSelectedQuiz(null);
      }
    } catch (error: any) {
      console.error('Failed to generate questions:', error);
      Alert.alert('Error', 'Failed to generate quiz questions. Please try again.');
      setSelectedQuiz(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkRead = async () => {
    if (!selectedScript || !userId) return;
    try {
      await markScriptRead({ userId, scriptId: selectedScript._id });
      Alert.alert('Success', 'Reading marked as complete. You can now take the quiz!');
      setSelectedScript(null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSelectAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null || !questions) return;

    const currentQ = questions[currentQuestion];
    const newAnswers = [...answers, { questionId: currentQ._id, selectedAnswer }];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      // Submit quiz
      submitQuizAttempt(newAnswers);
    }
  };

  const submitQuizAttempt = async (finalAnswers: typeof answers) => {
    if (!selectedQuiz || !userId) return;
    try {
      const results = await submitQuiz({
        userId,
        quizId: selectedQuiz._id,
        answers: finalAnswers,
      });
      setQuizResults(results);
      setShowResults(true);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const resetQuiz = () => {
    setSelectedQuiz(null);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setShowResults(false);
    setQuizResults(null);
    setQuestionsReady(false);
    setIsGenerating(false);
  };

  // Reading Script Modal
  if (selectedScript) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.scriptHeader}>
          <TouchableOpacity onPress={() => setSelectedScript(null)} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.scriptTitle}>Daily Reading</Text>
        </View>

        <ScrollView style={styles.scriptContent}>
          <Text style={styles.scriptMainTitle}>{selectedScript.title}</Text>
          <Text style={styles.scriptBody}>{selectedScript.content}</Text>
        </ScrollView>

        <View style={styles.scriptFooter}>
          {selectedScript.isRead ? (
            <View style={styles.alreadyRead}>
              <MaterialIcons name="check-circle" size={24} color={colors.success} />
              <Text style={styles.alreadyReadText}>Already read</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkRead}>
              <MaterialIcons name="check" size={24} color={colors.background} />
              <Text style={styles.markReadText}>I Have Read This</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Generating questions loading screen
  if (selectedQuiz && isGenerating) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.quizHeader}>
          <TouchableOpacity onPress={resetQuiz} style={styles.backBtn}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.quizProgress}>Preparing Quiz</Text>
        </View>
        <View style={styles.generatingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.generatingTitle}>Generating Fresh Questions</Text>
          <Text style={styles.generatingSubtitle}>
            Creating 5 unique questions from your study materials...
          </Text>
          <Text style={styles.generatingHint}>
            Each question tests a different skill: understanding, application, reporting, responsibility, and consequences
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Waiting for questions to load from DB after generation
  if (selectedQuiz && questionsReady && (!questions || questions.length === 0)) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.quizHeader}>
          <TouchableOpacity onPress={resetQuiz} style={styles.backBtn}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.quizProgress}>Preparing Quiz</Text>
        </View>
        <View style={styles.generatingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.generatingTitle}>Loading Questions...</Text>
          <Text style={styles.generatingSubtitle}>
            Almost ready...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Quiz View
  if (selectedQuiz && questions && questions.length > 0) {
    // Results view
    if (showResults && quizResults) {
      return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScrollView style={styles.content}>
            <View style={styles.resultsContainer}>
              <MaterialIcons
                name={quizResults.score >= 70 ? "emoji-events" : "sentiment-dissatisfied"}
                size={80}
                color={quizResults.score >= 70 ? colors.success : colors.warning}
              />
              <Text style={styles.resultsTitle}>Quiz Complete!</Text>
              <Text style={styles.resultsScore}>{quizResults.score}%</Text>
              <Text style={styles.resultsDetails}>
                {quizResults.correctAnswers} of {quizResults.totalQuestions} correct
              </Text>

              <View style={styles.resultsMessage}>
                {quizResults.score >= 70 ? (
                  <Text style={styles.resultsMessageText}>Great job! You've passed this quiz.</Text>
                ) : (
                  <Text style={styles.resultsMessageText}>Keep studying! Review the reading material and try again tomorrow.</Text>
                )}
              </View>

              <Text style={styles.motivationText}>{getDailyMotivation()}</Text>

              <TouchableOpacity style={styles.doneBtn} onPress={resetQuiz}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    // Question view
    const question = questions[currentQuestion];

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.quizHeader}>
          <TouchableOpacity onPress={resetQuiz} style={styles.backBtn}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.quizProgress}>
            Question {currentQuestion + 1} of {questions.length}
          </Text>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentQuestion + 1) / questions.length) * 100}%` }]} />
        </View>

        <ScrollView style={styles.quizContent}>
          <Text style={styles.questionText}>{question.question}</Text>

          <View style={styles.optionsContainer}>
            {question.options.map((option: string, index: number) => (
              <TouchableOpacity
                key={index}
                style={[styles.option, selectedAnswer === index && styles.optionSelected]}
                onPress={() => handleSelectAnswer(index)}
              >
                <View style={[styles.optionRadio, selectedAnswer === index && styles.optionRadioSelected]}>
                  {selectedAnswer === index && <View style={styles.optionRadioInner} />}
                </View>
                <Text style={[styles.optionText, selectedAnswer === index && styles.optionTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.quizFooter}>
          <TouchableOpacity
            style={[styles.nextBtn, selectedAnswer === null && styles.nextBtnDisabled]}
            onPress={handleNextQuestion}
            disabled={selectedAnswer === null}
          >
            <Text style={styles.nextBtnText}>
              {currentQuestion < questions.length - 1 ? 'Next Question' : 'Submit Quiz'}
            </Text>
            <MaterialIcons name="arrow-forward" size={24} color={colors.background} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Main list view
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Training</Text>
        <Text style={styles.subtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Daily Motivation Card */}
        <View style={styles.motivationCard}>
          <MaterialIcons name="lightbulb" size={24} color={colors.primary} />
          <View style={styles.motivationCardContent}>
            <Text style={styles.motivationCardLabel}>Motivation of the Day</Text>
            <Text style={styles.motivationCardText}>{getDailyMotivation()}</Text>
          </View>
        </View>

        {/* Loading indicator while ensuring content */}
        {isEnsuring && (!scripts || scripts.length === 0) && (!quizzes || quizzes.length === 0) && (
          <View style={styles.ensuringContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.ensuringText}>Preparing today's training content...</Text>
          </View>
        )}

        {/* Reading Scripts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="menu-book" size={20} color={colors.primary} /> Today's Reading
          </Text>

          {scripts && scripts.length > 0 ? (
            scripts.map((script: any) => (
              <TouchableOpacity
                key={script._id}
                style={styles.card}
                onPress={() => setSelectedScript(script)}
              >
                <View style={styles.cardIcon}>
                  <MaterialIcons
                    name={script.isRead ? "check-circle" : "menu-book"}
                    size={28}
                    color={script.isRead ? colors.success : colors.primary}
                  />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{script.title}</Text>
                  <Text style={styles.cardMeta}>
                    {script.scriptType === 'general' ? 'General' : 'Team-specific'} •
                    {script.isRead ? ' Completed' : ' Not read'}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <MaterialIcons name="menu-book" size={40} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No reading material for today</Text>
            </View>
          )}
        </View>

        {/* Quizzes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="quiz" size={20} color={colors.secondary} /> Today's Quizzes
          </Text>

          {quizzes && quizzes.length > 0 ? (
            quizzes.map((quiz: any) => {
              const canTake = !quiz.hasScript || quiz.scriptRead;
              return (
                <TouchableOpacity
                  key={quiz._id}
                  style={[styles.card, !canTake && styles.cardDisabled]}
                  onPress={() => canTake && !quiz.completed ? handleStartQuiz(quiz) : null}
                  disabled={!canTake || quiz.completed}
                >
                  <View style={[styles.cardIcon, quiz.completed && styles.cardIconCompleted]}>
                    <MaterialIcons
                      name={quiz.completed ? "check-circle" : "quiz"}
                      size={28}
                      color={quiz.completed ? colors.success : canTake ? colors.secondary : colors.textTertiary}
                    />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, !canTake && styles.cardTitleDisabled]}>{quiz.title}</Text>
                    <Text style={styles.cardMeta}>
                      {quiz.quizType === 'general' ? 'General' : 'Team-specific'} •
                      5 questions
                    </Text>
                    {quiz.completed && (
                      <Text style={styles.cardScore}>Score: {quiz.score}%</Text>
                    )}
                    {!canTake && (
                      <Text style={styles.cardLocked}>Read the material first</Text>
                    )}
                    {canTake && !quiz.completed && (
                      <Text style={styles.cardFresh}>Fresh questions generated each time</Text>
                    )}
                  </View>
                  <MaterialIcons
                    name={quiz.completed ? "check" : canTake ? "chevron-right" : "lock"}
                    size={24}
                    color={quiz.completed ? colors.success : canTake ? colors.textTertiary : colors.textTertiary}
                  />
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <MaterialIcons name="quiz" size={40} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No quizzes for today</Text>
              <Text style={styles.emptyHint}>Quizzes are generated daily at midnight</Text>
            </View>
          )}
        </View>
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
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    gap: spacing.md,
  },
  motivationCardContent: {
    flex: 1,
  },
  motivationCardLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  motivationCardText: {
    ...typography.body,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  ensuringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  ensuringText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardIconCompleted: {
    backgroundColor: colors.success + '15',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  cardTitleDisabled: {
    color: colors.textTertiary,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardScore: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  cardLocked: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  cardFresh: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  // Script styles
  scriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    marginRight: spacing.md,
  },
  scriptTitle: {
    ...typography.h4,
    color: colors.text,
  },
  scriptContent: {
    flex: 1,
    padding: spacing.lg,
  },
  scriptMainTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  scriptBody: {
    ...typography.body,
    color: colors.text,
    lineHeight: 26,
  },
  scriptFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  markReadText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  alreadyRead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  alreadyReadText: {
    ...typography.body,
    color: colors.success,
  },
  // Quiz styles
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quizProgress: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  quizContent: {
    flex: 1,
    padding: spacing.lg,
  },
  questionText: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xl,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: colors.primary,
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  optionText: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  quizFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  nextBtnDisabled: {
    backgroundColor: colors.textTertiary,
  },
  nextBtnText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  // Results styles
  resultsContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  resultsTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
  },
  resultsScore: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.md,
  },
  resultsDetails: {
    ...typography.body,
    color: colors.textSecondary,
  },
  resultsMessage: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  resultsMessageText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  doneBtnText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  // Generating state styles
  generatingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  generatingTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  generatingSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  generatingHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.lg,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  motivationText: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
});