import { Tabs } from "expo-router";
import { View } from "react-native";
import { Home, BookOpen, Flower2, ShoppingBasket } from "lucide-react-native";
import { colors } from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.honey[400],
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.stone[50],
          borderTopColor: colors.stone[200],
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 72,
          shadowColor: colors.text.primary,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          fontFamily: 'Inter',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: colors.stone[50],
          shadowColor: "transparent",
          elevation: 0,
        },
        headerTitleStyle: {
          color: colors.text.primary,
          fontWeight: "400",
          fontSize: 20,
          fontFamily: 'Cormorant Garamond',
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{ alignItems: "center" }}>
              <Home size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.honey[400],
                    marginTop: 2,
                  }}
                />
              )}
            </View>
          ),
          headerTitle: "DishFlow",
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{ alignItems: "center" }}>
              <BookOpen size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.primary,
                    marginTop: 2,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: "Pantry",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{ alignItems: "center" }}>
              <Flower2 size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.primary,
                    marginTop: 2,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: "Shopping",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{ alignItems: "center" }}>
              <ShoppingBasket size={size} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.primary,
                    marginTop: 2,
                  }}
                />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
