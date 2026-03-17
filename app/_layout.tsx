
import { Stack } from 'expo-router';
import { ThemeProvider } from '@/hooks/useTheme';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { InAppLoggerInstaller, InAppLogOverlay } from "../debug/InAppLogger";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

export default function RootLayout() {
  return (
    <>
      <InAppLoggerInstaller />
      <ConvexProvider client={convex}>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
          <InAppLogOverlay />
        </ThemeProvider>
      </ConvexProvider>
    </>
  );
}
