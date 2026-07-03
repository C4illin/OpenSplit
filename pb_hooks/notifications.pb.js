/// <reference path="../pb_data/types.d.ts" />

// Fans out records into the `notifications` collection when expenses and
// settlements are created via the API. The Go side (main.go/webpush.go) picks
// up every created notification and delivers it as a Web Push message to all
// of the recipient's registered devices (`push_subscriptions`).
//
// Notification creation runs after e.next(), so the original request has
// already succeeded — failures here are logged and never fail the request.

onRecordCreateRequest((e) => {
  e.next();

  try {
    const actor = e.auth;
    const group = e.app.findRecordById("groups", e.record.get("group"));
    const actorName = actor?.get("name") || actor?.get("email") || "Someone";
    const amount = e.record.get("amount");
    const currency = (e.record.get("currency") || "").toUpperCase();

    const collection = e.app.findCollectionByNameOrId("notifications");
    const members = group.get("members") || [];
    for (const memberId of members) {
      if (actor && memberId === actor.id) continue;
      const notification = new Record(collection);
      notification.set("user", memberId);
      notification.set("title", group.get("name"));
      notification.set("body", `${actorName} added "${e.record.get("title")}" — ${amount} ${currency}`);
      notification.set("url", `/group/${group.id}`);
      e.app.save(notification);
    }
  } catch (err) {
    e.app.logger().error("Failed to create expense notifications", "error", String(err));
  }
}, "expenses");

onRecordCreateRequest((e) => {
  e.next();

  try {
    const actor = e.auth;
    const group = e.app.findRecordById("groups", e.record.get("group"));
    const amount = e.record.get("amount");
    const currency = (e.record.get("currency") || "").toUpperCase();

    let fromName = "Someone";
    try {
      const from = e.app.findRecordById("users", e.record.get("from"));
      fromName = from.get("name") || from.get("email") || fromName;
    } catch {
      // keep fallback
    }

    const collection = e.app.findCollectionByNameOrId("notifications");
    const recipients = [e.record.get("from"), e.record.get("to")].filter(
      (id) => id && (!actor || id !== actor.id),
    );
    for (const userId of recipients) {
      const notification = new Record(collection);
      notification.set("user", userId);
      notification.set("title", group.get("name"));
      notification.set("body", `${fromName} paid ${amount} ${currency}`);
      notification.set("url", `/group/${group.id}`);
      e.app.save(notification);
    }
  } catch (err) {
    e.app.logger().error("Failed to create settlement notifications", "error", String(err));
  }
}, "settlements");
