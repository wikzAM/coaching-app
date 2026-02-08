import { GoogleGenAI } from "google-gen";

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
    const { initialGoal } = await req.json();

    if (!initialGoal) {
      throw new Error("No initial goal provided");
    }

    // Call generateContent with the prompt for the MCQs
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
                The user has shared this goal: "${initialGoal}"
                
                As a master diagnostic coach, generate exactly 3 Multiple Choice Questions (MCQs) 
                to uncover the deeper context and preferred coaching style.
                
                RULES:
                1. Each question must have 3 specific options and 1 "Other / Let's just talk" option.
                2. Return ONLY a valid JSON object with this structure:
                {
                  "questions": [
                    {
                      "id": 1,
                      "text": "Question text?",
                      "options": ["Opt 1", "Opt 2", "Opt 3", "Other / Let's just talk"]
                    }
                  ]
                }
              `
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    // Access text directly from the result
    const responseText = result.text;

    if (!responseText) {
      throw new Error("AI failed to generate diagnostic questions");
    }

    // clean up potential markdown blocks if present
    const cleanJson = responseText.replace(/```json|```/g, "").trim();

    return new Response(cleanJson, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("DIAGNOSTIC SERVER ERROR:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});