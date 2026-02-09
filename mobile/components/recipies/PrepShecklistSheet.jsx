import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
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

export default function PrepChecklistSheet({ onBack, onReady }) {
  return (
    <View style={s.container}>
      {/* Back */}
      <Pressable style={s.backBtn} onPress={onBack}>
        <Text style={s.backIcon}>←</Text>
        <Text style={s.backText}>Back</Text>
      </Pressable>

      {/* Title */}
      <Text style={s.title}>Before we start</Text>
      <Text style={s.subtitle}>Gather everything you need</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Produce Card */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Image source={require("../assets/produce.png")} style={s.sectionIcon} />
            <Text style={s.sectionTitle}>Produce</Text>
          </View>

          <View style={s.sectionInner}>
            <Row checked label="Ginger" amount="1/2 cup" />
            <Row checked label="Garlic" amount="4 cloves" />
            <Row label="Lecoin" amount="1 unit" />
            <Row label="Dill" amount="1 Tbsp" />
          </View>
        </View>

        {/* Pantry Card */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Image source={require("../assets/pantry.png")} style={s.sectionIcon} />
            <Text style={s.sectionTitle}>Pantry</Text>
          </View>

          <View style={s.sectionInner}>
            <Row checked label="Eggs" amount="3 units" />
            <Row label="Flour" amount="1/2 cup" />
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.readyText}>8/12 ready</Text>
        <Pressable style={s.readyBtn} onPress={onReady}>
          <Text style={s.readyBtnText}>I’m ready</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Row({ checked, label, amount }) {
  return (
    <View style={s.row}>
      <View style={[s.check, checked ? s.checkOn : s.checkOff]}>
        {checked ? <Text style={s.checkMark}>✓</Text> : null}
      </View>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowAmount}>{amount}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  scroll: {
    paddingBottom: 30,
  },
  backBtn: {
    alignSelf: "flex-start",
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
    marginRight: 8,
  },
  backText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: C.muted,
  },
  title: {
    marginTop: 16,
    fontSize: 26,
    fontFamily: FONT.semibold,
    color: C.text,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: C.muted,
    marginTop: 4,
  },

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: C.text,
  },
  sectionInner: {
    backgroundColor: "#F7F7F7",
    borderRadius: 16,
    padding: 12,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
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
  rowLabel: {
    fontSize: 15,
    fontFamily: FONT.medium,
    color: C.text,
    flex: 1,
  },
  rowAmount: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: C.muted,
  },

  footer: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  readyText: {
    fontSize: 15,
    fontFamily: FONT.medium,
    color: C.text,
  },
  readyBtn: {
    backgroundColor: C.green,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  readyBtnText: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: C.greenDark,
  },
});
