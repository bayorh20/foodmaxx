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
