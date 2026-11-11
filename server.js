
const express = require("express");
const OpenAI = require("openai");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body.messages || [];

    const response = await openai.responses.create({
      model: "gpt-5.5",
      input: messages.slice(-20)
    });

    res.json({
      reply: response.output_text
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Não foi possível obter uma resposta."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("GBot está online!");
});
