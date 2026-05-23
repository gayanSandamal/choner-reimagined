Deno.serve(async (req) => {
  try {
    const body = await req.json();

    // Replace this with your real LLM call.
    const recommendation = {
      title: "AI recovery suggestion",
      body: `You are currently focused on ${body.goal ?? "consistency"}. Reduce today's load and preserve your streak with one essential task.`,
      metadata: {
        suggestedMode: "lighter",
        nextAction: "Complete your easiest task first"
      }
    };

    return Response.json(recommendation);
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
});
