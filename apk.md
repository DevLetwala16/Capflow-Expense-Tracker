Role: You are an expert Mobile and Full-Stack Developer. I have an existing nextjs project folder containing a web frontend and a configuration where the backend is hosted on Render. All my environment variables are stored in an `.env.local` file (including my backend API base URL pointing to Render).

Objective: Convert my existing frontend into a native Android `.APK` file without modifying or breaking any existing code logic. The final generated `.apk` file and its essential build outputs must be automatically saved into a newly created directory named `APK` in the project root so it is easy to find and download.

Please execute and guide me through the following comprehensive steps:

1. Environment & Config Verification:
   - Identify how environment variables are handled in my project (e.g., Vite, React Scripts, Next.js, or Vanilla JS).
   - Ensure the production API base URL from `.env.local` (pointing to my Render backend) is correctly bundled into the frontend static build.

2. Capacitor Integration & Setup:
   - Install and configure Capacitor (`@capacitor/core`, `@capacitor/cli`, and `@capacitor/android`) in my project root.
   - Initialize Capacitor with a clean App ID (e.g., `com.project.app`) and App Name.
   - Update `capacitor.config.json` to ensure web assets point to the correct build output folder (`dist`, `build`, etc.).

3. Android Native Configuration & Permissions:
   - Verify that the Android manifest (`AndroidManifest.xml`) includes the necessary internet permission (`android.permission.INTERNET`) so the app can communicate smoothly with the Render backend.
   - Ensure CORS or network security settings won't block requests to the external Render URL.

4. Build, Sync & Export Process:
   - Run the exact terminal commands to:
     a) Build the web frontend production files with environment variables baked in.
     b) Add the Android platform (`npx cap add android`).
     c) Sync the assets (`npx cap sync android`).
     d) Compile the native Android debug/release APK (e.g., using `./gradlew assembleDebug`).

5. Automated Output Management (New Feature):
   - Automatically create a new folder named `APK` in the project root directory if it does not already exist.
   - Locate the generated `.apk` file from its default Android build path (e.g., `android/app/build/outputs/apk/debug/app-debug.apk`) and copy/move it directly into the new `APK` folder.
   - Rename it clearly (e.g., `Capflow.apk`) for instant sharing and downloading.

6. Convenience Script (Bonus Feature):
   - Create a helper npm script or a short shell script (`build-apk.sh`) in the root directory so I can rebuild and update the APK inside the `APK` folder with a single command in the future.

Please keep all existing code intact and give me clean, error-free execution and terminal commands for every step.