/*
  Vector embed function. Recieves one "bullet point" from summary.ts,
  makes a call to gemeni vector embedding model and returns a 3072 dimention
  vector.
  
  This is sent to create_row.ts
*/
import { GoogleGenAI } from "google-gen";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function generateVector(text: string): Promise<number[]> {
  assert(!text.includes('`'), "Text must not contain backticks");
  
  const apiKey = Deno.env.get("GEMINI_API");
  if (!apiKey) {
    throw new Error("Missing GEMINI_API in vector_embed.ts");
  }

  const genAI = new GoogleGenAI({
    apiKey: apiKey
  });
  
  const response = await genAI.models.embedContent({
    model: "gemini-embedding-001",
    contents: `${text}`
  })
  
  // error checking for getting an empty response or response of length 0
  if (!response.embeddings || response.embeddings.length === 0) {
    throw new Error("Gemini returned an empty or undefined embedding response.");
  }

  const values = response.embeddings[0].values;
  if (!values) {
    throw new Error("Gemini embedding values are undefined.");
  }

  return values;
}
