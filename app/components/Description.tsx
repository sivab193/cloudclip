import React from 'react';
import { StyleSheet, View, Text, ScrollView, Image } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { ThemeTokens } from '@/constants/Colors';
import { useThemedStyles } from '@/hooks/useTheme';

const Description = () => {
    const styles = useThemedStyles(makeStyles);

    return (
        <ScrollView style={ styles.containerLight}>
            <ThemedView style={styles.descriptionContainer}>

                <ThemedText style={styles.body}>
                    Your clipboard, on every device. Save text on your phone or computer, access it on your other devices,
                    and share it through expiring encrypted links.
                </ThemedText>

                <ThemedText type="subtitle" style={styles.subtitle}>Features</ThemedText>

                <ThemedText style={styles.body}>
                    <Text style={styles.featureTitle}>Encrypted Text Sync: </Text>
                    Paste and save manually, or enable automatic clipboard sync while CloudClip is open.
                    Automatic access is off by default. Your text is encrypted before upload.
                </ThemedText>
                <View style={styles.imgContainer}>
                    <Image source={require('@/assets/images/real-time-sync.png')} style={styles.image} resizeMode="contain" />
                </View>

                <ThemedText style={styles.body}>
                    <Text style={styles.featureTitle}>Expiring Share Links: </Text>
                    Create a link or code that works in a browser without an account. Anyone with the complete link or code
                    can read that text until the link expires or you delete it.
                </ThemedText>
                <View style={styles.imgContainer}>
                    <Image source={require('@/assets/images/secure-data-sharing.png')} style={styles.image} resizeMode="contain" />
                </View>
            </ThemedView>
        </ScrollView>
    );
};

const makeStyles = (t: ThemeTokens) => StyleSheet.create({
    containerLight: {
        backgroundColor: t.background,
        padding: 16,
    },
    descriptionContainer: {
        alignSelf: 'center',
        width: '90%', 
        backgroundColor: t.background
    },
    subtitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
        color: t.text, 
    },
    body: {
        textAlign: 'left',
        fontSize: 16,
        lineHeight: 24,
        color: t.text, 
    },
    featureTitle: {
        fontWeight: 'bold',
        color: t.text,
    },
    imgContainer: {
        alignItems: 'center',
        marginVertical: 16, // Added vertical margin for better spacing
    },
    image: {
        width: 100,
        height: 100
    }
});

export default Description;
