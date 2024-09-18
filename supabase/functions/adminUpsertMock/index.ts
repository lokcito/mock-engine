import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateUser } from "../_shared/utils.ts";

const {token, supabase} = await authenticateUser(
  Deno.env.get("PG_USER_EMAIL") ?? "",
  Deno.env.get("PG_USER_PWD") ?? "",
);

const MockSchema = z.object({
  sufix: z.string().min(1).max(250),
  method: z.string().min(2).max(8),
  status_code: z.number(),
  token: z.string().min(8).max(16),
});

async function singleton(
  token: string,
  sufix: string,
  method: string,
  status_code: string,
): Promise<any> {
  const { data, error } = await supabase
    .from("mocks")
    .select("*")
    .eq("token", token)
    .eq("sufix", sufix)
    .eq("method", method)
    .eq("status_code", status_code)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching singleton:", error);
    throw new Error("Error fetching singleton data");
  }

  return data?.[0] || null;
}

async function upsertMock(_data: any) {
  const existingMock = await singleton(
    _data.token,
    _data.sufix,
    _data.method,
    _data.status_code,
  );

  let result;
  if (existingMock) {
    const { data, error } = await supabase
      .from("mocks")
      .update({ data: _data.data, updated_at: new Date() })
      .eq("id", existingMock.id)
      .select();

    if (error) {
      console.error("Error updating mock:", error);
      throw new Error("Error updating mock");
    }
    result = data;
  } else {
    const { data, error } = await supabase
      .from("mocks")
      .insert([_data])
      .select();

    if (error) {
      console.error("Error inserting mock:", error);
      throw new Error("Error inserting mock");
    }
    result = data;
  }
  return result;
}

async function handleRequest(req: Request) {
  const temporalCors = corsHeaders("admin", req.headers.get("origin") || "");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: temporalCors });
  }

  const data = await req.json();

  try {
    MockSchema.parse(data);
  } catch (error) {
    console.error("Validation error:", error.errors);
    return new Response(
      JSON.stringify({ success: false, error: "Validation error" }),
      {
        status: 400,
        headers: { ...temporalCors, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const result = await upsertMock(data);
    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...temporalCors, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error handling request:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...temporalCors, "Content-Type": "application/json" },
      },
    );
  }
}

Deno.serve(handleRequest);
