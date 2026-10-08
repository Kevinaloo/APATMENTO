/*
 * CABANA · LAUNCHER WITH NATIVE PERMISSIONS
 * ----------------------------------------------------------------------
 * Bubblewrap's generated LauncherActivity opens the website and leaves
 * every permission to the web page. For location that means Chrome has to
 * hand the request to this app (location delegation) and the app has to
 * start Android's dialog. When any link in that chain fails, nothing is
 * shown, the page waits, and the member sees "Location is unavailable"
 * without ever having been asked.
 *
 * This replaces it (android/modernize-project.mjs copies it over the
 * generated file) and does the one thing that cannot fail silently: before
 * the website opens, the app itself asks Android for notifications and
 * location. Once Android has said yes, Chrome's delegation only has to
 * read the answer, so the website's own gate finds both already on.
 *
 *   first launch        a short explanation, then Android's two dialogs
 *   denied once         one more chance, with the reason
 *   blocked for good    Android will not show its dialog again, so open
 *                       the app's settings page instead
 *   allowed, phone's    open the phone's location switch
 *   location is off
 *
 * Nothing here traps anyone: every dialog has "Not now", which opens the
 * website as before. The website's own permissions gate then keeps signed
 * in members on the one step that is left.
 *
 * __PACKAGE__ is replaced with the app's package name by the build.
 */
package __PACKAGE__;

import android.Manifest;
import android.app.AlertDialog;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;

import java.util.ArrayList;
import java.util.List;

