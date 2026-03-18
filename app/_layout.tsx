
import { ThemeProvider } from "@/hooks/useTheme";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { Text, View } from "react-native";
import { InAppLoggerInstaller, InAppLogOverlay } from "../debug/InAppLogger";

function getExtraString(key: string): string | undefined {
  const extra = (Constants.expoConfig as any)?.extra ?? (Constants as any)?.expoConfig?.extra;
  const v = extra?.[key];
  return typeof v === "string" && v.trim().length ? v.trim() : undefined;
}

function getConvexUrl(): string | undefined {
  const env = process.env.EXPO_PUBLIC_CONVEX_URL;
  if (typeof env === "string" && env.trim().length) return env.trim();
  return getExtraString("EXPO_PUBLIC_CONVEX_URL");
}

export default function RootLayout() {
  const convexUrl = getConvexUrl();

  if (!convexUrl) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 8 }}>
          App misconfigured
        </Text>
        <Text style={{ textAlign: "center", opacity: 0.8 }}>
          Missing EXPO_PUBLIC_CONVEX_URL. Add it to EAS env (Production) or to app.json extra.
        </Text>
      </View>
    );
  }

  const convex = new ConvexReactClient(convexUrl, { unsavedChangesWarning: false });

  return (
    <>
      {__DEV__ && <InAppLoggerInstaller />}
      <ConvexProvider client={convex}>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
          {__DEV__ && <InAppLogOverlay />}
        </ThemeProvider>
      </ConvexProvider>
    </>
  );
}
