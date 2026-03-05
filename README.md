# Kyobo Book Scanner Automation Tool

This project provides a React-based interface and a Chrome Extension to automate the login process for the Kyobo Book Scanner System.

## Project Structure

- **React App**: Located in `/src/app`. This is the control panel where you enter credentials and manage files.
- **Chrome Extension**: Located in `/src/chrome-extension`. This script must be installed in your browser to perform the automation on the target site.

## How to Use

1. **Install the Chrome Extension**:
   - Go to `chrome://extensions` in your Chrome browser.
   - Enable "Developer mode".
   - Click "Load unpacked" and select the folder containing the extension files (you can copy the code from the "Extension Setup" tab in the app).

2. **Run the React App**:
   - Enter your 5-digit Employee ID and Password.
   - (Optional) Upload files to simulate the workflow.
   - Click **EXECUTE**.

3. **Automation**:
   - The app will open the Kyobo Scanner System page in a new tab.
   - The extension will automatically detect the credentials passed via the URL and log you in.

## Security Note

**Important:** This tool passes credentials via URL parameters for the extension to read. This is intended for specific internal automation workflows and should be used with caution. Do not use this method for highly sensitive public applications.
