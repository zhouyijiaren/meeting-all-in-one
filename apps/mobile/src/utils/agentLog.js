export function writeAgentClientLog(hypothesisId, location, message, data = {}) {
  try {
    console.info(
      '[AGENT_DEBUG]',
      JSON.stringify({
        hypothesisId,
        location,
        message,
        data,
        timestamp: Date.now(),
      })
    );
  } catch {}
}
