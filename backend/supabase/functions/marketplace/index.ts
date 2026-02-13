import { supabase } from "../../supabase-setup.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // Verify the user's JWT
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
        const url = new URL(req.url);
        const action = url.searchParams.get('action') || 'browse';

        if (action === 'browse') {
            // Fetch all published coaches for the marketplace
            const { data, error } = await supabase
                .from('coaches')
                .select('coach_id, name, training_model, personality, description, created_by')
                .eq('published', true);

            if (error) throw new Error("Failed to fetch marketplace: " + error.message);

            return new Response(
                JSON.stringify({ coaches: data }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (action === 'hire') {
            // User wants to "download" / hire a coach from the marketplace
            const { coach_id }: { coach_id: string } = await req.json();

            if (!coach_id) {
                return new Response(
                    JSON.stringify({ error: "coach_id is required" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Check if the coach exists and is published
            const { data: coach, error: fetchError } = await supabase
                .from('coaches')
                .select('coach_id, published')
                .eq('coach_id', coach_id)
                .single();

            if (fetchError || !coach) {
                return new Response(
                    JSON.stringify({ error: "Coach not found" }),
                    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            if (!coach.published) {
                return new Response(
                    JSON.stringify({ error: "This coach is not available on the marketplace" }),
                    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Check if already hired
            const { data: existing } = await supabase
                .from('user_coaches')
                .select('id')
                .eq('user_id', user.id)
                .eq('coach_id', coach_id)
                .single();

            if (existing) {
                return new Response(
                    JSON.stringify({ message: "Coach already hired", already_hired: true }),
                    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Create the link
            const { error: linkError } = await supabase
                .from('user_coaches')
                .insert({ user_id: user.id, coach_id: coach_id });

            if (linkError) throw new Error("Failed to hire coach: " + linkError.message);

            return new Response(
                JSON.stringify({ success: true, message: "Coach hired successfully" }),
                { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ error: "Invalid action. Use ?action=browse or ?action=hire" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