public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    private static final int REQUEST_PERMISSIONS = 4127;
    private static final String PREFS = "cabana_native_permissions";
    private static final String ASKED = "asked_";
    private static final String NUDGED = "nudged_";
    private static final String STATE_LAUNCHED = "cabana_twa_launched";
    /** How long "Not now" is respected for the settings and location-off dialogs. */
    private static final long NUDGE_COOLDOWN_MS = 24L * 60L * 60L * 1000L;

    private static final String[] LOCATION = {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
    };

    private boolean launched;
    private boolean awaitingSettings;
    private boolean retried;
    private AlertDialog dialog;

    // ── lifecycle ────────────────────────────────────────────────────

    /** The library opens the website from onCreate unless told to wait. */
    @Override
    protected boolean shouldLaunchImmediately() {
        return !needsDialog();
    }

    /**
     * True when this launch has something to ask. A member who said "Not
     * now" to a dialog Android will not repeat is left alone for a day, so
     * their launch is as fast as any other.
     */
    private boolean needsDialog() {
        List<String> missing = missing();
        if (!missing.isEmpty()) {
            return !askable(missing).isEmpty() || cooledDown("blocked");
        }
        return locationSwitchedOff() && cooledDown("locationoff");
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        launched = savedInstanceState != null && savedInstanceState.getBoolean(STATE_LAUNCHED, false);
        super.onCreate(savedInstanceState);
        if (isFinishing() || launched) return;
        if (!needsDialog()) {
            // The library has already opened the website.
            launched = true;
            return;
        }
        // Until the website opens there is nothing to see behind a dialog.
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.WHITE));
        begin();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        outState.putBoolean(STATE_LAUNCHED, launched);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (awaitingSettings) {
            // Back from Settings: open the website, whatever was changed.
            awaitingSettings = false;
            openWebsite();
        }
    }

    @Override
    protected void onDestroy() {
        dismissDialog();
        super.onDestroy();
    }

    // ── the sequence ─────────────────────────────────────────────────

    private void begin() {
        List<String> missing = missing();
        if (missing.isEmpty()) {
            afterPermissions();
            return;
        }
        List<String> askable = askable(missing);
        if (askable.isEmpty()) {
            blocked(missing);
            return;
        }
        if (neverAsked(askable)) {
            show("Turn on alerts and location",
                    "Cabana uses notifications so hosts, guests and bookings reach you the moment "
                            + "something happens, and your location to set exact pick-up points, show "
                            + "what is near you and tell the safety desk where you are if you raise an "
                            + "SOS.\n\nAndroid will ask for each one next.",
                    "Continue", () -> request(askable),
                    "Not now", this::afterPermissions);
        } else {
            request(askable);
        }
    }

    private void request(List<String> permissions) {
        dismissDialog();
        SharedPreferences.Editor edit = prefs().edit();
        for (String p : permissions) edit.putBoolean(ASKED + p, true);
        edit.apply();
        requestPermissions(permissions.toArray(new String[0]), REQUEST_PERMISSIONS);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_PERMISSIONS) return;
        // An empty result means Android cancelled the request, for instance
        // because the screen was rotated. begin() runs again from onCreate.
        if (permissions == null || permissions.length == 0) return;
        if (launched || isFinishing()) return;

        List<String> missing = missing();
        if (missing.isEmpty()) {
            afterPermissions();
            return;
        }
        List<String> askable = askable(missing);
        if (!askable.isEmpty() && !retried) {
            retried = true;
            show("Cabana needs " + describe(missing),
                    reason(missing) + "\n\nYou can change this later in Android settings.",
                    "Allow", () -> request(askable),
                    "Not now", this::afterPermissions);
        } else if (askable.isEmpty()) {
            blocked(missing);
        } else {
            afterPermissions();
        }
    }

    /** Android will not show its dialog again: send them to the settings page. */
    private void blocked(List<String> missing) {
        if (!cooledDown("blocked")) {
            afterPermissions();
            return;
        }
        markNudged("blocked");
        show("Allow " + describe(missing) + " for Cabana",
                "Android is blocking " + describe(missing) + " for Cabana. " + reason(missing)
                        + "\n\nOpen Settings, choose Permissions"
                        + (missing.contains(Manifest.permission.POST_NOTIFICATIONS) ? " and Notifications" : "")
                        + ", and switch it on.",
                "Open settings", () -> openSettings(notificationsOnly(missing)),
                "Not now", this::afterPermissions);
    }

    /** Permission is held, but the phone's own location switch is off. */
    private void afterPermissions() {
        if (launched || isFinishing()) return;
        if (hasLocation() && locationSwitchedOff() && cooledDown("locationoff")) {
            markNudged("locationoff");
            show("Turn on your phone's location",
                    "Location is switched off on this phone, so Cabana cannot find you for pick-ups, "
                            + "nearby stays or an SOS. Turn it on, then come back.",
                    "Open settings", this::openLocationSettings,
                    "Not now", this::openWebsite);
            return;
        }
        openWebsite();
    }

    private void openWebsite() {
        dismissDialog();
        if (launched || isFinishing()) return;
        launched = true;
        launchTwa();
    }

    // ── what is missing ──────────────────────────────────────────────

    private List<String> missing() {
        List<String> out = new ArrayList<>();
        if (!hasLocation()) {
            for (String p : LOCATION) out.add(p);
        }
        if (!hasNotifications()) {
            // Before Android 13 there is no permission to ask for, only the
            // switch in settings, so the list stays empty for those phones
            // and blocked() sends them there.
            if (Build.VERSION.SDK_INT >= 33) out.add(Manifest.permission.POST_NOTIFICATIONS);
            else out.add(NOTIFICATIONS_SWITCH);
        }
        return out;
    }

    /** Marker for "notifications are switched off" on Android 12 and below. */
    private static final String NOTIFICATIONS_SWITCH = "cabana.notifications.switch";

    private boolean hasLocation() {
        for (String p : LOCATION) {
            if (checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED) return true;
        }
        return false;
    }

    private boolean hasNotifications() {
        if (Build.VERSION.SDK_INT >= 33) {
            return checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
        }
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        return nm == null || nm.areNotificationsEnabled();
    }

    private boolean locationSwitchedOff() {
        if (!hasLocation()) return false;
        LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (lm == null) return false;
        try {
            if (Build.VERSION.SDK_INT >= 28) return !lm.isLocationEnabled();
            return !(lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
        } catch (Exception e) {
            return false;
        }
    }

    /** Permissions Android will still show a dialog for. */
    private List<String> askable(List<String> missing) {
        List<String> out = new ArrayList<>();
        boolean locationAskable = false;
        for (String p : missing) {
            if (NOTIFICATIONS_SWITCH.equals(p)) continue;
            if (!prefs().getBoolean(ASKED + p, false) || shouldShowRequestPermissionRationale(p)) {
                if (p.equals(Manifest.permission.ACCESS_FINE_LOCATION)
                        || p.equals(Manifest.permission.ACCESS_COARSE_LOCATION)) {
                    locationAskable = true;
                } else {
                    out.add(p);
                }
            }
        }
        if (locationAskable) {
            for (String p : LOCATION) out.add(p);
        }
        return out;
    }

    private boolean neverAsked(List<String> permissions) {
        for (String p : permissions) {
            if (prefs().getBoolean(ASKED + p, false)) return false;
        }
        return true;
    }

    // ── copy ─────────────────────────────────────────────────────────

    private static boolean notificationsMissing(List<String> missing) {
        return missing.contains(Manifest.permission.POST_NOTIFICATIONS)
                || missing.contains(NOTIFICATIONS_SWITCH);
    }

    private static boolean locationMissing(List<String> missing) {
        return missing.contains(Manifest.permission.ACCESS_FINE_LOCATION)
                || missing.contains(Manifest.permission.ACCESS_COARSE_LOCATION);
    }

    private static boolean notificationsOnly(List<String> missing) {
        return notificationsMissing(missing) && !locationMissing(missing);
    }

    private static String describe(List<String> missing) {
        boolean n = notificationsMissing(missing), l = locationMissing(missing);
        if (n && l) return "notifications and location";
        return n ? "notifications" : "location";
    }

    private static String reason(List<String> missing) {
        boolean n = notificationsMissing(missing), l = locationMissing(missing);
        if (n && l) {
            return "Notifications reach you the moment a booking or message arrives, and location "
                    + "sets exact pick-up points, shows what is near you and sends help if you raise an SOS.";
        }
        if (n) {
            return "Without notifications a host or guest can be waiting on you and you would not know.";
        }
        return "Location sets exact pick-up points, shows what is near you and tells the safety desk "
                + "where you are if you raise an SOS.";
    }

    // ── plumbing ─────────────────────────────────────────────────────

    private void show(String title, String message,
                      String positive, Runnable onPositive,
                      String negative, Runnable onNegative) {
        dismissDialog();
        if (isFinishing() || isDestroyed()) return;
        dialog = new AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Light_Dialog_Alert)
                .setTitle(title)
                .setMessage(message)
                .setCancelable(false)
                .setPositiveButton(positive, (d, w) -> onPositive.run())
                .setNegativeButton(negative, (d, w) -> onNegative.run())
                .create();
        dialog.show();
    }

    private void dismissDialog() {
        if (dialog != null) {
            try { dialog.dismiss(); } catch (Exception ignored) { }
            dialog = null;
        }
    }

    private void openSettings(boolean notificationsOnly) {
        Intent intent;
        if (notificationsOnly && Build.VERSION.SDK_INT >= 26) {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.fromParts("package", getPackageName(), null));
        }
        startSettings(intent);
    }

    private void openLocationSettings() {
        startSettings(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS));
    }

    private void startSettings(Intent intent) {
        dismissDialog();
        awaitingSettings = true;
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException | SecurityException e) {
            awaitingSettings = false;
            openWebsite();
        }
    }

    private SharedPreferences prefs() {
        return getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private boolean cooledDown(String topic) {
        long last = prefs().getLong(NUDGED + topic, 0L);
        return System.currentTimeMillis() - last >= NUDGE_COOLDOWN_MS;
    }

    private void markNudged(String topic) {
        prefs().edit().putLong(NUDGED + topic, System.currentTimeMillis()).apply();
    }
}
