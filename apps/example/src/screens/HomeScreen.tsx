import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEMO_REGISTRY, type DemoEntry } from "../config/demoRegistry";
import type { RootStackParamList } from "../navigation/types";
import { colors } from "../theme/colors";
import { FONT_REGULAR, FONT_SEMIBOLD } from "../theme/fonts";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const DemoCard = ({
  entry,
  onPress,
}: {
  entry: DemoEntry;
  onPress: () => void;
}) => {
  const badgeLabel = entry.supportsSkia ? "Skia + Native" : "Native only";
  const badgeBg = entry.supportsSkia ? colors.badge.skia : colors.badge.nativeOnly;
  const badgeText = entry.supportsSkia ? colors.badge.skiaText : colors.badge.nativeOnlyText;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.demoBackground : colors.card,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.cardBorder,
      })}
    >
      {/* Title row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text
          style={{
            fontSize: 16,
            fontFamily: FONT_SEMIBOLD,
            color: colors.text,
            flex: 1,
          }}
        >
          {entry.title}
        </Text>

        <View
          style={{
            backgroundColor: badgeBg,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "500", color: badgeText }}>
            {badgeLabel}
          </Text>
        </View>
      </View>

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
    </Pressable>
  );
};

const ListHeader = () => (
  <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
    <Text
      style={{
        fontSize: 32,
        fontFamily: FONT_SEMIBOLD,
        color: colors.text,
        marginBottom: 4,
      }}
    >
      NumberFlow
    </Text>
    <Text
      style={{
        fontSize: 15,
        fontFamily: FONT_REGULAR,
        color: colors.textSecondary,
        lineHeight: 20,
      }}
    >
      Animated number transitions for React Native
    </Text>
  </View>
);

export const HomeScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();

  const renderItem = useCallback(
    ({ item }: { item: DemoEntry }) => (
      <DemoCard
        entry={item}
        onPress={() => navigation.navigate("Demo", { demoKey: item.key })}
      />
    ),
    [navigation],
  );

  const keyExtractor = useCallback((item: DemoEntry) => item.key, []);

  return (
    <FlatList
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 16,
        gap: 10,
      }}
      data={DEMO_REGISTRY}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.background }}
    />
  );
};
