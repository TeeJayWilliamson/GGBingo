const express = require('express');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public')); // Serve static files from 'public' directory

app.get('/maps-api', (req, res) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    res.send(`
        <script async src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGame"></script>
    `);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
