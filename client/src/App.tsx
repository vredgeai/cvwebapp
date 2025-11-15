import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import VideoPlayer from './components/VideoPlayer';

function App() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [models, setModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/models');
                if (!response.ok) {
                    throw new Error('Failed to fetch models');
                }
                const data = await response.json();
                setModels(data);
                if (data.length > 0) {
                    setSelectedModel(data[0]);
                }
            } catch (error) {
                console.error('Error fetching models:', error);
            }
        };

        fetchModels();
    }, []);


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
            formData.append('model', selectedModel);

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
        <div className="container-fluid vh-100 d-flex flex-column p-3">
            <div className="text-center mb-3">
                <h1>CV WebApp</h1>
            </div>
            <div className="row flex-grow-1 g-3">
                {/* Left Column: Video */}
                <div className="col-md-6 d-flex flex-column">
                    <div className="card flex-grow-1">
                        <div className="card-body d-flex flex-column">
                            <h5 className="card-title">1. Video</h5>
                            <div className="mb-3">
                                <input className="form-control" type="file" accept="video/*" onChange={handleVideoChange} />
                            </div>
                            <div className="flex-grow-1" style={{ minHeight: 0 }}>
                                {videoFile && (
                                    <VideoPlayer ref={videoRef} videoFile={videoFile} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Prompt and Result */}
                <div className="col-md-6 d-flex flex-column g-3">
                    {/* Top Right: Prompt */}
                    <div className="card" style={{ flex: '0 1 40%' }}>
                        <div className="card-body d-flex flex-column">
                            <h5 className="card-title">2. Prompt</h5>
                            <div className="mb-3">
                                <label htmlFor="model-select" className="form-label">Model</label>
                                <select
                                    id="model-select"
                                    className="form-select"
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                >
                                    {models.map(model => (
                                        <option key={model} value={model}>{model}</option>
                                    ))}
                                </select>
                            </div>
                            <textarea
                                className="form-control flex-grow-1"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="e.g., 'Describe this frame in detail.'"
                            ></textarea>
                            <button className="btn btn-primary mt-3" onClick={handleSubmit} disabled={loading || !videoFile}>
                                {loading ? 'Running...' : 'Run Analysis on Paused Frame'}
                            </button>
                        </div>
                    </div>

                    {/* Bottom Right: Result */}
                    <div className="card mt-3" style={{ flex: '1 1 60%' }}>
                        <div className="card-body d-flex flex-column">
                            <h5 className="card-title">Result</h5>
                            <pre className="flex-grow-1 bg-light p-2" style={{ minHeight: 0, overflowY: 'auto' }}>
                                {result}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;