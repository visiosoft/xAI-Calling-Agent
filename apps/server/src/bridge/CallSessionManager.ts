import { CallSession } from './CallSession.js';
import type { CallSessionParams } from './CallSession.js';

class CallSessionManager {
  private sessions: Map<string, CallSession> = new Map();

  public async createSession(params: CallSessionParams): Promise<CallSession> {
    if (this.sessions.has(params.callId)) {
      throw new Error(`Session already exists for callId: ${params.callId}`);
    }

    const session = new CallSession(params);
    this.sessions.set(params.callId, session);

    await session.initialize();

    return session;
  }

  public getSession(callId: string): CallSession | undefined {
    return this.sessions.get(callId);
  }

  public removeSession(callId: string): void {
    this.sessions.delete(callId);
  }

  public getActiveCountForOrg(orgId: string): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.organizationId === orgId && session.getState() === 'active') {
        count++;
      }
    }
    return count;
  }

  public getActiveCountForCampaign(campaignId: string): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.campaignId === campaignId && session.getState() === 'active') {
        count++;
      }
    }
    return count;
  }

  public getActiveSessions(): CallSession[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.getState() === 'active'
    );
  }

  public getTotalActiveCount(): number {
    return this.getActiveSessions().length;
  }
}

export const callSessionManager = new CallSessionManager();
