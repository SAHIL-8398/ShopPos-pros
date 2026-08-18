# Android Camera & Barcode Scanner Setup Guide (GitHub Android Build)

If you are building an Android APK / AAB using GitHub Actions or Android Studio, follow these 3 steps to ensure full camera hardware and barcode scanning functionality:

---

## 1. Android Manifest Permissions (`android/app/src/main/AndroidManifest.xml`)

Ensure your `AndroidManifest.xml` inside `<manifest>` contains the following permissions:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Camera and Hardware Permissions -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />

    <!-- Network permissions for Google MLKit Barcode models -->
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">

        <!-- Automatic MLKit barcode model download on install -->
        <meta-data
            android:name="com.google.mlkit.vision.DEPENDENCIES"
            android:value="barcode" />

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>
</manifest>
```

---

## 2. Transparent WebView Background (For MLKit Underlay Scanner)

If you use the **MLKit underlay scanner**, Android's WebView must allow the native camera to show behind the web content. In `android/app/src/main/java/.../MainActivity.java`:

```java
package com.shoppos.pro;

import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Allows native camera preview behind the webview
        this.bridge.getWebView().setBackgroundColor(Color.TRANSPARENT);
    }
}
```

*Note: If you use the **In-App Camera (WebView)** or **Google Scanner Dialog**, setting `setBackgroundColor(Color.TRANSPARENT)` is optional because they render directly on-screen without requiring transparency.*

---

## 3. GitHub Actions Build Workflow Recommendation

When running `npx cap sync android` in your GitHub Action, make sure to build the web assets first:

```yaml
- name: Build Web App
  run: npm run build

- name: Sync Capacitor
  run: npx cap sync android

- name: Build Android APK
  run: cd android && ./gradlew assembleDebug
```
