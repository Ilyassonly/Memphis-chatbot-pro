require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const OpenAI = require('openai');
const fs = require('fs');
const axios = require('axios');
const mime = require('mime-types');

const salonData = JSON.parse(fs.readFileSync('./salon.json', 'utf8'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
Tu es un assistant professionnel du salon de coiffure MEMPHIS CUT (2025). 
Services :
${salonData.services.map(s => `- ${s.nom} : ${s.prix}€ (${s.duree})`).join('\n')}
Horaires : ${salonData.horaires}
Règlement : ${salonData.reglement}
Tendances :
${salonData.tendances.map(t => `- ${t}`).join('\n')}
Réponds toujours de manière professionnelle, chaleureuse, et concise.
`;

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.send('Bot Memphis Cut est en ligne 🧠✂️');
});

app.post('/whatsapp', async (req, res) => {
  const userMsg = req.body.Body;
  const mediaUrl = req.body.MediaUrl0;
  const numMedia = parseInt(req.body.NumMedia || '0', 10);
  const twiml = new MessagingResponse();

  try {
    let messages;

    if (numMedia > 0 && mediaUrl) {
      console.log('📷 Image reçue :', mediaUrl);

      // 🔐 Télécharger l'image protégée depuis Twilio
      const response = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN,
        },
      });

      // ✅ Détecter le bon type MIME (jpg, png, etc.)
      const mimeType = mime.lookup(mediaUrl) || 'image/jpeg';

      // 🔄 Transformer en base64
      const base64Image = Buffer.from(response.data).toString('base64');
      const imageData = `data:${mimeType};base64,${base64Image}`;

      // 🧠 Envoyer à GPT-4o
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: "Voici une photo envoyée par un client. Analyse-la et propose une coupe ou un style adapté." },
            { type: 'image_url', image_url: { url: imageData } }
          ]
        }
      ];
    } else {
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg }
      ];
    }

    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
    });

    const botReply = gptResponse.choices[0].message.content;
    twiml.message(botReply);
  } catch (err) {
    console.error('❌ Erreur :', err.message);
    twiml.message("Désolé, je n’ai pas pu analyser cette image. Essaie avec une autre ou envoie un message.");
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(PORT, () => {
  console.log(`📲 Serveur Memphis Cut actif sur http://localhost:${PORT}`);
});
