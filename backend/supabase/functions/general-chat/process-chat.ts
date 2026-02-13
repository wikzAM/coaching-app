import { supabase } from "../../supabase-setup.ts";
import { generateVector } from "./vector-embed-two.ts";
import { GoogleGenAI } from "google-gen"; 
import { CORE_SYSTEM_PROMPT } from "../../supabase-setup.ts";
import { getBuffer, updateBuffer } from "./chat-history.ts";
import { formatRecentHistory, createMsg } from "./helper-funcs/format-recent-history.ts";
import { isRateLimitError } from "./helper-funcs/rate-limit-err.ts";
import { models } from "../models-to-quiery.ts";

// We create types corresponding to how data is organized on supabase
interface MemoryRow {
  memory_id: string;
  memory: string;
  similarity: number;
}

interface CoachRow {
  name: string | null;
  training_model: string | null;
  personality: string | null;
  custom_instructions: string | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const apiKey = Deno.env.get("GEMINI_API");
if (!apiKey) throw new Error("GEMINI_API is not set");

const genAI = new GoogleGenAI({ apiKey });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- BYPASS AUTH FOR TESTING ---
    // We are temporarily skipping the user check so you can test the chat immediately.
    
    // const authHeader = req.headers.get('Authorization');
    // if (!authHeader) throw new Error('Missing Authorization header');
    // const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    // Hardcoded "Test User" ID (Must be a valid UUID format for Postgres)
    const userUUID = "099cc5d8-2318-40e7-b1f8-334a4146a014"; 
    console.log("⚠️ DEV MODE: Using Test User ID:", userUUID);
    // -------------------------------

    const { chat: userChatMsg, coachID } = await req.json();

    const recentHistory = await getBuffer(userUUID, coachID);
    
    // creating the vector
    const vector = await generateVector(userChatMsg);

    // using the vector to search long term memory
    const { data: longTermSearchResults, error: memSearchError } = await supabase
      .rpc('vector_search', {
        query_embedding: vector,
        match_user_uuid: userUUID,
        match_coach_uuid: coachID
      });

    if (memSearchError) {
      console.error("Memory Search Error:", memSearchError);
    }

    const memories = longTermSearchResults as unknown as MemoryRow[] | null;
    // Collect all the memories into a big string
    const longTermMems = memories 
      ? memories.map((r) => r.memory).join("\n") 
      : "";

    // get the coaches
    const { data: coachData, error: coachError } = await supabase
      .rpc('coach_search', { match_coach_uuid: coachID });

    const coaches = coachData as unknown as CoachRow[] | null;

    if (coachError || !coaches || coaches.length === 0) {
      return new Response(JSON.stringify({ error: 'Coach not found' }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    // here we hardcode a coach
    const coach = coaches[0];
    const coachContext = `
      Name: ${coach.name || "Coach"}
      Style: ${coach.training_model || "Helpful"}
      Personality: ${coach.personality || "Neutral"}
      Instructions: ${coach.custom_instructions || "None"}
    `;

    let agentChatMsg: string | null = null;

    // Call to gemini with fallback models
    for (let i = 0; i < models.length; i++) {
      try {
        const chat = genAI.chats.create({
          model: models[i],
          config: {
            systemInstruction: `${CORE_SYSTEM_PROMPT}\n\nCOACH PROFILE:\n${coachContext}`,
          },
          history: [
            createMsg("user", `Long-term memory context:\n${longTermMems}`),
            createMsg("model", "Acknowledged."),
            ...formatRecentHistory(recentHistory),
          ],
        });

        const result = await chat.sendMessage({ message: userChatMsg });
        agentChatMsg = result.text ?? null;
        
        console.log(`Successfully used model: ${models[i]}`);
        break; // Success, exit loop
        
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

    if (!agentChatMsg) {
      throw new Error('Empty response from AI');
    }

    // update the local buffer
    await updateBuffer(userUUID, coachID, userChatMsg, agentChatMsg);

    return new Response(
      JSON.stringify({ reply: agentChatMsg }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("SERVER ERROR:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});