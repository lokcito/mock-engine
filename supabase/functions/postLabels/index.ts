// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Fix Error: https://www.reddit.com/r/Supabase/comments/1fzelbp/latest_update_killed_supabase/?rdt=46721

// Setup type definitions for built-in Supabase Runtime APIs

/*import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  const { name } = await req.json()
  const data = {
    message: `Hello ${name}!`,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})*/

import { Hono } from "jsr:@hono/hono";
import * as HonoValidator from "jsr:@hono/hono/validator";
import dayjs from "https://deno.land/x/deno_dayjs@v0.5.0/mod.ts";
import { authenticateUser } from "../_shared/utils.ts";
import { corsHeaders } from "../_shared/cors.ts";

const app = new Hono();

const { token, supabase } = await authenticateUser(
  Deno.env.get("PG_USER_EMAIL") ?? "",
  Deno.env.get("PG_USER_PWD") ?? "",
);

app.post("/postLabels", async (c) => {
  const { name } = await c.req.json();
  return new Response(`Hello ${name}!`);
});

app.get(
  "/postLabels",
  HonoValidator.validator("query", (value, c) => {
    const fromDate = dayjs(value["fromDate"] + "");
    const toDate = dayjs(value["toDate"] + "");
    if (fromDate.isValid() && toDate.isValid() && fromDate.isBefore(toDate)) {
      return {
        fromDate: fromDate.format("YYYY-MM-DD"),
        toDate: toDate.format("YYYY-MM-DD"),
      };
    }
    return c.text("Invalid params.", 400);
  }),
  async (c) => {
    const temporalCors = corsHeaders("any", c.req.header("origin") || "");
    const valid = c.req.valid("query");
    const fromDate = c.req.query("fromDate");
    const toDate = c.req.query("toDate");
    if (!fromDate || !toDate) {
      throw new Error("Invalid params querying.");
    }

    const { data, error } = await supabase
      .from("posits")
      .select("*")
      .gte("updated_at", fromDate) // Filtra desde la fecha de inicio
      .lte("updated_at", toDate)
      .order("updated_at", { ascending: false });
    return new Response(JSON.stringify(data), {
      headers: { ...temporalCors, "Content-Type": "application/json" },
      status: 200,
    });
  },
);

Deno.serve(app.fetch);

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/postlabels' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
