# How to get Cabana onto Google Play (beginner guide)

Read this top to bottom once. Each part tells you **what to click**, **what
to type**, and **what you should see**. If what you see is different, stop
and look at "If something goes wrong" at the end of that part.

Think of it like baking and delivering a cake:

| Real thing | In the cake story |
|---|---|
| This GitHub repo | The recipe |
| GitHub Actions | A kitchen that bakes the cake for you |
| The `.keystore` file + passwords | Your stamp that proves the cake is yours |
| The `.aab` file | The finished cake |
| Google Play Console | The shop |

Do **not** use PWABuilder any more. It uses an old recipe, and Google's
warnings come back.

---

## Part 0: Why version 3 (1.1.1) was rejected

Google rejected it because the **store description** said:

> Cabana is Africa's **#1** zero-commission travel super-app.

Google does not allow an app to rank itself: no "#1", "best", "top",
"leading", "first" or "App of the Year". That is the only reason. The app
itself was fine.

The fix has two halves:

1. **The store text** (in Play Console). New, approved-safe text is ready in
   [`store-listing/en-GB.md`](store-listing/en-GB.md). You paste it in Part 5.
2. **The website** the app opens. It said "#1", "best travel app" and
   "world's first" in about 30 places. All of those are rewritten in this
   pull request, and a test now stops them coming back.

Cabana still sounds like Cabana. Instead of claiming to be the best, it
says what is true and nobody else can say: **zero commission, hosts keep
100%, M-Pesa built in, Cabana Match: the offers come to you.**

---

## Part 1: Find your key file and passwords

You need three things. All of them came from PWABuilder when the app was
first made, in a zip file.

1. **The key file.** It ends in `.keystore`. Yours may be called
   `signing.keystore`, `signing_1.keystore` or `signing (1).keystore`.
2. **The store password.**
3. **The key password.**

The passwords are in a file called **`signing-key-info.txt`** from the same
zip. Open it with Notepad. It looks like this (your passwords will be
different):

```
Key store file: signing.keystore
Key store password: Abc123xyz
Key alias: my-key-alias
Key password: Abc123xyz
```

The alias must be `my-key-alias`. Yours is: the file you sent in the chat
has that alias.

**Make a safe folder for it:**

