import { AntDesign } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeTokens } from '@/constants/Colors';
import { useTheme, useThemedStyles } from '@/hooks/useTheme';

const NoItemsComponent = () => {
    const t = useTheme();
    const styles = useThemedStyles(makeStyles);

    return (
        <View style={styles.container}>
            <AntDesign name="aliwangwang" size={24} color={t.textMuted} />
            <Text style={styles.text}>No items yet!</Text>
        </View>
    );
};

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
    container: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 16,
        color: t.textMuted,
    },
});

export default NoItemsComponent;