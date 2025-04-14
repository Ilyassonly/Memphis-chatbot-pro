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

app.use(bodyParser.urlencoded({ extended: false }));

// ✅ Message d’accueil pour vérifier que le bot tourne
app.get('/', (req, res) => {
  res.send('Bot Memphis Cut est en ligne 🧠✂️');
});

app.post('/whatsapp', async (req, res) => {
  const numMedia = parseInt(req.body.NumMedia || '0');
  const userMsg = req.body.Body;
  const twiml = new MessagingResponse();

  try {
    let userInput;

    if (numMedia > 0) {
      const imageUrl = req.body.MediaUrl0;
      console.log('📷 Image reçue :', imageUrl);

      userInput = [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Voici une image, peux-tu l’analyser ?' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ];
    } else {
      userInput = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg }
      ];
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: userInput,
    });

    const botReply = response.choices[0].message.content;
    twiml.message(botReply);
  } catch (err) {
    console.error('❌ Erreur OpenAI :', err.message);
    twiml.message("Erreur : je n’ai pas pu traiter votre demande. Veuillez réessayer.");
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(PORT, () => {
  console.log(`📲 Serveur Memphis Cut en ligne sur http://localhost:${PORT}`);
});

