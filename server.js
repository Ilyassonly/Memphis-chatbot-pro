require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const OpenAI = require('openai');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data'); // 👈 pour l’envoi ImgBB

const salonData = JSON.parse(fs.readFileSync('./salon.json', 'utf8'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
const PORT = process.env.PORT || 3000;

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
      console.log('📷 Image reçue via Twilio :', mediaUrl);

      // 1. Télécharger l’image depuis Twilio
      const imgResponse = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN,
        },
      });

      // 2. Convertir en base64
      const base64Image = Buffer.from(imgResponse.data).toString('base64');

      // 3. Envoyer à ImgBB via FormData
      const form = new FormData();
      form.append('key', process.env.IMGBB_API_KEY);
      form.append('image', base64Image);

      const imgbbUpload = await axios.post('https://api.imgbb.com/1/upload', form, {
        headers: form.getHeaders(),
      });

      const imgbbUrl = imgbbUpload.data.data.url;
      console.log('🖼️ Image publique hébergée :', imgbbUrl);

      // 4. Créer le message pour GPT-4o
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: "Voici une image envoyée par un client. Peux-tu la décrire et suggérer une coupe adaptée ?" },
            { type: 'image_url', image_url: { url: imgbbUrl } }
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
    console.error('❌ Erreur GPT ou ImgBB :', err.message);
    twiml.message("Désolé, je n'ai pas pu analyser l'image. Veux-tu réessayer ou envoyer une autre photo ?");
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(PORT, () => {
  console.log(`📲 Serveur Memphis Cut actif sur http://localhost:${PORT}`);
});

