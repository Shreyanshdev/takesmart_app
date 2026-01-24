#!/bin/bash

# Postinstall script to patch node_modules for React Native 0.81.4 compatibility
# This fixes packages that have old buildscript blocks with unversioned react-native-gradle-plugin

echo "Running postinstall patches..."

# Patch @react-native-community/slider
SLIDER_BUILD_GRADLE="node_modules/@react-native-community/slider/android/build.gradle"
if [ -f "$SLIDER_BUILD_GRADLE" ]; then
    # Check if buildscript block exists
    if grep -q "buildscript {" "$SLIDER_BUILD_GRADLE"; then
        echo "Patching $SLIDER_BUILD_GRADLE..."
        # Remove the buildscript block (lines 1-13)
        sed -i.bak '/^buildscript {/,/^}/d' "$SLIDER_BUILD_GRADLE"
        # Remove backup file
        rm -f "${SLIDER_BUILD_GRADLE}.bak"
        echo "✓ Patched @react-native-community/slider"
    else
        echo "✓ @react-native-community/slider already patched"
    fi
fi

echo "Postinstall patches complete!"
