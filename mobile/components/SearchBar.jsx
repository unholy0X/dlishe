import React from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import SearchIcon from "./icons/SearchIcon";

export default function SearchBar({
  placeholder = "Search for a recipe",
  value,
  onChangeText,
  onPress,
}) {
  // If onPress is provided, render as a tappable trigger (no keyboard)
  if (onPress) {
    return (
      <Pressable style={styles.container} onPress={onPress}>
        <SearchIcon width={25} height={25} color="#B4B4B4" />
        <Text style={styles.placeholderText}>{placeholder}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      <SearchIcon width={25} height={25} color="#B4B4B4" />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#B4B4B4"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 13,
  },
  input: {
    marginLeft: 8,
    flex: 1,
    color: "#111111",
    paddingVertical: 0,
  },
  placeholderText: {
    marginLeft: 8,
    flex: 1,
    color: "#B4B4B4",
    fontSize: 14,
  },
});
