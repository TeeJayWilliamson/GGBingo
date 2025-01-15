const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Configure Helmet with custom CSP
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",
                    "'unsafe-eval'",
                    "https://maps.googleapis.com",
                    "https://maps.gstatic.com"
                ],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                imgSrc: ["'self'", "https:", "data:", "blob:"],
                connectSrc: ["'self'", "https://*.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                objectSrc: ["'none'"],
                mediaSrc: ["'none'"],
                frameSrc: ["'none'"],
                workerSrc: ["'self'"]
            },
        },
        crossOriginEmbedderPolicy: false
    })
);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Google Maps API endpoint with correct MIME type
app.get('/maps-api', (req, res) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return res.status(500).send('Google Maps API Key is not configured.');
    }
    
    // Explicitly set the content type to JavaScript
    res.set('Content-Type', 'application/javascript');
    
    // Send the script
    res.send(`
        // Create and load Google Maps script
        const script = document.createElement('script');
        script.src = "https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGame";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    `);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});