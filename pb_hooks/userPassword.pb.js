/// <reference path="../pb_data/types.d.ts" />

// Allow authenticated users to set or change their password.
// Users authenticated via OAuth (e.g. Google) do not know the auto-generated
// random password, so oldPassword is not required if they have a linked external auth.
routerAdd(
  "POST",
  "/api/user/password",
  (e) => {
    const info = e.requestInfo();
    const user = info.auth;
    if (!user) {
      throw new UnauthorizedError("Must be authenticated");
    }

    const body = info.body || {};
    const password = body.password;
    const passwordConfirm = body.passwordConfirm;
    const oldPassword = body.oldPassword;

    if (!password || typeof password !== "string") {
      throw new BadRequestError("Password is required.");
    }
    if (password.length < 8) {
      throw new BadRequestError("Password must be at least 8 characters long.");
    }
    if (password !== passwordConfirm) {
      throw new BadRequestError("Passwords do not match.");
    }

    // Check if the user has an external auth (e.g. Google)
    const externalAuths = e.app.findAllExternalAuthsByRecord(user);
    const hasExternalAuth = externalAuths && externalAuths.length > 0;

    // If user has no external auth, current password is required
    if (!hasExternalAuth) {
      if (!oldPassword) {
        throw new BadRequestError("Current password is required.");
      }
      if (!user.validatePassword(oldPassword)) {
        throw new BadRequestError("Current password is incorrect.");
      }
    } else if (oldPassword) {
      // If user has external auth and chose to provide oldPassword, validate it
      if (!user.validatePassword(oldPassword)) {
        throw new BadRequestError("Current password is incorrect.");
      }
    }

    user.setPassword(password);
    e.app.save(user);

    return e.json(200, { success: true });
  },
  $apis.requireAuth(),
);

