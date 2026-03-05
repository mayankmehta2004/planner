https://planner-eight-smoky.vercel.app/

# Wall-Schedule

Wall-Schedule is a desktop execution system focusing on daily clarity. It acts as an interactive wallpaper, allowing you to define long-term roadmaps using AI, break them into daily tasks, and execute them in a distraction-free interface.

## Features

- **Roadmap Generation**: Use Gemini AI to generate linear, day-by-day plans for any goal.
- **Execution Mode**: A beautiful, unobtrusive wallpaper interface showing only today's tasks.
- **Smart Tracking**: Automatically moves missed tasks to a backlog at midnight.
- **Customization**: Choose from preset themes, upload your own wallpaper, or change layout alignment.
- **Privacy**: All data is stored locally on your machine.

## Prerequisites

- Node.js (v18 or higher recommended)
- An API Key for Google Gemini

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/wall-schedule.git
   cd wall-schedule
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   - Create a `.env` file in the root directory.
   - Add your API key:
     ```
     API_KEY=your_gemini_api_key_here
     ```

## Running Locally

To run the web version (Setup/Preview mode):

```bash
npm run dev
```

To run the Electron Desktop App (Development):

```bash
npm run electron:dev
```

## Building for Production

To build the executable for your OS (Windows/Mac/Linux):

```bash
npm run dist
```

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Desktop Wrapper**: Electron
- **Bundler**: Vite
- **AI**: Google Gemini API

## License

MIT
