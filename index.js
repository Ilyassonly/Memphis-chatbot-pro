require('dotenv').config();
const OpenAI = require('openai');
const readline = require('readline-sync');
const fs = require('fs');

const salonData = JSON.parse(fs.readFileSync('./salon.json', 'utf8'));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Ajout des tendances dans le prompt
const SYSTEM_PROMPT = `
Tu es un assistant professionnel et expert coiffure pour le salon MEMPHIS CUT.
Nous sommes en 2025. Tu es à jour sur les dernières tendances capillaires de cette année.

Tu aides les clients de façon chaleureuse, précise et professionnelle :
- Tu réponds aux questions sur les services, tarifs, horaires
- Tu proposes des conseils personnalisés selon leur style ou morphologie
- Tu expliques les tendances actuelles de 2025 si on te les demande
- Tu peux proposer un rendez-vous et t'assurer que le service demandé est possible

Voici les informations du salon :
Services : ${salonData.services.map(s => `\n- ${s.nom} : ${s.prix}€ (${s.duree})`).join('')}
Horaires : ${salonData.horaires}
Règlement : ${salonData.reglement}
Tendances 2025 : ${salonData.tendances.map(t => `\n- ${t}`).join('')}

Tu réponds de façon fluide et naturelle comme un vrai assistant client très pro.
`;

const messages = [
  { role: 'system', content: SYSTEM_PROMPT }
];

async function chat() {
  console.log("💈 Chatbot MEMPHIS CUT est en ligne. Tapez 'exit' pour quitter.\n");

  while (true) {
    const userInput = readline.question('👤 Vous: ');
    if (userInput.toLowerCase() === 'exit') break;

    messages.push({ role: 'user', content: userInput });

    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
    });

    const reply = chatCompletion.choices[0].message.content;
    console.log(`💬 Memphis Cut: ${reply}\n`);

    messages.push({ role: 'assistant', content: reply });
  }
}

chat();

