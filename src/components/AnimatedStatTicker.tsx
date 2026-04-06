import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface StatItem {
    label: string;
    value: string | number;
    icon?: string;
    color?: string;
    bgColor?: string;
}

interface AnimatedStatTickerProps {
    stats: StatItem[];
    duration?: number;
    displayDuration?: number;
}

export const AnimatedStatTicker: React.FC<AnimatedStatTickerProps> = ({
    stats,
    duration = 500,
    displayDuration = 1500 // Faster cycle
}) => {
    const { colors, theme } = useTheme();
    const isDark = theme === 'dark';
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const isExiting = useRef(false);

    // Animations
    const contentFade = useRef(new Animated.Value(0)).current;
    const contentSlide = useRef(new Animated.Value(-20)).current;
    const containerFade = useRef(new Animated.Value(1)).current;
    const containerSlide = useRef(new Animated.Value(0)).current;

    // Height Animation (Native: FALSE)
    const containerHeight = useRef(new Animated.Value(45)).current;

    useEffect(() => {
        if (stats.length === 0 || !isVisible || isExiting.current) return;

        const animateItem = () => {
            // Reset state
            contentSlide.setValue(-20);
            contentFade.setValue(0);

            // Enter
            Animated.parallel([
                Animated.timing(contentFade, {
                    toValue: 1,
                    duration: duration,
                    useNativeDriver: true,
                }),
                Animated.timing(contentSlide, {
                    toValue: 0,
                    duration: duration,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Wait
                setTimeout(() => {
                    if (isExiting.current) return;

                    // Exit
                    Animated.parallel([
                        Animated.timing(contentFade, {
                            toValue: 0,
                            duration: duration,
                            useNativeDriver: true,
                        }),
                        Animated.timing(contentSlide, {
                            toValue: 20,
                            duration: duration,
                            easing: Easing.in(Easing.ease),
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        // Loop Logic
                        if (currentIndex >= stats.length - 1) {
                            if (!isExiting.current) {
                                isExiting.current = true;
                                animateContainerExit();
                            }
                        } else {
                            if (!isExiting.current) {
                                setCurrentIndex(prev => prev + 1);
                            }
                        }
                    });
                }, displayDuration);
            });
        };

        animateItem();

    }, [currentIndex, stats, isVisible]);

    const animateContainerExit = () => {
        Animated.parallel([
            Animated.timing(containerFade, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(containerSlide, {
                toValue: 200,
                duration: 600,
                useNativeDriver: true,
            })
        ]).start(() => {
            Animated.timing(containerHeight, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false
            }).start(() => {
                setIsVisible(false);
            });
        });
    };

    if (!isVisible) return null;

    const item = stats[currentIndex];
    if (!item) return null;

    // Default to card background; text adapts to theme
    const bgColor = item.bgColor || colors.cardBackground;
    const textColor = isDark ? colors.text : '#1e3a8a';

    return (
        <Animated.View style={[styles.wrapper, { height: containerHeight }]}>
            <Animated.View style={[
                styles.container,
                {
                    opacity: containerFade,
                    transform: [{ translateX: containerSlide }]
                }
            ]}>
                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: contentFade,
                            transform: [{ translateX: contentSlide }],
                            backgroundColor: bgColor,
                            borderColor: isDark ? colors.gray300 : '#e5e7eb',
                        },
                    ]}
                >
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons
                            name={item.icon as any || "chart-bar"}
                            size={20}
                            color={textColor}
                        />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.value, { color: textColor }]}>{item.value}</Text>
                        <Text style={[styles.label, { color: textColor }]}>{item.label}</Text>
                    </View>
                </Animated.View>
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        overflow: 'hidden',
    },
    container: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        // Sharp Top, Rounded Bottom
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,

        borderWidth: 1,
        minWidth: 140,
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    iconContainer: {
        marginRight: 8,
    },
    textContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    value: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 5,
    },
    label: {
        fontSize: 13,
        opacity: 0.9,
    },
});
