# Voice Debate Lab Mobile

This is the real mobile-app version of the voice debate agent.

## Shape

```text
mobile-app
  Expo React Native app
  Mic recording -> server -> transcript/reply/feedback -> phone TTS

server
  Node API
  Audio transcription -> debate agent -> coach feedback
```

## Install

This project is pinned to Expo SDK 54 so it works with Expo Go 54.0.2.

```bash
cd mobile-app
npm install
npx expo install expo-audio expo-speech expo-status-bar
```

## Configure local API URL

Create `mobile-app/.env.local`:

```text
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:8787
```

Use your computer's LAN IP, not `localhost`, when testing on a physical phone.
For Android emulator, `http://10.0.2.2:8787` is commonly used.

For TestFlight builds, `EXPO_PUBLIC_API_URL` must be a server URL the iPhone can
reach outside Expo Go. Prefer HTTPS, for example a small deployed server or an
HTTPS tunnel to the local server while testing.

## Run

Start the server first:

```bash
cd ../server
npm start
```

To use Claude for debate replies before you have an OpenAI key:

Create `server/.env`:

```text
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-haiku-4-5
```

Then run:

```powershell
npm.cmd start
```

With only `ANTHROPIC_API_KEY`, typed arguments use real Claude replies. Voice
recording still uses mock transcription until `OPENAI_API_KEY` or another STT
provider is added.

Then start the app:

```bash
cd ../mobile-app
npx expo start
```

Scan the QR code with Expo Go.

## TestFlight

TestFlight requires an Apple Developer Program account and an Expo/EAS account.
The iOS bundle identifier is:

```text
com.grunj.voicedebatelab
```

Before building, make sure `mobile-app/.env.local` points to a public API URL:

```text
EXPO_PUBLIC_API_URL=https://YOUR_PUBLIC_SERVER_OR_TUNNEL
```

Then run:

```powershell
cd mobile-app
npx eas-cli login
npx eas-cli build --platform ios --profile production
```

When the build finishes, submit it to App Store Connect/TestFlight:

```powershell
npx eas-cli submit --platform ios --profile production
```

After Apple processes the build in App Store Connect, add yourself as an internal
tester or create an external TestFlight group.

