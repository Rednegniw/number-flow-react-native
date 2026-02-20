import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { FlatList, Text } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RipplePressable } from "../components/RipplePressable";
import { RECORDING_ENTRIES, type RecordingEntry } from "../config/recordingRegistry";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { FONT_REGULAR, FONT_SEMIBOLD } from "../theme/fonts";

type Props = NativeStackScreenProps<RootStackParamList, "RecordingList">;

const STAGGER_DELAY = 60;
const STAGGER_DURATION = 400;
const STAGGER_EASING = Easing.bezier(0.33, 1, 0.68, 1);

const RecordingCard = ({
  entry,
  index,
  onPress,
}: {
  entry: RecordingEntry;
  index: number;
  onPress: () => void;
}) => (
  <Animated.View
    entering={FadeInDown.duration(STAGGER_DURATION)
      .delay((index + 1) * STAGGER_DELAY)
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
      <Text style={{ fontSize: 16, fontFamily: FONT_SEMIBOLD, color: colors.text }}>
        {entry.title}
      </Text>
    </RipplePressable>
  </Animated.View>
);

const ListHeader = () => (
  <Animated.View entering={FadeIn.duration(300)} style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
    <Text style={{ fontSize: 22, fontFamily: FONT_SEMIBOLD, color: colors.text, marginBottom: 4 }}>
      Recording
    </Text>
    <Text
      style={{
        fontSize: 15,
        fontFamily: FONT_REGULAR,
        color: colors.textSecondary,
        lineHeight: 20,
      }}
    >
      Skia demos optimized for screen recording
    </Text>
  </Animated.View>
);

export const RecordingListScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();

  const renderItem = useCallback(
    ({ item, index }: { item: RecordingEntry; index: number }) => (
      <RecordingCard
        entry={item}
        index={index}
        onPress={() => navigation.navigate("RecordingDemo", { recordingKey: item.key })}
      />
    ),
    [navigation],
  );

  const keyExtractor = useCallback((item: RecordingEntry) => item.key, []);

  return (
    <FlatList
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 16,
        gap: 10,
      }}
      data={RECORDING_ENTRIES}
      keyExtractor={keyExtractor}
      ListHeaderComponent={<ListHeader />}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.background }}
    />
  );
};
