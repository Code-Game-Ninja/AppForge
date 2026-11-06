import { AIError } from './contracts';

// Classify provider diagnostics without forwarding their contents to a browser.
export function connectionError(diagnostic: string): AIError {
  if (/unauthorized_client_error|unauthorized client detected/i.test(diagnostic)) {
    return new AIError('ai_client_rejected', 'The AI provider does not accept AppForge\'s current connection method. The site owner needs to enable a supported client connection.', 503);
  }
  return new AIError('ai_authentication_failed', 'The AI provider could not authorize this connection. The site owner needs to check its credentials and access permissions.', 503);
}
