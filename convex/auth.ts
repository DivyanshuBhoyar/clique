import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./ResendOTP";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [ResendOTP],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        return args.existingUserId;
      }
      // New user — inject createdAt since it's required by our schema
      return ctx.db.insert("users", {
        ...args.profile,
        createdAt: Date.now(),
      });
    },
  },
});
