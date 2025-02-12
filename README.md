# Realtime OBS Translator

This project is a **real-time translation app** that integrates with **OBS Studio** to display translated subtitles live. It uses **OpenAI's GPT-4o Realtime API** for speech-to-text translation and updates OBS text sources dynamically.

## Features

- **Real-time translation**: Converts spoken language into translated text using GPT-4o.
- **OBS Studio integration**: Updates an OBS text source live with the translated subtitles.
- **WebSocket connectivity**: Connects to OBS via WebSocket for real-time updates.
- **Customizable settings**: Supports API key input, language selection, character limits, and OBS source configuration.
- **Live feedback indicators**: Shows connection status for both OBS and AI model.

## Requirements

- **OBS Studio** with WebSocket enabled (v5+ recommended)
- **OpenAI API Key** (for GPT-4o real-time access)
- **Modern browser** with WebRTC and WebSockets support

## Setup & Installation

1. **Clone the repository**:

   ```sh
   git clone https://github.com/your-repo/realtime-obs-translator.git
   cd realtime-obs-translator
   ```

2. **Install dependencies**:

   ```sh
   npm install
   ```

3. **Run the app**:

   ```sh
   npm run dev
   ```

4. **Configure your settings**:
   - Enter your **OpenAI API key**.
   - Set your **target translation language**.
   - Configure **OBS WebSocket settings** (URL, password, source name).
   - Adjust **character limits** for subtitles.

## Usage

1. **Start OBS Studio** and ensure WebSocket is enabled.
2. **Launch the app** (`npm run dev`) and enter your configurations.
3. Click **Start Session** to begin live translation.
4. OBS subtitles will update dynamically with translated text.

## Troubleshooting

- **OBS not connecting?** Ensure WebSocket is enabled in OBS (`ws://localhost:4455` by default).
- **No translation output?** Check your OpenAI API key and target language settings.
- **Laggy updates?** Reduce subtitle character limit for smoother performance.

## Technologies Used

- **React + Vite** – Frontend framework
- **OpenAI GPT-4o Realtime API** – Speech-to-text translation
- **OBS WebSocket API** – Real-time OBS integration
- **WebRTC** – Audio streaming for AI processing

## Future Improvements

- Multi-language subtitle support
- Enhanced UI/UX for session controls
- More OBS automation options

---

Made for seamless real-time translations in streaming and broadcasting!
