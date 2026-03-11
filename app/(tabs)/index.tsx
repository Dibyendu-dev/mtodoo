
import useTheme from '@/hooks/useTheme';
import {  StyleSheet, View , Text} from 'react-native';
import { LinearGradient } from "expo-linear-gradient";
import { createHomeStyles } from '@/assets/styles/home.style';
import { SafeAreaView } from "react-native-safe-area-context";
import Header from '@/componenets/Header';

export default function HomeScreen() {

   const { colors } = useTheme();
   const homeStyles = createHomeStyles(colors);

  return (
    <LinearGradient colors={colors.gradients.background} style={homeStyles.container}>
      <SafeAreaView style={homeStyles.safeArea}>
        <Header />
      </SafeAreaView>
    </LinearGradient>
  );
}

