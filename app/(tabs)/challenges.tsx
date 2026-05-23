import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { theme } from '@/constants/theme';

const categories = ['All', 'Consistency', 'Sleep', 'Movement', 'Stress', 'Energy'];

const challengesData = [
  { id: '1', title: '7-Day Energy Reset', subtitle: 'Best for busy professionals rebuilding consistency', categories: ['Consistency', 'Energy'] },
  { id: '2', title: 'Sleep Reset Sprint', subtitle: 'Short challenge for better sleep timing and recovery', categories: ['Sleep'] },
  { id: '3', title: 'Stress Recovery Week', subtitle: 'Reduce mental load with lighter daily tasks', categories: ['Stress'] },
  { id: '4', title: 'Hydration Catalyst', subtitle: 'Build the foundational water intake habit', categories: ['Consistency', 'Movement'] },
  { id: '5', title: 'Weekend Buffer Plan', subtitle: 'Avoid the typical weekend drop-off and protect your streak', categories: ['Consistency', 'Stress'] },
];

export default function ChallengesScreen() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredChallenges = selectedCategory === 'All'
    ? challengesData
    : challengesData.filter(item => item.categories.includes(selectedCategory));

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <SectionHeader title="Challenges" subtitle="Choose a challenge that fits your current energy and lifestyle" />
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((item) => {
            const isActive = selectedCategory === item;
            return (
              <Card
                key={item}
                onPress={() => setSelectedCategory(item)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                  borderColor: isActive ? theme.colors.primary : theme.colors.border,
                }}
              >
                <AppText 
                  variant="caption" 
                  style={{ 
                    fontWeight: isActive ? '700' : '400',
                    color: isActive ? '#000' : theme.colors.text 
                  }}
                >
                  {item}
                </AppText>
              </Card>
            );
          })}
        </View>

        {filteredChallenges.map((challenge) => (
          <Card 
            key={challenge.id} 
            onPress={() => router.push(`/challenge/${challenge.id}`)}
            style={{ gap: 6 }}
          >
            <AppText variant="subtitle">{challenge.title}</AppText>
            <AppText muted>{challenge.subtitle}</AppText>
            <AppText variant="caption" style={{ color: theme.colors.primary2, fontWeight: '600', marginTop: 4 }}>
              Open challenge →
            </AppText>
          </Card>
        ))}

        {filteredChallenges.length === 0 && (
          <View style={{ paddingVertical: theme.spacing(4), alignItems: 'center' }}>
            <AppText muted>No challenges in this category yet.</AppText>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
