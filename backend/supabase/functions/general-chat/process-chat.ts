import { supabase } from "../../supabase-setup.ts";
import { generateVector } from "./vector-embed-two.ts";
import { GoogleGenAI } from "google-gen"; 
import { CORE_SYSTEM_PROMPT } from "../../supabase-setup.ts";
import { getBuffer, updateBuffer } from "./chat-history.ts";
import { formatRecentHistory, createMsg } from "./format-recent-history.ts";

// 1. Strict Type Definitions
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
    // Handle CORS: checking to ensure Gemini call is doable
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

    // 4. Parse Input
    const { chat: userChatMsg, coachID } = await req.json();

    // 5. Vector Search
    const recentHistory = getBuffer(userUUID, coachID);
    
    // Add await here
    const vector = await generateVector(userChatMsg);

    const { data: longTermSearchResults, error: memSearchError } = await supabase
      .rpc('vector_search', {
        query_embedding: vector,
        match_user_uuid: userUUID,
        match_coach_uuid: coachID
      });

    if (memSearchError) {
      console.error("Memory Search Error:", memSearchError);
    }

    // Secure Cast
    const memories = longTermSearchResults as unknown as MemoryRow[] | null;
    
    const longTermMems = memories 
      ? memories.map((r) => r.memory).join("\n") 
      : "";

    // 6. Coach Search
    const { data: coachData, error: coachError } = await supabase
      .rpc('coach_search', { match_coach_uuid: coachID });

    // Secure Cast
    const coaches = coachData as unknown as CoachRow[] | null;

    if (coachError || !coaches || coaches.length === 0) {
      return new Response(JSON.stringify({ error: 'Coach not found' }), { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const coach = coaches[0];
    const coachContext = `
      Name: ${coach.name || "Coach"}
      Style: ${coach.training_model || "Helpful"}
      Personality: ${coach.personality || "Neutral"}
      Instructions: ${coach.custom_instructions || "None"}
    `;

    // 7. Gemini Generation
    const chat = genAI.chats.create({
      model: "gemini-2.5-flash",
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
    
    // FIX: Access .text directly
    const agentChatMsg = result.text;

    if (!agentChatMsg) {
      throw new Error('Empty response from AI');
    }

    updateBuffer(userUUID, coachID, userChatMsg, agentChatMsg);

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