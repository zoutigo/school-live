import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="grades" options={{ title: "Notes" }} />
      <Tabs.Screen name="account" options={{ title: "Compte" }} />
    </Tabs>
  );
}
