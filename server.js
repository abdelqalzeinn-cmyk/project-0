const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch'); // Import node-fetch

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Log directory structure for debugging
console.log('Current directory:', __dirname);
console.log('Directory contents:', fs.readdirSync(__dirname));

// Serve static files from root
app.use(express.static(__dirname));

// Explicit root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('Error loading the application');
    }
  });
});

// API endpoint for Cohere
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const response = await fetch('https://api.cohere.ai/v1/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: 'command-a-03-2025',
                message: `You are Cascade, a helpful AI coding assistant. Respond to the following in a helpful, concise manner:\n\n${prompt}`,
                temperature: 0.7,
                max_tokens: 500,
                k: 0,
                p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
                stop_sequences: []
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Cohere API error:', error);
            return res.status(response.status).json({ error: 'Error from Cohere API' });
        }

        const data = await response.json();
        // Extract the response text from the chat API response
        const responseText = data.text || (data.message || 'No response from AI');
        res.json({ response: responseText });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});