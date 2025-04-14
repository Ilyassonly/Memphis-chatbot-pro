require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const OpenAI = require('openai');
const fs = require('fs');

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

// Permet de lire les données envoyées par Twilio
app.use(bodyParser.urlencoded({ extended: false }));

// Pour test rapide (Render, navigateur, etc.)
app.get('/', (req, res) => {
  res.send('Bot Memphis Cut est en ligne 🧠✂️');
});

// Route appelée par Twilio
app.post('/whatsapp', async (req, res) => {
  const userMsg = req.body.Body;
  const mediaUrl = req.body.MediaUrl0;
  const numMedia = parseInt(req.body.NumMedia || '0', 10);

  try {
    let messages;

    if (numMedia > 0 && mediaUrl) {
      // Si une image est reçue
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: "Voici une image envoyée par un client. Décris ce que tu vois et propose un style ou une coupe adaptée :" },
            { type: 'image_url', image_url: { url: mediaUrl } }
          ]
        }
      ];
    } else {
      // Si c'est un message texte
      messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg }
      ];
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
    });

    const botReply = response.choices[0].message.content;

    const twiml = new MessagingResponse();
    twiml.message(botReply);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  } catch (err) {
    console.error('❌ Erreur OpenAI :', err.message);
    res.status(500).send('Erreur serveur');
  }
});

app.listen(PORT, () => {
  console.log(`📲 Serveur WhatsApp actif sur http://localhost:${PORT}`);
});

