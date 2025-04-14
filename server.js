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

app.get('/', (req, res) => {
  res.send('Bot Memphis Cut est en ligne 🧠✂️');
});

app.post('/whatsapp', async (req, res) => {
  const userMsg = req.body.Body;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg },
      ],
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
