require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const OpenAI = require('openai');
const fs = require('fs');
const axios = require('axios');

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

      // 1. Télécharger l'image depuis Twilio
      const imgResponse = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN,
        },
      });

      // 2. Encoder l'image en base64
      const base64Image = Buffer.from(imgResponse.data).toString('base64');

      // 3. L’envoyer sur ImgBB
      const imgbbUpload = await axios.post('https://api.imgbb.com/1/upload', null, {
        params: {
          key: process.env.IMGBB_API_KEY,
          image: base64Image,
        },
      });

      const imgbbUrl = imgbbUpload.data.data.url;
      console.log('🖼️ Image hébergée publiquement :', imgbbUrl);

      // 4. Préparer le message pour GPT-4o avec le lien public
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: "Voici une image envoyée par un client. Peux-tu la décrire et proposer un style adapté ?" },
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

    // Appel à GPT-4o
    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
    });

    const botReply = gptResponse.choices[0].message.content;
    twiml.message(botReply);
  } catch (err) {
    console.error('❌ Erreur traitement image ou GPT :', err.message);
    twiml.message("Désolé, je n'ai pas pu analyser l'image. Veux-tu réessayer avec une autre ou poser ta question autrement ?");
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(PORT, () => {
  console.log(`📲 Serveur Memphis Cut actif sur http://localhost:${PORT}`);
});