1. Open **File Explorer** (the yellow folder icon on the taskbar).
2. Click **This PC**, then double-click **Local Disk (C:)**.
3. Right-click an empty space → **New** → **Folder**. Name it `cabana-keys`.
4. Copy your `.keystore` file and `signing-key-info.txt` into `C:\cabana-keys`.
5. Right-click the `.keystore` file → **Rename** → type `signing.keystore`
   → press Enter. (If Windows asks "Are you sure you want to change the
   extension?", click **Yes**.)

> **Keep these safe forever.** If you lose the key file or passwords, you
> can never update the app again without asking Google to reset the key,
> which takes days. Put a copy on a USB stick or in Google Drive.
>
> **Never paste the passwords into a chat, email or GitHub file.** The only
> place they go is the GitHub **Secrets** page in Part 2.

---

## Part 2: Turn the key file into text (PowerShell)

GitHub secrets can only hold text, and the key file is not text. PowerShell
(a program already on every Windows PC) turns it into one long line of
text. Nothing is uploaded anywhere in this step.

### 2.1 Open PowerShell

1. Press the **Windows key** on your keyboard (or click Start).
2. Type `powershell`.
3. Click **Windows PowerShell**. A blue or black window opens with a line
   like:

```
PS C:\Users\YourName>
```

That blinking line is where you type. After each command, press **Enter**.

### 2.2 Go into your folder

Type this and press Enter:

```powershell
cd C:\cabana-keys
```

The line now starts with `PS C:\cabana-keys>`.

### 2.3 Check the file is there

```powershell
dir
```

You should see something like:

```
    Directory: C:\cabana-keys

Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        07/10/2026     11:26           2772 signing.keystore
-a----        07/10/2026     11:26            210 signing-key-info.txt
```

The keystore is a small file, about **2,772** bytes (the "Length" column).

### 2.4 Turn it into text

Copy this whole line exactly, paste it into PowerShell (right-click pastes),
and press Enter:

```powershell
$text = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\cabana-keys\signing.keystore"))
```

**You will see nothing happen.** That is correct. The text is now stored
under the name `$text`.

### 2.5 Check it worked

```powershell
$text.Length
```

You should see a number around:

```
3696
```

Any number in the thousands is fine. If you see `0` or red error text,
read "If something goes wrong" below.

### 2.6 Copy it

```powershell
$text | Set-Clipboard
```

Again **nothing is shown**, but the long text is now copied, just like
pressing Ctrl+C. Do not copy anything else until you finish Part 3, or
you will lose it. (If you do, run 2.4 and 2.6 again.)

Want to see it? Type `$text` and press Enter: you will see one huge line of
letters, numbers, `+`, `/` and maybe `=` at the end. That is your key as
text. You don't need to copy it from the screen; Set-Clipboard already did.

### If something goes wrong in Part 2

| You see | It means | Do this |
|---|---|---|
| `Cannot find path ... because it does not exist` | The folder is not there | Redo Part 1, "Make a safe folder" |
| `Could not find file 'C:\cabana-keys\signing.keystore'` | The file has another name | Type `dir`, look at the real name, and use it in 2.4 |
| `dir` shows `signing.keystore.txt` | Windows hid an extra `.txt` | In File Explorer click **View** → tick **File name extensions**, then rename it to `signing.keystore` |
| `$text.Length` shows `0` | 2.4 did not run | Run 2.4 again, then 2.5 |

---

## Part 3: Put the key into GitHub (once only)

1. Open **github.com/Kevinaloo/APATMENTO** in your browser and sign in.
2. Near the top of the repo click **Settings** (the ⚙️ gear tab, far right).
   If you can't see it, click the **···** menu first.
3. In the left menu, find **Security**, click **Secrets and variables**,
   then **Actions**.
4. Click the green **New repository secret** button.

Now add three secrets. For each one: type the **Name** exactly, paste the
**Secret**, click **Add secret**, then click **New repository secret** again
for the next.

| Name (type exactly) | Secret (what to paste) |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Press **Ctrl+V**. The long text from Part 2 goes in. |
| `ANDROID_KEYSTORE_PASSWORD` | The **Key store password** from `signing-key-info.txt` |
| `ANDROID_KEY_PASSWORD` | The **Key password** from `signing-key-info.txt` (often the same as above) |

When you are done you see three names in the list. GitHub never shows the
values again, not even to you. That is normal and it is what keeps them
safe.

**Tidy up:** close PowerShell. The copied text disappears from the
clipboard the next time you copy something else.

---

## Part 4: Bake the app (GitHub Actions)

First, the pull request with these changes must be **merged** and the
website deployed (Vercel shows a green tick on the latest commit on
`main`). The app opens the website, so the website goes first.

1. On the repo page, click the **Actions** tab.
2. In the left list click **Android app bundle**.
3. On the right click **Run workflow**. Leave the branch as `main`. Click
   the green **Run workflow** button.
4. A new row appears with a yellow dot (working). Wait about **10 minutes**.
   You can click it to watch.
5. **Green tick ✅** = the app is ready. Go to step 6.
   **Red cross ❌** = a safety check stopped it. Click the run, click
   **bundle**, and scroll to the red line. It says in plain words what is
   wrong:

   | Red line says | Do this |
   |---|---|
   | `Add the ANDROID_KEYSTORE_BASE64 secret first` | Part 3 wasn't finished. Do it again. |
   | `Keystore was tampered with, or password was incorrect` | A password secret is wrong. In Settings → Secrets, click the pencil next to it and paste it again. |
   | `Signed with ..., but Play expects the upload key DA:AC:E6:...` | That `.keystore` file is not the one Google knows. Find the original PWABuilder key file and redo Parts 2 and 3. |

6. Click the green run. Scroll to the bottom, to **Artifacts**.
7. Click **cabana-android-bundle**. A zip file downloads.
8. Open the zip. Inside is **`cabana-1.2.0-4.aab`**. That is the app.
   (The `.apk` next to it is only for installing by hand on a test phone.)

---

## Part 5: Fix the store text (this is what clears the rejection)

1. Open **play.google.com/console** and click **Cabana**.
2. Left menu: **Grow users** → **Store presence** → **Store listings**,
   then click your main listing (**Default store listing**).
3. Open [`store-listing/en-GB.md`](store-listing/en-GB.md) from this repo
   and copy each box into Play Console:
   - **App name** → `Cabana: Stays, Tours & Travel`
   - **Short description** → copy the short description box
   - **Full description** → copy the whole full description box
4. Scroll down to **Graphics**. Look at the **feature graphic** and every
   **phone screenshot**. If any picture has the words **#1, best, top,
   first, award** or **No. 1** written on it, delete that picture and
   upload one without those words. (Pictures of the app screens are fine.)
5. Click **Save** at the bottom.

---

## Part 6: Send the new version to Google

1. Left menu: **Test and release** → **Production**.
2. Click **Create new release**.
3. Drag `cabana-1.2.0-4.aab` into the **App bundles** box. Wait for the
   green tick. (It shows version code **4** and version **1.2.0**.)
4. **Release name**: `1.2.0 (4)`
5. **Release notes**: copy the release notes box from
   [`store-listing/en-GB.md`](store-listing/en-GB.md).
6. Click **Next**. Read any warnings (yellow is OK, red must be fixed),
   then **Save**.
7. Left menu: **Publishing overview**. You should see two changes waiting:
   the new release and the new store listing. Click **Send changes for
   review**.

Google usually reviews within 1 to 3 days (sometimes up to 7). You get an
email. Version 3 doesn't need deleting; version 4 replaces it.

> You do **not** need to "Submit an appeal". The appeal is for when you
> think Google is wrong. Here Google was right, and we fixed it.

---

## Part 7: Check it on a phone

When Google approves it:

1. Delete any old Cabana from the phone.
2. Install Cabana from the Play Store.
3. Check:
   - There is no web address bar at the top.
   - Turn the phone sideways: Cabana turns too.
   - Nothing hides behind the clock at the top or the buttons at the bottom.
   - It asks for **Location** and **Notifications** permission.

---

## Next time you release

Every upload needs a **bigger version number**. Google refuses a number it
has already seen, even from a rejected release.

1. Open `android/twa-manifest.json`.
2. Change `appVersionCode` by adding 1 (now 4, next 5).
3. Change `appVersionName` **and** `appVersion` to the same new name, for
   example `1.2.1`.
4. Merge, then repeat Parts 4, 6 and 7. (Parts 1 to 3 are once only;
   Part 5 only when the store text changes.)

Before saving any store text, check it against the rules at the top of
`store-listing/en-GB.md`: no #1, best, top, leading, first or only.
