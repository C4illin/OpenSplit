/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1691921218");

    // update collection data
    unmarshal(
      {
        createRule: "group.members.id ?= @request.auth.id ",
        deleteRule: "group.members.id ?= @request.auth.id ",
        listRule: "group.members.id ?= @request.auth.id ",
        updateRule: "group.members.id ?= @request.auth.id ",
        viewRule: "group.members.id ?= @request.auth.id ",
      },
      collection,
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1691921218");

    // update collection data
    unmarshal(
      {
        createRule: "",
        deleteRule: "",
        listRule: "",
        updateRule: "",
        viewRule: "",
      },
      collection,
    );

    return app.save(collection);
  },
);
