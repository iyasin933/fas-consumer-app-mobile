import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveTripsSection } from '@/features/home/components/ActiveTripsSection';
import { HomePromoBanner } from '@/features/home/components/HomePromoBanner';
import { HomeSearchHeader } from '@/features/home/components/HomeSearchHeader';
import { HomeServiceGrid } from '@/features/home/components/HomeServiceGrid';
import { useTheme } from '@/hooks/useTheme';

/** Main “home” feed (tabs add their own `HomeBottomNavigation`). */
export function HomeDashboardScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.root}>
        <HomeSearchHeader />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <HomePromoBanner />
          <HomeServiceGrid />
          <ActiveTripsSection />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 8 },
});
