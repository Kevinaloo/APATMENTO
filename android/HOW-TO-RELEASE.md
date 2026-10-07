# How to put a new Cabana app on Google Play (the simple way)

Think of it like baking and delivering a cake:

- **The recipe** is already in this repo.
- **GitHub** is the kitchen that bakes the cake for you.
- **Google Play** is the shop that sells it.

Do **not** use PWABuilder. It uses an old recipe and the warnings come back.

---

## Part 1: Give the kitchen your secret key (do this once)

The key proves the app really is yours. Google will only accept apps signed
with it. You got it from PWABuilder as `signing.keystore`, plus a file called
`signing-key-info.txt` with two passwords.

1. Open the repo on GitHub: `github.com/kevinaloo/apatmento`.
2. Click **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret** and add these three, one at a time:

| Name | What to paste |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | The key file turned into text. On Windows open PowerShell and run: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("signing.keystore"))` and paste the long text it prints. |
| `ANDROID_KEYSTORE_PASSWORD` | The store password from `signing-key-info.txt` |
| `ANDROID_KEY_PASSWORD` | The key password from `signing-key-info.txt` (often the same one) |

Never share these or put them in a chat. Once they are saved you do not touch
them again.

## Part 2: Put the new website live

The app is a window onto cabana.africa, so the website goes first.

1. Merge the pull request that goes with this file.
2. Wait for Vercel to finish deploying (the green tick on GitHub).

## Part 3: Ask the kitchen to bake the app

1. On GitHub click the **Actions** tab.
2. On the left click **Android app bundle**.
3. Click the **Run workflow** button, then the green **Run workflow** button.
4. Wait about 10 minutes. A green tick means the cake is ready.
   A red cross means a safety check failed: click it and read the red line.
   It tells you in plain words what is wrong.
5. Click the finished run and scroll to **Artifacts**.
6. Download **cabana-android-bundle**. Unzip it.
   The file you want ends in **`.aab`**, for example `cabana-1.2.0-4.aab`.

## Part 4: Take the cake to the shop

1. Open Google Play Console and pick **Cabana**.
2. Left menu: **Test and release** → **Testing** → **Open testing**
   (this is the safe room: try it first, ship it later).
3. Click **Create new release**.
4. Drag in the `.aab` file and wait for the tick.
5. **Release name:** `1.2.0 (4)`
6. **Release notes:** paste this:

```
<en-GB>
• Fills the whole screen, edge to edge, on Android 15 and later
• Rotates with your phone, tablet or foldable
• Smaller and faster to start
</en-GB>
```

7. Click **Next**, then **Save**, then **Send for review**.

## Part 5: Try it on a real phone

1. Delete any old Cabana from the phone.
2. Install the testing version from the Play testing link.
3. Check these four things:
   - No address bar at the top.
   - Turn the phone sideways: the app turns too.
   - Nothing hides behind the clock or the bottom buttons.
   - Location and Notifications ask permission.

## Part 6: Open the shop doors to everyone

If the phone check was good:

1. Play Console → **Production** → **Create new release**.
2. Click **Add from library** and pick the version you tested.
3. **Next** → **Save** → **Send for review**.
4. When Google says it is live, the four warnings on the Release dashboard
   should be gone (the "deprecated APIs" one may stay; that is fine).

---

## Next time

Every new version needs a **bigger number**. Open `android/twa-manifest.json`
and change both:

- `appVersionCode`: add 1 (now 4, next 5). Google refuses a number it has seen.
- `appVersionName` and `appVersion`: for example `1.2.1`.

Then repeat Parts 3 to 6.

## If you have no GitHub kitchen

You can bake on your own computer instead. It needs Node 22 and Java 17:

```
ANDROID_KEYSTORE=~/keys/signing.keystore \
BUBBLEWRAP_KEYSTORE_PASSWORD=… BUBBLEWRAP_KEY_PASSWORD=… \
android/build-aab.sh
```

The `.aab` appears in `android/dist/`.
