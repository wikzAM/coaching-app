/* This is the main summary function.
Recieves a string or a json file of 30 messages. Asks gemeni to summarize these into
bullet points and stores each bullet point in an array.
*/

import { GoogleGenAI } from "google-gen";
import { isRateLimitError } from "../general-chat/helper-funcs/rate-limit-err.ts";
import { models
  
 } from "../models-to-quiery.ts";
const apiKey = Deno.env.get("GEMINI_API");
if (!apiKey) {
  throw new Error("GEMINI_API is not set");
}

const genAI = new GoogleGenAI({
  apiKey: apiKey
});

export async function summarizeMessages(messages: string) {
    
    // summarizing prompt
    const prompt = `Analyze the following 10-message exchange between an AI coach and a user. 
    Provide a concise summary using a maximum of 4 bullet points (fewer is preferred if the context allows). 
    Group each user query with its corresponding agent resolution to preserve the 'challenge-and-solution' logic. 
    Focus exclusively on information critical for future sessions: specific goals mentioned, progress made, 
    obstacles identified, and any agreed-upon next steps. Avoid fluff; prioritize actionable data that informs 
    how the coach should interact with the user moving forward. 
    
    Output Format Requirement: Your output must contain only the text of the points themselves. Do not use 
    symbols (like -, *, or •), numbers, or introductory text. Separate each point using only a newline (\n) 
    character.
    
    Here is the conversation:\n${messages}`;

    for (let i = 0; i < models.length; i++) {
        try {
            const response = await genAI.models.generateContent({
                model: models[i],
                contents: prompt
            });
            
            const toVectorize = response.text!
              .split("\n")
              .map(line => line.trim())
              .filter(line => line.length > 0);
            return toVectorize;
            //Returns an array of bullet points to be vectorized in vector_embed.ts
            
        } catch (error: unknown) {
            // Check if it's a rate limit error
            const isRateLimit = isRateLimitError(error);
            
            if (isRateLimit && i < models.length - 1) {
                console.warn(`Rate limit reached for ${models[i]}, trying ${models[i + 1]}...`);
                continue; // Try next model
            }
            
            // If it's the last model or not a rate limit error, throw
            throw error;
        }
    }
    
    throw new Error('All models exhausted');
}