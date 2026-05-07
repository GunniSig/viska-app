import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const prisma = new PrismaClient();

app.get("/", (req, res) => {
  res.json({
    message: "Viska API virkar!",
  });
});

app.get("/messages", async (req, res) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });

    res.json(messages);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Tókst ekki að sækja skilaboð.",
    });
  }
});

app.delete("/messages", async (req, res) => {
  try {
    await prisma.chatMessage.deleteMany();

    res.json({
      message: "Samtal hreinsað.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Tókst ekki að hreinsa samtal.",
    });
  }
});

app.post("/ask", async (req, res) => {
  try {
    const { question } = req.body;

    await prisma.chatMessage.create({
      data: {
        role: "user",
        content: question,
      },
    });

const response = await client.responses.create({
  model: "gpt-4.1-mini",
  input: `
Þú ert hjálparaðstoð fyrir eldri borgara á Íslandi.
Svaraðu einfalt, hlýlega og skýrt.

Spurning:
${question}
  `,
});

await prisma.chatMessage.create({
  data: {
    role: "assistant",
    content: response.output_text,
  },
});

res.json({
  answer: response.output_text,
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