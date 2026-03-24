import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { setupSockets } from './socket.manager';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Set up specific sub-routers if we get larger
// For now, handling uploads here

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${id}${ext}`);
  }
});

const upload = multer({ storage });

// Serve static files (the uploaded images)
app.use('/uploads', express.static(uploadsDir));

// Endpoint to upload a Game Pack
app.post('/api/upload-pack', upload.array('images', 20), (req: Request, res: Response) => {
  if (!req.files || !(req.files as Express.Multer.File[]).length) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  const files = req.files as Express.Multer.File[];
  const urls = files.map(file => `/uploads/${file.filename}`);

  res.json({ success: true, urls });
});

// Initialize WebSockets logic
setupSockets(io);

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
});
