/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("_pb_users_auth_");

    // update collection data
    unmarshal(
      {
        viewRule:
          "id = @request.auth.id || @collection.groups.members ?~ id && @collection.groups.members ?~ @request.auth.id",
      },
      collection,
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("_pb_users_auth_");

    // update collection data
    unmarshal(
      {
        viewRule: "id = @request.auth.id",
      },
      collection,
    );

    return app.save(collection);
  },
);
