/**
 * WebMCP lets visitors' own AI agents use this site's tools. It is a Chrome origin trial: register
 * https://kishore-os.web.app for "WebMCP" at https://developer.chrome.com/origintrials and paste the token
 * here. Without a token nothing happens, except for visitors who turned the feature on themselves.
 */
export const WEBMCP_ORIGIN_TRIAL_TOKEN = '';

/**
 * Approved answers and feedback in Firestore. Leave this off until firestore/firestore.rules has been merged
 * into the rules of the shared kishore-os project and deployed. The guestbook doesn't need it.
 */
export const FIRESTORE_EXTRAS = false;
