import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";

export default function PantryItemRow({ item, onDelete }) {
    const quantityText = item.quantity
        ? `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`
        : null;

    return (
        <View style={styles.row}>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                {quantityText && <Text style={styles.quantity}>{quantityText}</Text>}
            </View>
            {onDelete && (
                <Pressable style={styles.deleteBtn} onPress={() => onDelete(item.id)}>
                    <Text style={styles.deleteText}>×</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#ffffff",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 8,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 15,
        fontWeight: "500",
        color: "#111111",
    },
    quantity: {
        marginTop: 2,
        fontSize: 13,
        color: "#6b6b6b",
    },
    deleteBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#ffeaea",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 10,
    },
    deleteText: {
        fontSize: 18,
        color: "#cc3b3b",
        fontWeight: "600",
    },
});
