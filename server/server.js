const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images

// Ensure 'uploads' directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.memoryStorage(); // Use memory storage to get a buffer
const upload = multer({ storage: storage });

const { exec } = require('child_process');

app.get('/api/models', async (req, res) => {
    exec('ollama list', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send('Failed to get models from Ollama.');
        }
        const models = stdout.split('\n').slice(1, -1).map(line => line.split(/\s+/)[0]);
        res.json(models);
    });
});

app.post('/api/run-ollama', upload.array('images'), async (req, res) => {
    console.log('[/api/run-ollama] endpoint hit');

    if (!req.files || req.files.length === 0 || !req.body.prompt) {
        console.error('[/api/run-ollama] Image files and prompt are required.');
        return res.status(400).send('Image files and prompt are required.');
    }

    const { prompt, model } = req.body;
    const imagesBase64 = req.files.map(file => file.buffer.toString('base64'));

    console.log(`[/api/run-ollama] Forwarding request to Ollama REST API with model ${model} and ${imagesBase64.length} images...`);

    try {
        const ollamaResponse = await axios.post('http://localhost:11434/api/generate', {
            model: model || 'qwen3-vl:8b',
            prompt: prompt,
            images: imagesBase64,
            stream: true, // We want a streaming response
        }, {
            responseType: 'stream'
        });

        res.setHeader('Content-Type', 'text/plain; charset=utf-f');
        res.setHeader('Transfer-Encoding', 'chunked');

        const startTime = performance.now();

        ollamaResponse.data.on('data', (chunk) => {
            try {
                const parsedChunk = JSON.parse(chunk.toString());
                if (parsedChunk.response) {
                    res.write(parsedChunk.response);
                }
                if (parsedChunk.done) {
                    const endTime = performance.now();
                    const latency = (endTime - startTime) / 1000;
                    res.write(JSON.stringify({ latency: latency.toFixed(2) }));
                    res.end();
                }
            } catch (e) {
                // Ignore chunks that are not valid JSON
            }
        });

        ollamaResponse.data.on('error', (err) => {
            console.error('[/api/run-ollama] Error from Ollama stream:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Stream error', details: err.message });
            }
            res.end();
        });

    } catch (error) {
        console.error('[/api/run-ollama] Error calling Ollama API:', error.message);

        let status = 500;
        let errorMessage = 'Failed to call Ollama API.';
        let details = error.message;

        if (error.code === 'ECONNREFUSED') {
            status = 503;
            errorMessage = 'Ollama Service Unavailable. Is Ollama running?';
        } else if (error.response && error.response.status === 404) {
            status = 404;
            errorMessage = `Model '${model}' not found.`;
            details = error.response.data;
        }

        if (!res.headersSent) {
            res.status(status).json({ error: errorMessage, details: details });
        }
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});