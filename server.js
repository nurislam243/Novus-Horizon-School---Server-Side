const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');
const studentRoutes = require('./src/routes/studentRoutes');
const teacherRoutes = require('./src/routes/teacherRoutes');

dotenv.config();

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Main Routes
app.use('/api', studentRoutes);
app.use('/api', teacherRoutes);

app.get('/', (req, res) => {
    res.send('Novus Horizon Server is Ready');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});