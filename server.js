const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Log environment configuration
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: PORT,
  COHERE_API_KEY: process.env.COHERE_API_KEY ? '***' : 'Not set'
});

// Middleware
app.use(cors());
app.use(express.json());

// Log directory structure for debugging
console.log('Current directory:', __dirname);
console.log('Directory contents:', fs.readdirSync(__dirname));

// Serve static files from root with proper MIME types
app.use(express.static(__dirname, {
  extensions: ['html', 'htm', 'js', 'css', 'json', 'png', 'jpg', 'jpeg', 'gif', 'svg'],
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API endpoint for Cohere
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt, isGenerate = false } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const apiUrl = isGenerate 
            ? 'https://api.cohere.ai/v1/generate' 
            : 'https://api.cohere.ai/v1/chat';

        const requestBody = isGenerate
            ? {
                model: 'command',
                prompt: `Generate content about: ${prompt}`,
                max_tokens: 1000,
                temperature: 0.7,
                k: 0,
                p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
                stop_sequences: []
            }
            : {
                model: 'command-a-03-2025',
                message: `You are Cascade, a helpful AI coding assistant. Respond to the following in a helpful, concise manner:\n\n${prompt}`,
                temperature: 0.7,
                max_tokens: 500,
                k: 0,
                p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
                stop_sequences: []
            };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('API error:', error);
            return res.status(response.status).json({ error: 'Error from API' });
        }

        const data = await response.json();
        const responseText = isGenerate 
            ? data.generations?.[0]?.text || 'No content generated'
            : data.text || (data.message || 'No response from AI');
            
        res.json({ response: responseText });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('Error loading the application');
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server is running at:`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`Network: http://${require('os').networkInterfaces().Ethernet?.[1]?.address || 'localhost'}:${PORT}`);
  console.log(`\nPress Ctrl+C to stop the server\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});