require('dotenv').config();
const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

// ✅ CORS should be here, before routes
app.use(cors({ origin: 'http://localhost:5173' }));

// AWS SDK config
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.json());

app.post('/upload', upload.single('file'), async (req, res) => {
  console.log('REQ BODY:', req.body);
  console.log('REQ FILE:', req.file);

  const { name, email } = req.body;
  const file = req.file;

  if (!file || !email || !name) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const s3Params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: file.originalname,
    Body: file.buffer,
    ContentType: file.mimetype,
  };

  try {
    const s3Upload = await s3.upload(s3Params).promise();
    const fileUrl = s3Upload.Location;

    const dbParams = {
      TableName: 'UserUploads',
      Item: {
        email,
        name,
        fileUrl,
      },
    };

    await dynamodb.put(dbParams).promise();

    res.status(200).json({
      message: 'Upload successful',
      fileUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
