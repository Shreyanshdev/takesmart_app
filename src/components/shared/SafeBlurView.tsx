import React, { forwardRef } from 'react';
import { Platform, View } from 'react-native';
import { BlurView as NativeBlurView } from '@react-native-community/blur';

export const SafeBlurView = forwardRef((props: any, ref: any) => {
    if (Platform.OS === 'android') {
        // Fallback for Android to prevent PreDrawBlurController crash in New Architecture
        const isDark = props.blurType === 'dark' || props.blurType === 'xlight' ? false : true; // default light
        const defaultColor = props.blurType === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)';
        
        // Sometimes reducedTransparencyFallbackColor is just 'white' or 'black', we might want to make it semi-transparent
        let fallbackColor = props.reducedTransparencyFallbackColor;
        if (fallbackColor === 'white') fallbackColor = 'rgba(255,255,255,0.9)';
        if (fallbackColor === 'black') fallbackColor = 'rgba(0,0,0,0.8)';
        if (!fallbackColor) fallbackColor = defaultColor;

        return <View ref={ref} style={[props.style, { backgroundColor: fallbackColor }]} />;
    }
    
    // On iOS, native blur works perfectly
    return <NativeBlurView ref={ref} {...props} />;
});
