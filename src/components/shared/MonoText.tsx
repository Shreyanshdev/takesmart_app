import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { typography } from '../../theme/typography';
import { colors } from '../../theme/colors';

interface MonoTextProps extends TextProps {
    size?: keyof typeof typography.size;
    weight?: keyof typeof typography.weight;
    color?: string;
    children: React.ReactNode;
}

export const MonoText: React.FC<MonoTextProps> = ({
    size = 'm',
    weight = 'regular',
    color = colors.text,
    style,
    children,
    ...props
}) => {
    return (
        <Text
            style={[
                styles.text,
                {
                    fontSize: typography.size[size],
                    fontWeight: typography.weight[weight] as any,
                    color: color,
                },
                style,
            ]}
            {...props}
        >
            {children}
        </Text>
    );
};

const styles = StyleSheet.create({
    text: {
        fontFamily: typography.fontFamily,
    },
});
