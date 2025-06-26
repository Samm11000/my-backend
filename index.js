require('dotenv').config();
const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');

const app = express();
const port = 3000;

// ✅ Log CORS setup
console.log("🚀 Enabling CORS for http://localhost:5173");
// ✅ Allow both local dev and S3 frontend
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://my-frontend-app-swym.s3-website-us-east-1.amazonaws.com'
  ]
}));

// ✅ Middleware
app.use(express.json());

// ✅ AWS SDK Config
console.log("🔐 Configuring AWS SDK...");
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
console.log("✅ AWS Config done.");

// ✅ Initialize AWS services
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();
console.log("✅ AWS Services initialized.");

// ✅ Setup Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.get('/', (req, res) => {
  res.send("✅ API is running");
});

// ✅ Upload Route
app.post('/upload', upload.single('file'), async (req, res) => {
  console.log("📥 POST /upload called");
  console.log("🧾 req.body:", req.body);
  console.log("📎 req.file:", req.file?.originalname);

  const { name, email } = req.body;
  const file = req.file;

  if (!file || !email || !name) {
    console.log("❌ Missing fields");
    return res.status(400).json({ error: 'Missing fields' });
  }

  const s3Params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: file.originalname,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    console.log("⬆️ Uploading to S3...");
    const s3Upload = await s3.upload(s3Params).promise();
    const fileUrl = s3Upload.Location;
    console.log("✅ Uploaded to S3:", fileUrl);

    const dbParams = {
      TableName: 'UserUploads',
      Item: {
        email,
        name,
        fileUrl,
      },
    };

    console.log("📝 Storing to DynamoDB...");
    await dynamodb.put(dbParams).promise();
    console.log("✅ Stored to DynamoDB");

    res.status(200).json({
      message: 'Upload successful',
      fileUrl,
    });
  } catch (err) {
    console.error("🔥 Upload Failed:", err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ✅ Start Server
app.listen(port, () => {
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);
});
