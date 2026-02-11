/**
 * phone-auth Edge Function
 *
 * Verifies a Firebase ID token (from Firebase Phone Auth),
 * then creates or signs in a Supabase user and returns a
 * Supabase session (access_token + refresh_token).
 *
 * Environment variables required:
 *   SUPABASE_URL            – auto-provided by Supabase
 *   SUPABASE_SERVICE_ROLE_KEY – auto-provided by Supabase
 *   FIREBASE_PROJECT_ID     – your Firebase project ID
 *   PHONE_AUTH_SECRET        – random secret for password derivation
 *
 * Deploy with:
 *   supabase functions deploy phone-auth --no-verify-jwt
 */

/// <reference lib="deno.window" />

import { supabase } from "../../supabase-setup.ts";
import { createRemoteJWKSet, jwtVerify } from "jose";

// ── Config ──────────────────────────────────────────────────────────────────
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID")!;
const PHONE_AUTH_SECRET = Deno.env.get("PHONE_AUTH_SECRET")!;

// Google's public JWKS endpoint for verifying Firebase ID tokens
const GOOGLE_JWKS = createRemoteJWKSet(
    new URL(
        "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
    )
);

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Derive a deterministic password from a phone number + server secret (HMAC-SHA256). */
async function derivePassword(phone: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        enc.encode(PHONE_AUTH_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(phone));
    return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

const CORS_HEADERS: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
        "Content-Type, Authorization, apikey, x-client-info",
};

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
}

function errorResponse(message: string, status: number) {
    return jsonResponse({ error: message }, status);
}

// ── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
        const { idToken } = await req.json();
        if (!idToken) {
            return errorResponse("Missing idToken in request body", 400);
        }

        // ── 1. Verify the Firebase ID token ─────────────────────────────
        const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
            issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
            audience: FIREBASE_PROJECT_ID,
        });

        const phone = payload.phone_number as string | undefined;
        if (!phone) {
            return errorResponse(
                "Firebase token does not contain a phone number",
                400
            );
        }

        // ── 2. Derive a deterministic password for this phone ───────────
        const password = await derivePassword(phone);

        // ── 3. Try signing in (returning user) ──────────────────────────
        const signIn = await supabase.auth.signInWithPassword({
            phone,
            password,
        });

        if (signIn.data?.session) {
            return jsonResponse({
                access_token: signIn.data.session.access_token,
                refresh_token: signIn.data.session.refresh_token,
                expires_in: signIn.data.session.expires_in,
                user: signIn.data.session.user,
            });
        }

        // ── 4. Try creating a new user ──────────────────────────────────
        const create = await supabase.auth.admin.createUser({
            phone,
            phone_confirm: true,
            password,
        });

        if (create.data?.user) {
            // User created — now sign in to get a full session
            const signIn2 = await supabase.auth.signInWithPassword({
                phone,
                password,
            });
            if (signIn2.data?.session) {
                return jsonResponse({
                    access_token: signIn2.data.session.access_token,
                    refresh_token: signIn2.data.session.refresh_token,
                    expires_in: signIn2.data.session.expires_in,
                    user: signIn2.data.session.user,
                });
            }
            return errorResponse(
                "Failed to create session after user creation",
                500
            );
        }

        // ── 5. User already exists (migration from Twilio) ──────────────
        //    The phone was previously registered via Supabase OTP/Twilio,
        //    so the user exists but without our derived password. We find
        //    them, set the password, and sign in.
        if (
            create.error?.message
                ?.toLowerCase()
                .includes("already")
        ) {
            // Look up user ID via the SQL helper function
            const { data: userId, error: rpcErr } = await supabase.rpc(
                "get_user_id_by_phone",
                { p_phone: phone }
            );

            if (rpcErr || !userId) {
                return errorResponse(
                    "User exists but could not be found: " +
                    (rpcErr?.message ?? "not found"),
                    500
                );
            }

            // Update the user's password to our derived one
            const { error: updateErr } =
                await supabase.auth.admin.updateUserById(userId, { password });

            if (updateErr) {
                return errorResponse(
                    "Failed to update user password: " + updateErr.message,
                    500
                );
            }

            // Sign in with the newly set password
            const signIn3 = await supabase.auth.signInWithPassword({
                phone,
                password,
            });

            if (signIn3.data?.session) {
                return jsonResponse({
                    access_token: signIn3.data.session.access_token,
                    refresh_token: signIn3.data.session.refresh_token,
                    expires_in: signIn3.data.session.expires_in,
                    user: signIn3.data.session.user,
                });
            }

            return errorResponse(
                "Failed to sign in after password update: " +
                (signIn3.error?.message ?? "unknown"),
                500
            );
        }

        // ── Fallback ────────────────────────────────────────────────────
        return errorResponse(
            "Authentication failed: " +
            (create.error?.message ?? "unknown error"),
            500
        );
    } catch (err) {
        console.error("phone-auth error:", err);
        return errorResponse((err as Error).message, 500);
    }
});
