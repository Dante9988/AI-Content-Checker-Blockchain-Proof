import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: "messages must be an array" });
  }

  try {
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
    });

    console.log("requestId:", stream.requestId);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    for await (const part of stream) {
      const token = part.choices[0]?.delta?.content || "";
      res.write(token);
    }
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
