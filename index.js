require('dotenv').config();
const OpenAI = require('openai');
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const fs = require('fs');

// 🔒 Lecture des données du salon (services, horaires, etc.)
const salonData = JSON.parse(fs.readFileSync('./salon.json', 'utf8'));

// 🔑 Connexion OpenAI via la clé stockée dans Render (variable d’environnement)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 Prompt système : infos salon + ton pro
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
app.use(bodyParser.urlencoded({ extended: false }));

// 🟢 Route appelée par Twilio quand un message WhatsApp est reçu
app.post('/whatsapp', async (req, res) => {
  const userMsg = req.body.Body;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg }
      ],
    });

    const botReply = response.choices[0].message.content;

    const twiml = new MessagingResponse();
    twiml.message(botReply);

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  } catch (error) {
    console.error("❌ Erreur OpenAI :", error);
    const twiml = new MessagingResponse();
    twiml.message("Désolé, une erreur est survenue. Veuillez réessayer plus tard.");
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  }
});

// 🟣 Lance le serveur (Render écoutera sur ce port)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📲 Memphis Cut bot en ligne sur http://localhost:${PORT}`);
});


