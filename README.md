# CV WebApp

A simple web application that allows you to analyze frames from a video using a selected Ollama multimodal model.

## Features

-   Upload a video file.
-   Play, pause, and seek through the video.
-   Capture the current frame of the video.
-   Select any available Ollama model.
-   Enter a prompt to analyze the captured frame.
-   Get a real-time, streaming response from the Ollama model.

## Technology Stack

-   **Frontend:** React (TypeScript) with Bootstrap
-   **Backend:** Node.js with Express
-   **Computer Vision Model:** Ollama

## Prerequisites

-   Node.js and npm
-   Ollama installed and running. You can download it from [https://ollama.com/](https://ollama.com/).
-   At least one multimodal model pulled (e.g., `qwen3-vl:8b`). You can get it by running:
    ```bash
    ollama pull qwen3-vl:8b
    ```

## How to Run

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd cvwebapp
    ```

2.  **Start the backend server:**
    In a new terminal window, navigate to the `server` directory and run:
    ```bash
    cd server
    npm install
    npm start
    ```
    The server will be running on `http://localhost:3001`.

3.  **Start the frontend client:**
    In another terminal window, navigate to the `client` directory and run:
    ```bash
    cd client
    npm install
    npm start
    ```
    The client will be running on `http://localhost:3000`.

4.  **Open the application:**
    Open your web browser and navigate to `http://localhost:3000`.
