import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";

// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateUser } from "../_shared/utils.ts";

Deno.serve(async (req) => {
  const { url, method } = req;
  const temporalCors = corsHeaders("any", req.headers.get("origin") || "");

  if (method === "OPTIONS") {
    return new Response("ok", { headers: temporalCors });
  }

  try {
    const {token, supabase} = await authenticateUser(
      Deno.env.get("PG_USER_EMAIL") ?? "",
      Deno.env.get("PG_USER_PWD") ?? "",
    );

    // For more details on URLPattern, check https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API
    const taskPattern = new URLPattern({ pathname: "/fake/:token/:sufix(.*)" });
    const matchingPath: URLPatternResult | null = taskPattern.exec(url);
    if (!matchingPath) {
      return new Response(JSON.stringify({ error: "Wrong url." }), {
        headers: { ...temporalCors, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data, error } = await supabase
      .from("mocks")
      .select("*")
      .eq("token", matchingPath.pathname.groups.token)
      .eq("sufix", matchingPath.pathname.groups.sufix)
      .eq("method", method).order("updated_at", { ascending: false })
      .limit(1);

    if (!data) {
      throw new Error(error.message);
    }

    return new Response(JSON.stringify(data[0]["data"]), {
      headers: { ...temporalCors, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error(error);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...temporalCors, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
