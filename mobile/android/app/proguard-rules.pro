# Flutter / Play Store — regras ProGuard
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Geolocator / scanner
-dontwarn com.google.android.gms.**
-keep class com.google.mlkit.** { *; }

# Secure storage
-keep class com.it_nomads.fluttersecurestorage.** { *; }

-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-dontwarn org.bouncycastle.**
