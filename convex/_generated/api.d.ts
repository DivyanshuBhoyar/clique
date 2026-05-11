/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ResendOTP from "../ResendOTP.js";
import type * as auth from "../auth.js";
import type * as bookmarks from "../bookmarks.js";
import type * as channel from "../channel.js";
import type * as confessions from "../confessions.js";
import type * as crons from "../crons.js";
import type * as drops from "../drops.js";
import type * as http from "../http.js";
import type * as memories from "../memories.js";
import type * as message from "../message.js";
import type * as notes from "../notes.js";
import type * as polls from "../polls.js";
import type * as presence from "../presence.js";
import type * as questions from "../questions.js";
import type * as quotes from "../quotes.js";
import type * as reaction from "../reaction.js";
import type * as squad from "../squad.js";
import type * as typing from "../typing.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";
import type * as vibes from "../vibes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  auth: typeof auth;
  bookmarks: typeof bookmarks;
  channel: typeof channel;
  confessions: typeof confessions;
  crons: typeof crons;
  drops: typeof drops;
  http: typeof http;
  memories: typeof memories;
  message: typeof message;
  notes: typeof notes;
  polls: typeof polls;
  presence: typeof presence;
  questions: typeof questions;
  quotes: typeof quotes;
  reaction: typeof reaction;
  squad: typeof squad;
  typing: typeof typing;
  users: typeof users;
  validators: typeof validators;
  vibes: typeof vibes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
