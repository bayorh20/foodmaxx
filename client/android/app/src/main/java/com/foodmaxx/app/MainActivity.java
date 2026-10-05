package com.foodmaxx.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "FoodMaxxApp";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Defensive Firebase initialization check via reflection before bridge initializes plugins
        try {
            Class<?> firebaseAppClass = Class.forName("com.google.firebase.FirebaseApp");
            java.lang.reflect.Method getAppsMethod = firebaseAppClass.getMethod("getApps", android.content.Context.class);
            java.util.List<?> apps = (java.util.List<?>) getAppsMethod.invoke(null, this);
            if (apps == null || apps.isEmpty()) {
                java.lang.reflect.Method initMethod = firebaseAppClass.getMethod("initializeApp", android.content.Context.class);
                initMethod.invoke(null, this);
                Log.d(TAG, "FirebaseApp auto-initialized successfully");
            }
        } catch (Throwable t) {
            Log.w(TAG, "FirebaseApp initialization check notice: " + t.getMessage());
        }

        super.onCreate(savedInstanceState);

        // Ensure status bar is solid and opaque (Option A: dedicated status bar, no transparent overlay)
        try {
            android.view.Window window = getWindow();
            window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.addFlags(android.view.WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(android.graphics.Color.parseColor("#EA4C2A"));
            androidx.core.view.WindowCompat.setDecorFitsSystemWindows(window, true);
        } catch (Throwable t) {
            Log.w(TAG, "StatusBar solid config notice: " + t.getMessage());
        }

        // Create High-Priority Notification Channel so Android displays notifications even when app is closed / locked
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                android.app.NotificationManager notificationManager = getSystemService(android.app.NotificationManager.class);
                if (notificationManager != null) {
                    // 1. Primary High-Priority Channel for Orders & Kitchen Alerts
                    android.app.NotificationChannel orderChannel = new android.app.NotificationChannel(
                        "foodmaxx_orders",
                        "FoodMaxx Orders & Updates",
                        android.app.NotificationManager.IMPORTANCE_HIGH
                    );
                    orderChannel.setDescription("Live order tracking, kitchen status, and rider updates");
                    orderChannel.enableLights(true);
                    orderChannel.setLightColor(android.graphics.Color.parseColor("#EA4C2A"));
                    orderChannel.enableVibration(true);
                    orderChannel.setVibrationPattern(new long[]{0, 300, 200, 300});
                    orderChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                    orderChannel.setShowBadge(true);
                    notificationManager.createNotificationChannel(orderChannel);

                    // 2. FCM Fallback Channel
                    android.app.NotificationChannel fallbackChannel = new android.app.NotificationChannel(
                        "fcm_fallback_notification_channel",
                        "FoodMaxx Announcements",
                        android.app.NotificationManager.IMPORTANCE_HIGH
                    );
                    fallbackChannel.enableVibration(true);
                    fallbackChannel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                    notificationManager.createNotificationChannel(fallbackChannel);
                    Log.d(TAG, "Notification channels created successfully with IMPORTANCE_HIGH");
                }
            }
        } catch (Throwable t) {
            Log.w(TAG, "NotificationChannel creation notice: " + t.getMessage());
        }

        // Lock down WebView settings with complete crash protection
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                WebSettings settings = webView.getSettings();

                // Prevent multi-window popups from escaping into external Chrome
                settings.setSupportMultipleWindows(false);
                settings.setJavaScriptCanOpenWindowsAutomatically(false);

                // Enable native storage and modern rendering features
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
            }
        } catch (Throwable t) {
            Log.w(TAG, "WebView configuration notice: " + t.getMessage());
        }
    }
}
