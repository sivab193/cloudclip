import { AntDesign } from '@expo/vector-icons';
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const NoItemsComponent = () => {
    return (
        <View style={styles.container}>
            <AntDesign name="aliwangwang-o1" size={24} color="black" />
            <Text style={styles.text}>No items yet!</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        // flex: 1,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 16,
        color: 'gray',
    },
});

export default NoItemsComponent;