import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useA0Purchases } from 'a0-purchases';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id } from '../convex/_generated/dataModel';
import { colors, spacing, radius, typography } from '../lib/theme';

type PurchasesPackage = {
  identifier: string;
  product: { title: string; description?: string; priceString: string };
};

type Props = { onClose?: () => void; companyId?: Id<'companies'> };

export default function PaywallScreen({ onClose, companyId }: Props) {
  const { offerings, isLoading, isPremium, purchase, restore } = useA0Purchases();
  const setCompanyPlanFromPurchase = useMutation(api.users.setCompanyPlanFromPurchase);
  const [purchasing, setPurchasing] = useState(false);

  const packages = useMemo(() => offerings?.current?.availablePackages || [], [offerings]);

  const handlePurchase = async (packageId: string) => {
    setPurchasing(true);
    try {
      await purchase(packageId);

      if (companyId) {
        await setCompanyPlanFromPurchase({ companyId, purchasedPackageId: packageId });
      }

      Alert.alert('Success', 'Subscription activated.');
      onClose?.();
    } catch (e: any) {
      if (!e?.userCancelled) {
        Alert.alert('Purchase failed', e?.message || 'Please try again');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      Alert.alert('Restored', isPremium ? 'Subscription restored.' : 'No active subscription found.');
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message || 'Please try again');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose a Plan</Text>
        {onClose ? (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Subscriptions are billed monthly and renew automatically.</Text>

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>What you get</Text>
          <Text style={styles.feature}>• Daily auto-generated quizzes</Text>
          <Text style={styles.feature}>• Policy acknowledgements</Text>
          <Text style={styles.feature}>• Group-based training</Text>
          <Text style={styles.feature}>• Support chat</Text>
        </View>

        {isLoading || purchasing ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : packages.length > 0 ? (
          (packages as PurchasesPackage[]).map((pkg) => (
            <TouchableOpacity
              key={pkg.identifier}
              style={styles.planCard}
              onPress={() => handlePurchase(pkg.identifier)}
              disabled={purchasing}
            >
              <View style={styles.planRow}>
                <View style={styles.planIcon}>
                  <MaterialIcons name="workspace-premium" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{pkg.product.title}</Text>
                  {!!pkg.product.description && (
                    <Text style={styles.planDesc}>{pkg.product.description}</Text>
                  )}
                </View>
                <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.noProducts}>No subscription products available yet.</Text>
        )}

        <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.h3, color: colors.text },
  closeBtn: { padding: spacing.sm },
  content: { padding: spacing.lg, gap: spacing.lg },
  subtitle: { ...typography.body, color: colors.textSecondary },
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuresTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.sm },
  feature: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: { ...typography.body, color: colors.text, fontWeight: '700' },
  planDesc: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  planPrice: { ...typography.body, color: colors.primary, fontWeight: '700' },
  noProducts: { ...typography.body, color: colors.textTertiary, textAlign: 'center' },
  restoreBtn: { alignItems: 'center', padding: spacing.md },
  restoreText: { ...typography.caption, color: colors.primary },
});