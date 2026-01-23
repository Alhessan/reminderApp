package io.ionic.routineloop;

import android.os.Bundle;
import android.webkit.WebView;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        try {
            // Enable WebView debugging for development
            // Note: This should be done before super.onCreate() to catch early errors
            try {
                WebView.setWebContentsDebuggingEnabled(true);
            } catch (Exception e) {
                Log.w(TAG, "Could not enable WebView debugging", e);
            }
            
            super.onCreate(savedInstanceState);
            
            Log.d(TAG, "MainActivity created successfully");
        } catch (Exception e) {
            Log.e(TAG, "Critical error in onCreate", e);
            // Don't rethrow - let Capacitor handle it
        }
    }
    
    @Override
    public void onDestroy() {
        try {
            super.onDestroy();
            Log.d(TAG, "MainActivity destroyed");
        } catch (Exception e) {
            Log.e(TAG, "Error in onDestroy", e);
        }
    }
    
    @Override
    public void onPause() {
        try {
            super.onPause();
        } catch (Exception e) {
            Log.e(TAG, "Error in onPause", e);
        }
    }
    
    @Override
    public void onResume() {
        try {
            super.onResume();
        } catch (Exception e) {
            Log.e(TAG, "Error in onResume", e);
        }
    }
}
