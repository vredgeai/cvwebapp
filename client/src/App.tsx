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
    const [latency, setLatency] = useState<string | null>(null);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [endTime, setEndTime] = useState<number | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string | null>(null);
    const [showDebug, setShowDebug] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const formatTime = (seconds: number | null): string => {
        if (seconds === null) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

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
        setLatency(null);

        try {
            console.log('Capturing frame...');
            const frame = await captureFrame();
            console.log('Frame captured:', frame);

            const formData = new FormData();
            formData.append('images', frame);
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
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                fullResponse += decoder.decode(value);
            }

            try {
                const potentialJson = fullResponse.substring(fullResponse.lastIndexOf('{'));
                const parsed = JSON.parse(potentialJson);
                if (parsed.latency) {
                    setLatency(parsed.latency);
                    const responseText = fullResponse.substring(0, fullResponse.lastIndexOf('{'));
                    setResult(responseText);
                } else {
                    setResult(fullResponse);
                }
            } catch (e) {
                setResult(fullResponse);
            }

        } catch (error) {
            console.error('Error running Ollama:', error);
            setResult('Error running model. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetStart = () => {
        if (videoRef.current) {
            setStartTime(videoRef.current.currentTime);
            setErrorMsg(null);
        }
    };

    const handleSetEnd = () => {
        if (videoRef.current) {
            setEndTime(videoRef.current.currentTime);
            setErrorMsg(null);
        }
    };

    const captureFrameAtTime = async (time: number): Promise<Blob | null> => {
        if (!videoRef.current) return null;

        return new Promise(async (resolve) => {
            // Seek to time
            videoRef.current!.currentTime = time;

            // Wait for seek to complete
            await new Promise((r) => {
                const onSeeked = () => {
                    videoRef.current?.removeEventListener('seeked', onSeeked);
                    r(null);
                };
                videoRef.current?.addEventListener('seeked', onSeeked);
            });

            // Capture frame
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current!.videoWidth;
            canvas.height = videoRef.current!.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoRef.current!, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg');
        });
    };

    const handleAnalyzeInterval = async () => {
        setErrorMsg(null);
        setDebugInfo(null);
        setShowDebug(false);

        if (startTime === null || endTime === null) {
            setErrorMsg('Please set both start and end times.');
            return;
        }
        if (startTime >= endTime) {
            setErrorMsg('End time must be after start time.');
            return;
        }

        if (endTime - startTime > 10) {
            setErrorMsg('Interval cannot exceed 10 seconds.');
            return;
        }

        setIsAnalyzing(true);
        setResult('');
        setLatency(null);

        try {
            // Generate timestamps: 1 frame per second
            const timestamps = [];
            for (let t = Math.ceil(startTime); t <= Math.floor(endTime); t++) {
                timestamps.push(t);
            }

            const blobs: Blob[] = [];
            for (const t of timestamps) {
                const blob = await captureFrameAtTime(t);
                if (blob) blobs.push(blob);
            }

            if (blobs.length === 0) {
                alert('No frames captured.');
                setIsAnalyzing(false);
                return;
            }

            const formData = new FormData();
            blobs.forEach((blob, index) => {
                formData.append('images', blob, `frame_${index}.jpg`);
            });
            formData.append('prompt', prompt || 'Describe the sequence of events in these frames.');
            formData.append('model', selectedModel);

            const response = await fetch('http://localhost:3001/api/run-ollama', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            if (!response.body) {
                throw new Error('No response from server');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                fullResponse += chunk;

                // Optimistic update for streaming effect (might contain JSON at end)
                // We'll clean it up at the end, but for now let's just show it
                // A better way is to parse partials, but for simplicity:
                setResult(prev => prev + chunk);
            }

            // Final cleanup for latency
            try {
                const potentialJsonIndex = fullResponse.lastIndexOf('{');
                if (potentialJsonIndex !== -1) {
                    const potentialJson = fullResponse.substring(potentialJsonIndex);
                    const parsed = JSON.parse(potentialJson);
                    if (parsed.latency) {
                        setLatency(parsed.latency);
                        setResult(fullResponse.substring(0, potentialJsonIndex));
                    } else {
                        setResult(fullResponse);
                    }
                } else {
                    setResult(fullResponse);
                }
            } catch (e) {
                setResult(fullResponse);
            }

        } catch (error: any) {
            console.error('Error analyzing interval:', error);
            let message = 'Error analyzing interval.';
            let details = error.message;

            try {
                const parsedError = JSON.parse(error.message);
                if (parsedError.error) {
                    message = parsedError.error;
                    details = JSON.stringify(parsedError, null, 2);
                }
            } catch (e) {
                // Not JSON, use original message
            }

            setErrorMsg(message);
            setDebugInfo(details);
        } finally {
            setIsAnalyzing(false);
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

                    <div className="card mb-3">
                        <div className="card-body">
                            <h6 className="card-subtitle mb-2 text-muted">Interval Analysis</h6>

                            <div className="mb-2">
                                <label className="form-label small mb-1">Start Time</label>
                                <div className="input-group input-group-sm">
                                    <input type="text" className="form-control" value={formatTime(startTime)} readOnly />
                                    <button className="btn btn-outline-secondary" type="button" onClick={handleSetStart}>Set Current</button>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label small mb-1">End Time</label>
                                <div className="input-group input-group-sm">
                                    <input type="text" className="form-control" value={formatTime(endTime)} readOnly />
                                    <button className="btn btn-outline-secondary" type="button" onClick={handleSetEnd}>Set Current</button>
                                </div>
                            </div>

                            {startTime !== null && endTime !== null && (
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <small className="text-muted">
                                        Duration: {(endTime - startTime).toFixed(2)}s
                                        ({Math.floor(endTime) - Math.ceil(startTime) + 1} frames)
                                    </small>
                                </div>
                            )}

                            {errorMsg && (
                                <div className="alert alert-danger py-1 px-2 mb-3 small">
                                    {errorMsg}
                                    {debugInfo && (
                                        <div className="mt-1">
                                            <button
                                                className="btn btn-link btn-sm p-0 text-danger"
                                                onClick={() => setShowDebug(!showDebug)}
                                                style={{ fontSize: '0.85em' }}
                                            >
                                                {showDebug ? 'Hide Debug Details' : 'Show Debug Details'}
                                            </button>
                                            {showDebug && (
                                                <pre className="mt-2 bg-white p-2 border rounded" style={{ fontSize: '0.75em', whiteSpace: 'pre-wrap' }}>
                                                    {debugInfo}
                                                </pre>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                className="btn btn-primary w-100"
                                onClick={handleAnalyzeInterval}
                                disabled={isAnalyzing || startTime === null || endTime === null}
                            >
                                {isAnalyzing ? 'Analyzing Sequence...' : 'Analyze Interval'}
                            </button>
                        </div>
                    </div>

                    {/* Bottom Right: Result */}
                    <div className="card mt-3" style={{ flex: '1 1 60%' }}>
                        <div className="card-body d-flex flex-column">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="card-title mb-0">Result</h5>
                                {latency && (
                                    <span className="badge bg-secondary">
                                        Latency: {latency}s
                                    </span>
                                )}
                            </div>
                            <div className="flex-grow-1 bg-light p-2 mt-2" style={{ minHeight: 0, overflowY: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
                                {result}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;