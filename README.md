# CV WebApp

A simple web application that allows you to analyze frames from a video using the Ollama and the `qwen3-vl:8b` multimodal model.

## Features

-   Upload a video file.
-   Play, pause, and seek through the video.
-   Capture the current frame of the video.
-   Enter a prompt to analyze the captured frame.
-   Get a real-time, streaming response from the Ollama model.

## Technology Stack

-   **Frontend:** React (TypeScript) with Bootstrap
-   **Backend:** Node.js with Express
-   **Computer Vision Model:** Ollama with `qwen3-vl:8b`

## Prerequisites

-   Node.js and npm
-   Ollama installed and running. You can download it from [https://ollama.com/](https://ollama.com/).
-   The `qwen3-vl:8b` model pulled. You can get it by running:
    ```bash
    ollama pull qwen3-vl:8b
    ```

## How to Run

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd cvwebapp
    ```

2.  **Install dependencies for the server:**
    ```bash
    cd server
    npm install
    cd ..
    ```

3.  **Install dependencies for the client:**
    ```bash
    cd client
    npm install
    cd ..
    ```

4.  **Start the application:**
    From the root `cvwebapp` directory, run the single start command:
    ```bash
    npm start
    ```

    This will start both the backend server (on port 3001) and the frontend client (on port 3000) simultaneously.

5.  **Open the application:**
    Open your web browser and navigate to `http://localhost:3000`.
