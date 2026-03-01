/// <reference path="../pb_data/types.d.ts" />

// Preview invite — returns group name without joining
routerAdd(
  "GET",
  "/api/invites/{token}",
  (e) => {
    const info = e.requestInfo();
    if (!info.auth) {
      throw new UnauthorizedError("Must be authenticated");
    }

    const token = e.request.pathValue("token");

    let invite;
    try {
      invite = e.app.findFirstRecordByFilter("invites", "token = {:token}", {
        token: token,
      });
    } catch {
      throw new NotFoundError("Invalid invite link");
    }

    const group = e.app.findRecordById("groups", invite.get("group"));

    return e.json(200, { groupId: group.id, groupName: group.get("name") });
  },
  $apis.requireAuth(),
);

// Accept invite — validates token server-side and adds user to group
routerAdd(
  "POST",
  "/api/invites/{token}/accept",
  (e) => {
    const info = e.requestInfo();
    const user = info.auth;
    if (!user) {
      throw new UnauthorizedError("Must be authenticated");
    }

    const token = e.request.pathValue("token");

    let invite;
    try {
      invite = e.app.findFirstRecordByFilter("invites", "token = {:token}", {
        token: token,
      });
    } catch {
      throw new NotFoundError("Invalid invite link");
    }

    const group = e.app.findRecordById("groups", invite.get("group"));
    const members = group.get("members") || [];

    if (!members.includes(user.id)) {
      members.push(user.id);
      group.set("members", members);
      e.app.save(group);
    }

    return e.json(200, { groupId: group.id });
  },
  $apis.requireAuth(),
);
