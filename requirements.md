# CV WebApp Requirements

## 1. Product Summary

A modern, single-page web application that allows users to upload a video and an image, and then use a local Ollama model to describe the image. The application will be built with React (using TypeScript) and a simple Node.js/Express backend. The focus will be on a polished, easy-to-use interface with a modern feel, using Bootstrap for styling.

## 2. Core Features

*   **Video and Image Upload:** Users can upload a video file (MP4, MOV, MKV) and an image file (JPG, PNG).
*   **Prompt Input:** A single text area for the user to enter a prompt for the Ollama model.
*   **Ollama Integration:** The application will use a local Ollama model (`qwen3-vl:8b`) to process the image and the prompt.
*   **Display Results:** The application will display the output from the Ollama model in a clear and readable format.
*   **Polished UI/UX:** The application will have a clean, modern, and intuitive user interface, built with React and Bootstrap.

## 3. Technology Stack

*   **Frontend:** React (TypeScript)
*   **Backend:** Node.js with Express (for handling file uploads and running the Ollama command)
*   **Styling:** Bootstrap

## 4. User Journey

1.  The user opens the web application in their browser.
2.  The user is presented with a clean and simple interface with three main components:
    *   An area to upload a video.
    *   An area to upload an image.
    *   A text area to enter a prompt.
3.  The user uploads a video and an image. Previews of the uploaded files are displayed.
4.  The user enters a prompt in the text area.
5.  The user clicks a "Run" button.
6.  The application sends the image and the prompt to the backend.
7.  The backend saves the image to a temporary file and runs the `ollama run qwen3-vl:8b <image_path> "<prompt>"` command.
8.  The backend sends the output from the Ollama command back to the frontend.
9.  The frontend displays the output in a designated area.

## 5. Non-Functional Requirements

*   **No Authentication:** No user login or authentication is required.
*   **No Database:** No database is needed. The application is stateless.
*   **Local-First:** The application is designed to be run locally and interact with a local Ollama installation.
*   **Modern UI/UX:** The application should be visually appealing and easy to use, following modern design principles.

## 6. Project Structure (Recommended)

```
/cvwebapp
├── client/         // React frontend
│   ├── public/
│   └── src/
│       ├── components/
│       ├── App.tsx
│       ├── index.tsx
│       └── ...
├── server/         // Node.js backend
│   ├── server.js
│   └── ...
├── package.json
└── ...
```
