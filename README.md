# Cognitive Code Analyser

A professional web application for analyzing coding sessions, identifying mistake patterns, and tracking improvement over time using AI-powered analysis.

## Overview

Cognitive Code Analyser is a personal learning tool designed to help programmers identify and fix recurring mistakes in their code. It records your coding sessions, analyzes your thought process, and provides detailed insights into your coding patterns.

## Features

### Session Recording
- **Code Snapshots**: Automatically captures code at intervals during problem-solving
- **Problem Context**: Supports LeetCode URLs or custom problem statements
- **Dual Modes**: Practice mode with AI hints, Exam simulation mode without assistance

### AI-Powered Analysis
- **Mistake Detection**: Identifies 6 types of errors (Conceptual, Logical, Structural, Implementation, Performance, Boundary)
- **Root Cause Analysis**: Explains why mistakes occurred, not just what went wrong
- **Timeline Reconstruction**: Shows your thought process evolution during the session

### Pattern Recognition
- **Cross-Session Learning**: Tracks recurring mistake patterns across all sessions
- **Severity Scoring**: Prioritizes high-impact patterns for focused improvement
- **Historical Examples**: Links current mistakes to past occurrences

### Built-in Tools
- **Logic Validator**: Verify your approach before implementation
- **Pseudocode Hints**: Get algorithmic guidance without full solutions
- **Reference Library**: Quick access to common patterns and algorithms

## Tech Stack

- **Frontend**: React 18, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **AI Backend**: Gemini API (Free Tier)
- **Storage**: LocalStorage (browser-based, no server required)
## Website(Recommended way of using)
https://coginitive-code-analyser-8.vercel.app/

## Installation

### Prerequisites
- Node.js 16+
- Gemini API Key (free from Google AI Studio)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/AKSHAY-RSOL/coginitive-code-analyser-8.git
   cd coginitive-code-analyser-8
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create .env.local and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173 in your browser

## Usage

1. **Create Account**: Set up a local profile with your API key(s)
2. **Start Session**: Paste a problem (LeetCode URL or description) and begin coding
3. **Write Code**: The app captures snapshots as you work
4. **End & Analyze**: Get a detailed report of your mistakes and patterns
5. **Review History**: Track improvement across sessions on the dashboard

## Project Structure

```
coginitive-code-analyser-8/
 App.tsx                 # Main application component
 index.tsx               # Entry point
 types.ts                # TypeScript interfaces
 components/             # React components
    Dashboard.tsx       # Session history & patterns
    SessionRecorder.tsx # Live coding interface
    AnalysisReport.tsx  # Results visualization
    ...
 services/               # Business logic
    gemini.ts           # AI integration
    analysis.ts         # Pattern detection
    storage.ts          # LocalStorage handling
 data/                   # Reference patterns & templates
```

## Privacy

All data is stored locally in your browser. No server, no tracking, no data collection.

## Author

Built by **Akshay Gupta Burela**

## License

MIT License

