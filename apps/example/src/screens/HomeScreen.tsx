import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { SectionList, Text } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RipplePressable } from "../components/RipplePressable";
import { DEMO_SECTIONS, type DemoEntry, type DemoSection } from "../config/demoRegistry";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { FONT_REGULAR, FONT_SEMIBOLD } from "../theme/fonts";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

// Precompute a flat index for each item to create continuous stagger delays across sections
const STAGGER_INDICES = new Map<string, number>();
let idx = 0;
for (const section of DEMO_SECTIONS) {
  STAGGER_INDICES.set(`section:${section.title}`, idx++);
  for (const entry of section.data) {
    STAGGER_INDICES.set(entry.key, idx++);
  }
}

const STAGGER_DELAY = 60;
const STAGGER_DURATION = 400;
const STAGGER_EASING = Easing.out(Easing.cubic);

const DemoCard = ({ entry, onPress }: { entry: DemoEntry; onPress: () => void }) => {
  const staggerIndex = STAGGER_INDICES.get(entry.key) ?? 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(STAGGER_DURATION)
        .delay(staggerIndex * STAGGER_DELAY)
        .easing(STAGGER_EASING)}
    >
      <RipplePressable
        onPress={onPress}
        style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        }}
      >
        {/* Title */}
        <Text
          style={{
            fontSize: 16,
            fontFamily: FONT_SEMIBOLD,
            color: colors.text,
          }}
        >
          {entry.title}
        </Text>

        {/* Description */}
        <Text
          style={{
            fontSize: 13,
            fontFamily: FONT_REGULAR,
            color: colors.textSecondary,
            marginTop: 6,
            lineHeight: 18,
          }}
        >
          {entry.description}
        </Text>
      </RipplePressable>
    </Animated.View>
  );
};

const SectionHeader = ({ title }: { title: string }) => {
  const staggerIndex = STAGGER_INDICES.get(`section:${title}`) ?? 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(STAGGER_DURATION)
        .delay(staggerIndex * STAGGER_DELAY)
        .easing(STAGGER_EASING)}
    >
      <Text
        style={{
          fontSize: 13,
          fontFamily: FONT_SEMIBOLD,
          color: colors.textTertiary,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          paddingHorizontal: 4,
          paddingTop: 12,
          paddingBottom: 4,
        }}
      >
        {title}
      </Text>
    </Animated.View>
  );
};

const ListHeader = () => (
  <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
    <Text
      style={{
        fontSize: 22,
        fontFamily: FONT_SEMIBOLD,
        color: colors.text,
        marginBottom: 4,
      }}
    >
      Number Flow React Native
    </Text>
    <Text
      style={{
        fontSize: 15,
        fontFamily: FONT_REGULAR,
        color: colors.textSecondary,
        lineHeight: 20,
      }}
    >
      Animated number transitions
    </Text>
  </Animated.View>
);

export const HomeScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();

  const renderItem = useCallback(
    ({ item }: { item: DemoEntry }) => (
      <DemoCard entry={item} onPress={() => navigation.navigate("Demo", { demoKey: item.key })} />
    ),
    [navigation],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: DemoSection }) => <SectionHeader title={section.title} />,
    [],
  );

  const keyExtractor = useCallback((item: DemoEntry) => item.key, []);

  return (
    <SectionList
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 16,
        gap: 10,
      }}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      sections={DEMO_SECTIONS}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      style={{ backgroundColor: colors.background }}
    />
  );
};
