import type { RealtimeEvent, Role } from '../../shared/domain';
import type { DB } from './db';
import type { Mailer } from './mailer';

export interface Hub {
  /** Tell every connected member of a shop that something changed. */
  publish(shopId: string, event: RealtimeEvent): void;
  /** Tell one user their shop list changed (joined, removed, shop deleted). */
  notifyUser(userId: string, event: RealtimeEvent): void;
  /** Stop delivering a shop's events to a user who is no longer a member. */
  unsubscribe(userId: string, shopId: string): void;
}

export const nullHub: Hub = { publish() {}, notifyUser() {}, unsubscribe() {} };

export type Deps = {
  db: DB;
  mailer: Mailer;
  hub: Hub;
  /** Return the OTP in the response body. Never enable in production. */
  devEchoOtp?: boolean;
  now?: () => number;
};

export type UserRow = { id: string; email: string; name: string | null };
export type MemberCtx = { shopId: string; role: Role };

export type AppEnv = {
  Variables: {
    user: UserRow;
    sessionId: string;
    member: MemberCtx;
  };
};
