import { supabase } from "../../supabase-setup.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// dev hardcoded ID
const TEST_USER_ID = "099cc5d8-2318-40e7-b1f8-334a4146a014";

Deno.serve(async (req) => {
    // Handle CORS: checking to ensure call is doable
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // Gemini says this is an older way of checking for authorization
    // we can pass in the user's ID instead, which would not be held as a key in the code
    // and would be more secure
    // const authHeader = req.headers.get("Authorization");

    // if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_PRIVILEGED")}`) {
    //     return new Response("Unauthorized", {status: 401});
    // }

    try {
        // --- DEV MODE: AUTH BYPASS ---
        // const authHeader = req.headers.get('Authorization');
        // if (!authHeader) {
        //     return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        //         status: 401, 
        //         headers: { ...corsHeaders, "Content-Type": "application/json" } 
        //     });
        // }

        // // check if token matches a real user
        // const token = authHeader.replace("Bearer ", "");
        // const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        // if (authError || !user) {
        //     return new Response(JSON.stringify({ error: "Invalid User Token" }), {
        //         status: 401, 
        //         headers: { ...corsHeaders, "Content-Type": "application/json" } 
        //     });
        // }      
        
        console.log("⚠️ DEV MODE: Using Hardcoded User ID:", TEST_USER_ID);

        /* A coaches model and its personality are required. Description and custom instructions
        are accepted but not required. User_ID to spawn coaches connected to user
        */
       // !! NEED TO INCLUDE NAME
        const {model, personality, description = "", custom = "", coach_name = "DefaultTestCoach"}: {
            model: string;
            personality: string;
            description: string;
            custom: string;
            coach_name: string
        } = await req.json();

        if(!model || !personality) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: model or personality" }), 
                { 
                    status: 400, 
                    headers: { ...corsHeaders, "Content-Type": "application/json" } 
                }            
            );
        }

        // Create the row representing the coach
        const { data, error } = await supabase
            .from('coaches')
            .insert({
                training_model: model,
                personality: personality,
                description: description,
                custom_instructions: custom,
                name: coach_name,
                // created_by: user.id,
                created_by: TEST_USER_ID,
            })
            .select()
            .single();
        
        if (error) {
            console.error("❌ CREATION FAILED:", JSON.stringify(error)); 
            throw new Error("Failed to insert coach into db in coach.ts" + error.message);
        }

        console.log("coach created!");

        // verify that things went correctly
        return new Response(
            JSON.stringify({
                success: true,
                coach: data
            }), {
                status: 201, headers: {...corsHeaders, "Content-Type": "application/json"}
            }
        );
        
    } catch (err) {
        return new Response(
            JSON.stringify({
                error: (err as Error).message
            }), {
                status: 500, headers: {...corsHeaders, "Content-Type": "application/json"}
            }
        );
    }
});