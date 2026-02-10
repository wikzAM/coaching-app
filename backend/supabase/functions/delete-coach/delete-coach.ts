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
        const { coach_id }: { coach_id: string } = await req.json();

        if (!coach_id) {
            return new Response(
                JSON.stringify({ error: "coach_id is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Verify the user is the creator of this coach
        const { data: coach, error: fetchError } = await supabase
            .from('coaches')
            .select('coach_id, created_by')
            .eq('coach_id', coach_id)
            .single();

        if (fetchError || !coach) {
            return new Response(
                JSON.stringify({ error: "Coach not found" }),
                { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (coach.created_by !== user.id) {
            return new Response(
                JSON.stringify({ error: "Only the creator can delete this coach" }),
                { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Delete the user_coaches link first (cascade should handle this, but be explicit)
        await supabase
            .from('user_coaches')
            .delete()
            .eq('coach_id', coach_id);

        // Delete the coach
        const { error: deleteError } = await supabase
            .from('coaches')
            .delete()
            .eq('coach_id', coach_id);

        if (deleteError) {
            throw new Error("Failed to delete coach: " + deleteError.message);
        }

        return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        return new Response(
            JSON.stringify({ error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
