import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { authenticateUser } from "../_shared/utils.ts";
// Crear el cliente de Supabase
const { token, supabase } = await authenticateUser(
  Deno.env.get("PG_USER_EMAIL") ?? "",
  Deno.env.get("PG_USER_PWD") ?? "",
);

// Obtener datos de mocks
async function getMockData(token: string, id?: string) {
  const query = supabase
    .from("mocks")
    .select("id, token, method, sufix, status_code, data, updated_at")
    .eq("token", token)
    .order("updated_at", { ascending: false });

  if (id) {
    query.eq("id", parseInt(id));
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching data:", error);
    throw new Error("Error fetching mock data");
  }

  return data;
}

// Eliminar mock por ID
async function deleteMock(token: string, id: string) {
  const { error } = await supabase
    .from("mocks")
    .delete()
    .eq("token", token)
    .eq("id", parseInt(id));
  if (error) {
    console.error("Error deleting data:", error);
    throw new Error("Error deleting mock data");
  }
}

// Manejar solicitudes HTTP
async function handleRequest(req: Request) {
  const { url, method } = req;
  const temporalCors = corsHeaders("admin", req.headers.get("origin") || "");

  if (method === "OPTIONS") {
    return new Response("ok", { headers: temporalCors });
  }

  const taskPattern = new URLPattern({ pathname: "/adminMock/:token/:id?" });
  const matchingPath = taskPattern.exec(url);
  const token = matchingPath?.pathname.groups.token;
  const id = matchingPath?.pathname.groups.id;

  if (!token) {
    return new Response(JSON.stringify([]), { headers: temporalCors });
  }

  try {
    if (method === "DELETE" && id) {
      await deleteMock(token, id);
      return new Response("", { headers: temporalCors });
    }

    const finalData = await getMockData(token, id);
    return new Response(JSON.stringify({ success: true, data: finalData }), {
      headers: { ...temporalCors, "Content-Type": "application/json" },
      status: 200,
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

// Servir la aplicación
Deno.serve(handleRequest);
