export const corsHeaders = (role: string, origin: string) => {
    const allowedOrigins = ["http://127.0.0.1", "https://nicocha.equisd.com"];

    let originValue = "*";
    if (role === "admin") {
        if (allowedOrigins.includes(origin)) {
            originValue = origin;
        }
    }
    originValue = "*";

    return {
        "Access-Control-Allow-Origin": originValue,
        "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
    };
};
