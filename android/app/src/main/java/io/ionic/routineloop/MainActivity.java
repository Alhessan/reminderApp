package io.ionic.routineloop;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebChromeClient;
import android.webkit.ConsoleMessage;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Completely disable WebView debugging and console output
        WebView.setWebContentsDebuggingEnabled(false);
    }
    
    @Override
    public void onStart() {
        super.onStart();
        
        // Override WebView console and client behavior
        if (bridge != null && bridge.getWebView() != null) {
            // Clear WebView cache to prevent localhost connection issues
            bridge.getWebView().clearCache(true);
            bridge.getWebView().clearHistory();
            // Custom WebChromeClient to suppress console output
            bridge.getWebView().setWebChromeClient(new WebChromeClient() {
                @Override
                public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                    // Completely suppress all console messages
                    return true;
                }
                
                @Override
                public void onConsoleMessage(String message, int lineNumber, String sourceID) {
                    // Suppress legacy console messages
                }
            });
            
            // Custom WebViewClient to ensure proper loading
            bridge.getWebView().setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    return false; // Let WebView handle the URL
                }
                
                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    // Inject JavaScript to completely disable console output
                    view.evaluateJavascript(
                        "window.console = {" +
                        "log: function(){}, " +
                        "error: function(){}, " +
                        "warn: function(){}, " +
                        "info: function(){}, " +
                        "debug: function(){}" +
                        "};", null);
                }
            });
        }
    }
}
