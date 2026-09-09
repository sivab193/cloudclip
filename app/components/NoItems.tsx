import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';

const NoItemsComponent = () => {
    const t = useTheme();
    const styles = useThemedStyles(makeStyles);

    return (
        <View style={styles.container}>
            <Ionicons name="file-tray-outline" size={24} color={t.textMuted} />
            <Text style={styles.text}>A fresh start. Your clips will appear here.</Text>
        </View>
    );
};

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
    container: {
        height: 200,
        gap: 14, borderRadius: 20, backgroundColor: t.surfaceAlt, padding: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 16,
        color: t.textMuted,
    },
});

export default NoItemsComponent;
