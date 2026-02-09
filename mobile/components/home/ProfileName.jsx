import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Pressable, Modal } from "react-native";
import { useClerk } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useUserStore } from "../../store";

export default function ProfileName({
  name = "Samantha",
  subtitle = "Your kitchen awaits",
  imageUrl = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png",
}) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const firstName = useUserStore((s) => s.firstName);
  const lastName = useUserStore((s) => s.lastName);
  const displayName = firstName || lastName ? `${firstName} ${lastName}`.trim() : name;

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={() => setOpen((prev) => !prev)}>
        <View style={styles.welcomeCard}>
          <Image style={styles.avatar} source={{ uri: imageUrl }} />
          <View>
            <Text style={styles.welcomeTitle}>Welcome {displayName}!</Text>
            <Text style={styles.welcomeSubtitle}>{subtitle}</Text>
          </View>
        </View>
      </Pressable>

      <Modal transparent visible={open} onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>Account</Text>
          <Pressable
            style={styles.menuItem}
            onPress={async () => {
              setOpen(false);
              await signOut();
              router.replace("/");
            }}
          >
            <Text style={styles.menuText}>Log out</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  welcomeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 13,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.05,
  },
  welcomeSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b6b6b",
    letterSpacing: -0.05,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menu: {
    position: "absolute",
    top: 96,
    left: 20,
    right: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  menuTitle: {
    fontSize: 12,
    color: "#9b9b9b",
    marginBottom: 6,
  },
  menuItem: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  menuText: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "600",
  },
});
