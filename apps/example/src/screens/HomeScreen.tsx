import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { Platform, SectionList, Text } from "react-native";
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
// cubic-bezier equivalent of Easing.out(Easing.cubic), so Reanimated can map
// it to a CSS cubic-bezier() on web instead of warning about unsupported easing
const STAGGER_EASING = Easing.bezier(0.33, 1, 0.68, 1);

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

const isWeb = Platform.OS === "web";

const ListHeader = ({
  onShowcase,
  onRTLShowcase,
  onRecording,
}: {
  onShowcase: () => void;
  onRTLShowcase: () => void;
  onRecording: () => void;
}) => (
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

    {/* Showcase button, hidden on web (requires Skia) */}
    {!isWeb && (
      <RipplePressable
        onPress={onShowcase}
        style={{
          backgroundColor: "#0A0A0A",
          borderRadius: 14,
          padding: 16,
          marginTop: 16,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontFamily: FONT_SEMIBOLD,
            color: "#FFFFFF",
          }}
        >
          Showcase
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: FONT_REGULAR,
            color: "#9CA3AF",
            marginTop: 4,
            lineHeight: 18,
          }}
        >
          Cinematic auto-playing demo reel
        </Text>
      </RipplePressable>
    )}

    {/* RTL Showcase button, hidden on web (requires Skia) */}
    {!isWeb && (
      <RipplePressable
        onPress={onRTLShowcase}
        style={{
          backgroundColor: "#0A0A0A",
          borderRadius: 14,
          padding: 16,
          marginTop: 10,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontFamily: FONT_SEMIBOLD,
            color: "#FFFFFF",
          }}
        >
          RTL Showcase
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: FONT_REGULAR,
            color: "#9CA3AF",
            marginTop: 4,
            lineHeight: 18,
          }}
        >
          Bidi visual reordering for Arabic, Hebrew, and more
        </Text>
      </RipplePressable>
    )}

    {/* Recording button, hidden on web (requires Skia) */}
    {!isWeb && (
      <RipplePressable
        onPress={onRecording}
        style={{
          backgroundColor: "#0A0A0A",
          borderRadius: 14,
          padding: 16,
          marginTop: 10,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontFamily: FONT_SEMIBOLD,
            color: "#FFFFFF",
          }}
        >
          Recording
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontFamily: FONT_REGULAR,
            color: "#9CA3AF",
            marginTop: 4,
            lineHeight: 18,
          }}
        >
          Skia demos for screen capture
        </Text>
      </RipplePressable>
    )}
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
      ListHeaderComponent={
        <ListHeader
          onRTLShowcase={() => navigation.navigate("RTLShowcase")}
          onRecording={() => navigation.navigate("RecordingList")}
          onShowcase={() => navigation.navigate("Showcase")}
        />
      }
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      sections={DEMO_SECTIONS}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      style={{ backgroundColor: colors.background }}
    />
  );
};
