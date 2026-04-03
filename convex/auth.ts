import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./ResendOTP";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [ResendOTP, Google],
  callbacks: {
    async redirect({ redirectTo }) {
      // Allow mobile deep-link scheme
      if (redirectTo.startsWith("clique://")) {
        return redirectTo;
      }
      // Fall back to SITE_URL for web
      return process.env.SITE_URL ?? redirectTo;
    },
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        return args.existingUserId;
      }
      // New user
      return ctx.db.insert("users", {
        ...args.profile,
      });
    },
  },
});
