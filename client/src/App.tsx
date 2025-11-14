import React, { useState, useRef } from 'react';
import './App.css';
import VideoPlayer from './components/VideoPlayer';

function App() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setVideoFile(event.target.files[0]);
        }
    };

    const captureFrame = (): Promise<File> => {
        return new Promise((resolve, reject) => {
            if (videoRef.current) {
                const canvas = document.createElement('canvas');
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(new File([blob], 'frame.jpg', { type: 'image/jpeg' }));
                        } else {
                            reject('Failed to create blob from canvas.');
                        }
                    }, 'image/jpeg');
                } else {
                    reject('Failed to get canvas context.');
                }
            } else {
                reject('Video element not found.');
            }
        });
    };

    const handleSubmit = async () => {
        console.log('handleSubmit called');
        if (!videoFile || !prompt) {
            alert('Please upload a video and enter a prompt.');
            return;
        }

        setLoading(true);
        setResult('');

        try {
            console.log('Capturing frame...');
            const frame = await captureFrame();
            console.log('Frame captured:', frame);

            const formData = new FormData();
            formData.append('image', frame);
            formData.append('prompt', prompt);

            console.log('Sending request to backend...');
            const response = await fetch('http://localhost:3001/api/run-ollama', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                const chunk = decoder.decode(value);
                setResult((prevResult) => prevResult + chunk);
            }

        } catch (error) {
            console.error('Error during analysis:', error);
            setResult('An error occurred. Please check the console for details.');
        } finally {
            setLoading(false);
            console.log('handleSubmit finished.');
        }
    };

    return (
        <div className="container mt-5">
            <div className="text-center mb-4">
                <h1>CV WebApp</h1>
                <p className="lead">Upload a video, pause it at the desired frame, and then analyze the frame with a prompt.</p>
            </div>

            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">1. Upload Video</h5>
                    <div className="mb-3">
                        <input className="form-control" type="file" accept="video/*" onChange={handleVideoChange} />
                    </div>
                    {videoFile && (
                        <VideoPlayer ref={videoRef} videoFile={videoFile} />
                    )}
                </div>
            </div>

            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">2. Enter Prompt</h5>
                    <textarea
                        className="form-control"
                        rows={3}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., 'Describe this frame in detail.'"
                    ></textarea>
                </div>
            </div>

            <div className="text-center">
                <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading || !videoFile}>
                    {loading ? 'Running...' : 'Run Analysis on Paused Frame'}
                </button>
            </div>

            {result && (
                <div className="card mt-4">
                    <div className="card-body">
                        <h5 className="card-title">Result</h5>
                        <pre>{result}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
