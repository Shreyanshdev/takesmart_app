# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt

# ==========================================
# React Native & Hermes
# ==========================================
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.** { *; }

# ==========================================
# OkHttp & Networking (Critical for API calls)
# ==========================================
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# ==========================================
# Retrofit (if used)
# ==========================================
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }

# ==========================================
# Razorpay
# ==========================================
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** { *; }
-optimizations !method/inlining/*
-keepclasseswithmembers class * {
    public void onPayment*(...);
}

# ==========================================
# React Native Maps
# ==========================================
-keep class com.google.android.gms.maps.** { *; }
-keep class com.google.android.gms.location.** { *; }

# ==========================================
# AsyncStorage
# ==========================================
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ==========================================
# Socket.IO
# ==========================================
-dontwarn io.socket.**
-keep class io.socket.** { *; }

# ==========================================
# Prevent R8/Proguard from stripping interface information
# ==========================================
-keepclassmembers,allowobfuscation class * {
    @com.google.gson.annotations.SerializedName <fields>;
}

# ==========================================
# Keep source file names for better crash reports
# ==========================================
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
