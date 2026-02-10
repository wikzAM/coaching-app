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
    }

    try {
        /* A coaches model and its personality are required. Description and custom instructions
        are accepted but not required. Name is optional. user_id comes from the verified JWT.
        */
        const {model, personality, description = "", custom = "", name = ""}: {
            model: string;
            personality: string;
            description: string;
            custom: string;
            name: string;
        } = await req.json();

        if(!model || !personality) {
            return new Response(
                JSON.stringify({ error: "model and personality are required"}), 
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Create the row representing the coach.
        const { data, error } = await supabase
            .from('coaches')
            .insert({
                training_model: model,
                personality: personality,
                description: description,
                custom_instructions: custom,
                name: name || `${model} Coach`,
                created_by: user.id,
                published: false
            })
            .select()
            .single();
        
        if (error) {
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

        // verify that things went correctly
        return new Response(
            JSON.stringify({
                success: true,
                coach: data
            }), {
                status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
        
    } catch (err) {
        return new Response(
            JSON.stringify({
                error: (err as Error).message
            }), {
                status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    }
});