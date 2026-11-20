/**
 * Read Vertex AI service account JSON from Voximplant Secrets.
 * Include this scenario BEFORE the main Vertex AI scenario in the routing rule.
 */

// shared with subsequent scenarios in the routing rule
var GEMINI_VERTEX_CREDENTIALS = VoxEngine.getSecretValue("GOOGLE_CREDENTIALS");
if (!GEMINI_VERTEX_CREDENTIALS) throw new Error("Set GOOGLE_CREDENTIALS in Voximplant Secrets");
