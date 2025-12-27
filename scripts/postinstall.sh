#!/bin/bash

# Post-install script to fix deprecated jcenter() in react-native-tts for Gradle 9+

TTS_BUILD_GRADLE="node_modules/react-native-tts/android/build.gradle"

if [ -f "$TTS_BUILD_GRADLE" ]; then
    echo "Patching react-native-tts build.gradle to remove jcenter()..."
    
    # Replace jcenter() with mavenCentral()
    sed -i '' 's/jcenter()/mavenCentral()/g' "$TTS_BUILD_GRADLE"
    
    echo "✅ Patched react-native-tts successfully"
else
    echo "⚠️ react-native-tts build.gradle not found"
fi
