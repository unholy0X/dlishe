import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";

const C = {
  bg: "#F4F5F7",
  card: "#ffffff",
  muted: "#B4B4B4",
  text: "#111111",
  green: "#7FEF80",
  greenDark: "#385225",
  border: "#EAEAEA",
};

const FONT = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
};

const SECTION_COLORS = [
  "#E8845C",
  "#7A8A5A",
  "#6B7F6A",
  "#C17A4E",
  "#8B6B4A",
  "#B57A5F",
  "#D4775D",
  "#A8856A",
];

function getSectionColor(index) {
  return SECTION_COLORS[index % SECTION_COLORS.length];
}

export default function PrepChecklistSheet({
  ingredients,
  checkedIngredients,
  onToggle,
  onBack,
  onReady,
}) {
  // Group ingredients by section
  const sections = {};
  (ingredients || []).forEach((ing) => {
    const key = ing.section || "Ingredients";
    if (!sections[key]) sections[key] = [];
    sections[key].push(ing);
  });
  const sectionEntries = Object.entries(sections);

  // Build a flat index for toggle tracking
  let flatIndex = 0;
  const sectionData = sectionEntries.map(([title, items]) => {
    const rows = items.map((ing) => {
      const idx = flatIndex++;
      return { ing, idx };
    });
    return { title, rows };
  });

  const totalCount = flatIndex;
  const checkedCount = Object.values(checkedIngredients || {}).filter(Boolean).length;

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable style={s.backBtn} onPress={onBack}>
          <Text style={s.backIcon}>←</Text>
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <View style={s.counterPill}>
          <Text style={s.counterPillText}>
            {checkedCount} / {totalCount}
          </Text>
        </View>
      </View>

      {/* Title area */}
      <View style={s.titleArea}>
        <Text style={s.title}>Before we start</Text>
        <Text style={s.subtitle}>Gather everything you need</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        style={s.scrollView}
      >
        {sectionData.map(({ title, rows }, si) => (
          <View key={si} style={s.sectionCard}>
            <View style={s.sectionHeader}>
              <View style={[s.sectionCircle, { backgroundColor: getSectionColor(si) }]}>
                <Text style={s.sectionInitial}>{title.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={s.sectionTitle}>{title}</Text>
            </View>

            <View style={s.sectionInner}>
              {rows.map(({ ing, idx }, ri) => {
                const checked = !!checkedIngredients?.[idx];
                const qty = ing.quantity
                  ? `${ing.quantity}${ing.unit ? ` ${ing.unit}` : ""}`
                  : null;
                const isLast = ri === rows.length - 1;
                return (
                  <Pressable
                    key={idx}
                    style={[s.row, !isLast && s.rowBorder]}
                    onPress={() => onToggle(idx)}
                  >
                    <View style={[s.check, checked ? s.checkOn : s.checkOff]}>
                      {checked ? <Text style={s.checkMark}>✓</Text> : null}
                    </View>
                    <View style={s.rowContent}>
                      <View style={s.rowTopLine}>
                        <Text
                          style={[s.rowLabel, checked && s.rowLabelChecked]}
                          numberOfLines={2}
                        >
                          {ing.name}
                        </Text>
                        {qty ? (
                          <Text style={s.rowQty}>{qty}</Text>
                        ) : null}
                      </View>
                      {ing.notes ? (
                        <Text style={s.rowNotes} numberOfLines={2}>
                          {ing.notes}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <Pressable style={s.readyBtn} onPress={onReady}>
          <Text style={s.readyBtnText}>I'm ready, let's cook</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ─── Top bar ──────────────────────────────────
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backIcon: {
    fontSize: 14,
    color: C.muted,
    marginRight: 6,
  },
  backText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: C.muted,
  },
  counterPill: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  counterPillText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: C.text,
    letterSpacing: -0.05,
  },

  // ─── Title area ───────────────────────────────
  titleArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: FONT.semibold,
    color: C.text,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: C.muted,
    marginTop: 4,
  },

  scrollView: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionInitial: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: C.text,
  },
  sectionInner: {
    backgroundColor: "#F7F7F7",
    borderRadius: 16,
    padding: 14,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 12,
    marginTop: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: {
    backgroundColor: C.green,
  },
  checkOff: {
    backgroundColor: "#E6E6E6",
  },
  checkMark: {
    fontSize: 12,
    color: C.greenDark,
    fontFamily: FONT.semibold,
  },
  rowContent: {
    flex: 1,
  },
  rowTopLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: FONT.medium,
    color: C.text,
    flex: 1,
    marginRight: 10,
    lineHeight: 20,
  },
  rowLabelChecked: {
    textDecorationLine: "line-through",
    color: C.muted,
  },
  rowQty: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: C.text,
    flexShrink: 0,
  },
  rowNotes: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: C.muted,
    marginTop: 2,
    lineHeight: 18,
  },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  readyBtn: {
    backgroundColor: C.green,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  readyBtnText: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: C.greenDark,
  },
});
