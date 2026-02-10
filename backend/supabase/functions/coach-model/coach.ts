import { supabase } from "../../supabase-setup.ts";

Deno.serve( async(req) => {
    const authHeader = req.headers.get("Authorization");

    if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_PRIVILEGED")}`) {
        return new Response("Unauthorized", {status: 401});
    }

    try {
        /* A coaches model and its personality are required. Description and custom instructions
        are accepted but not required. User_ID to spawn coaches connected to user
        */
        const {model, personality, description = "", custom = "", user_id}: {
            model: string;
            personality: string;
            description: string;
            custom: string;
            user_id: string;
        } = await req.json();

        if(!model || !personality || !user_id) {
            return new Response(
                JSON.stringify({ error: "model, personality, user_id, and or description were not recieved"}), {status: 400, headers: {"Content-Type": "application/json"} }
            );
        }

        // Create the row representing the coach.
        const { data, error } = await supabase
            .from('coaches')
            .insert({
                training_model: model,
                personality: personality,
                description: description,
                custom_instructions: custom
            })
            .select()
            .single();
        
        if (error) {
            throw new Error("Failed to insert coach into db in coach.ts" + error.message);
        }

        // create the link in user_coaches
        const { error: linkError } = await supabase
            .from('user_coaches')
            .insert({
                user_id: user_id,
                coach_id: data.coach_id
            });

        if (linkError) throw new Error("Failed to link coach to user: " + linkError.message);

        // verify that things went correctly
        return new Response(
            JSON.stringify({
                success: true,
                coach: data
            }), {
                status: 201, headers: { "Content-Type": "application/json"}
            }
        );
        
    } catch (err) {
        return new Response(
            JSON.stringify({
                error: (err as Error).message
            }), {
                status: 500, headers: {"Content-Type": "application/json"}
            }
        );
    }
});