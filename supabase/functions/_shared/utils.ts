import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Autenticar usuario
export const authenticateUser = async (email: string, password: string) => {
    // Crear el cliente de Supabase
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) {
        console.error("Error signing in:", error);
        throw new Error("Authentication failed");
    }
    return {
        token: data?.session?.access_token,
        supabase: supabase
    };
}