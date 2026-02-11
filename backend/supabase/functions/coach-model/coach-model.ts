import { supabase } from "../../supabase-setup.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve( async(req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // Verify the user's JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        return new Response(JSON.stringify({ error: "Missing authorization header" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
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
        are accepted but not required. Name is optional. user_id comes from the verified JWT.
        */
<<<<<<< HEAD:backend/supabase/functions/coach-model/coach-model.ts
        const {model, personality, description = "", custom = "", name = ""}: {
=======
       // !! NEED TO INCLUDE NAME
        const {model, personality, description = "", custom = "", coach_name = "DefaultTestCoach"}: {
>>>>>>> 4e9d949ab4c5c8a656b590fcc1f2a60e375d9538:backend/supabase/functions/coach-model/coach.ts
            model: string;
            personality: string;
            description: string;
            custom: string;
<<<<<<< HEAD:backend/supabase/functions/coach-model/coach-model.ts
            name: string;
=======
            coach_name: string
>>>>>>> 4e9d949ab4c5c8a656b590fcc1f2a60e375d9538:backend/supabase/functions/coach-model/coach.ts
        } = await req.json();

        if(!model || !personality) {
            return new Response(
<<<<<<< HEAD:backend/supabase/functions/coach-model/coach-model.ts
                JSON.stringify({ error: "model and personality are required"}), 
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
=======
                JSON.stringify({ error: "Missing required fields: model or personality" }), 
                { 
                    status: 400, 
                    headers: { ...corsHeaders, "Content-Type": "application/json" } 
                }            
>>>>>>> 4e9d949ab4c5c8a656b590fcc1f2a60e375d9538:backend/supabase/functions/coach-model/coach.ts
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
<<<<<<< HEAD:backend/supabase/functions/coach-model/coach-model.ts
                name: name || `${model} Coach`,
                created_by: user.id,
                published: false
=======
                name: coach_name,
                // created_by: user.id,
                created_by: TEST_USER_ID,
>>>>>>> 4e9d949ab4c5c8a656b590fcc1f2a60e375d9538:backend/supabase/functions/coach-model/coach.ts
            })
            .select()
            .single();
        
        if (error) {
<<<<<<< HEAD:backend/supabase/functions/coach-model/coach-model.ts
            throw new Error("Failed to insert coach into db in coach.ts: " + error.message);
        }

        // create the link in user_coaches
        const { error: linkError } = await supabase
            .from('user_coaches')
            .insert({
                user_id: user.id,
                coach_id: data.coach_id
            });

        if (linkError) throw new Error("Failed to link coach to user: " + linkError.message);
=======
            console.error("❌ CREATION FAILED:", JSON.stringify(error)); 
            throw new Error("Failed to insert coach into db in coach.ts" + error.message);
        }

        console.log("coach created!");
>>>>>>> 4e9d949ab4c5c8a656b590fcc1f2a60e375d9538:backend/supabase/functions/coach-model/coach.ts

        // verify that things went correctly
        return new Response(
            JSON.stringify({
                success: true,
                coach: data
            }), {
<<<<<<< HEAD:backend/supabase/functions/coach-model/coach-model.ts
                status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" }
=======
                status: 201, headers: {...corsHeaders, "Content-Type": "application/json"}
>>>>>>> 4e9d949ab4c5c8a656b590fcc1f2a60e375d9538:backend/supabase/functions/coach-model/coach.ts
            }
        );
        
    } catch (err) {
        return new Response(
            JSON.stringify({
                error: (err as Error).message
            }), {
<<<<<<< HEAD:backend/supabase/functions/coach-model/coach-model.ts
                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
=======
                status: 500, headers: {...corsHeaders, "Content-Type": "application/json"}
>>>>>>> 4e9d949ab4c5c8a656b590fcc1f2a60e375d9538:backend/supabase/functions/coach-model/coach.ts
            }
        );
    }
});