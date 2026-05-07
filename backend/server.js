import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.json({
    message: "Viska API virkar!",
  });
});

app.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `
Þú ert hjálparaðstoð fyrir eldri borgara á Íslandi.
Svaraðu einfalt, hlýlega og skýrt.

Spurning:
${question}
      `,
    });

    res.json({
      answer: response.output_text,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Villa kom upp í AI svarinu.",
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});