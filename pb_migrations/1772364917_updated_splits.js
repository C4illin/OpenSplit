/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1176266541");

    // update collection data
    unmarshal(
      {
        createRule: "expense.group.members.id ?= @request.auth.id",
        deleteRule: "expense.group.members.id ?= @request.auth.id",
        listRule: "expense.group.members.id ?= @request.auth.id",
        updateRule: "expense.group.members.id ?= @request.auth.id",
        viewRule: "expense.group.members.id ?= @request.auth.id",
      },
      collection,
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1176266541");

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
