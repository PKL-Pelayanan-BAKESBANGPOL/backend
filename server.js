const express = require('express');
const admin = require('firebase-admin');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const serviceAccount = require('./govservice-2024-firebase-adminsdk-sx52a-f73caae837.json'); // Path to your service account key file

const app = express();
const port = 3000;

// Konfigurasi Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://govservice-2024.appspot.com' // Ganti dengan Firebase Storage bucket Anda
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Middleware untuk parsing JSON dan mengunggah file
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Maksimum file size 10MB
  },
});

// Endpoint untuk menerima data dari form
app.post('/api/submit-form', upload.fields([
  { name: 'suratPengantarFile', maxCount: 1 },
  { name: 'proposalFile', maxCount: 1 },
  { name: 'ktpFile', maxCount: 1 },
]), async (req, res) => {
  const {
    name,
    researcherName,
    address,
    inputValue,
    institution,
    occupation,
    judulPenelitian,
    researchField,
    tujuanPenelitian,
    supervisorName,
    teamMembers,
    statusPenelitian,
    researchPeriod,
    researchLocation
  } = req.body;

  try {
    const uploadFileToFirebase = async (file) => {
      const blob = bucket.file(`${uuidv4()}_${file.originalname}`);
      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      return new Promise((resolve, reject) => {
        blobStream.on('error', (err) => {
          reject(err);
        });

        blobStream.on('finish', async () => {
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          resolve(publicUrl);
        });

        blobStream.end(file.buffer);
      });
    };

    const suratPermohonanUrl = req.files?.suratPengantarFile?.[0] ? await uploadFileToFirebase(req.files.suratPengantarFile[0]) : null;
    const proposalUrl = req.files?.proposalFile?.[0] ? await uploadFileToFirebase(req.files.proposalFile[0]) : null;
    const fotocopyKTPUrl = req.files?.ktpFile?.[0] ? await uploadFileToFirebase(req.files.ktpFile[0]) : null;

    await db.collection('pelayanan').doc('penelitian').collection('data').add({
      name,
      researcherName,
      address,
      inputValue,
      institution,
      occupation,
      judulPenelitian,
      researchField,
      tujuanPenelitian,
      supervisorName,
      teamMembers,
      statusPenelitian,
      researchPeriod,
      researchLocation,
      suratPermohonanUrl,
      proposalUrl,
      fotocopyKTPUrl
    });

    res.json({ message: 'Data berhasil disimpan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan saat menyimpan data' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
