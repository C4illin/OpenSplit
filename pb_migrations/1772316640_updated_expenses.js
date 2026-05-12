/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1691921218");

    // add field
    collection.fields.addAt(
      1,
      new Field({
        autogeneratePattern: "",
        hidden: false,
        id: "text724990059",
        max: 0,
        min: 0,
        name: "title",
        pattern: "",
        presentable: false,
        primaryKey: false,
        required: true,
        system: false,
        type: "text",
      }),
    );

    // add field
    collection.fields.addAt(
      2,
      new Field({
        hidden: false,
        id: "number2392944706",
        max: null,
        min: null,
        name: "amount",
        onlyInt: false,
        presentable: false,
        required: true,
        system: false,
        type: "number",
      }),
    );

    // add field
    collection.fields.addAt(
      3,
      new Field({
        cascadeDelete: false,
        collectionId: "_pb_users_auth_",
        hidden: false,
        id: "relation4241804789",
        maxSelect: 1,
        minSelect: 0,
        name: "paidBy",
        presentable: false,
        required: true,
        system: false,
        type: "relation",
      }),
    );

    // add field
    collection.fields.addAt(
      4,
      new Field({
        cascadeDelete: false,
        collectionId: "pbc_3346940990",
        hidden: false,
        id: "relation1841317061",
        maxSelect: 1,
        minSelect: 0,
        name: "group",
        presentable: false,
        required: true,
        system: false,
        type: "relation",
      }),
    );

    // add field
    collection.fields.addAt(
      5,
      new Field({
        hidden: false,
        id: "date2862495610",
        max: "",
        min: "",
        name: "date",
        presentable: false,
        required: false,
        system: false,
        type: "date",
      }),
    );

    // add field
    collection.fields.addAt(
      6,
      new Field({
        autogeneratePattern: "",
        hidden: false,
        id: "text1767278655",
        max: 0,
        min: 0,
        name: "currency",
        pattern: "",
        presentable: false,
        primaryKey: false,
        required: true,
        system: false,
        type: "text",
      }),
    );

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("pbc_1691921218");

    // remove field
    collection.fields.removeById("text724990059");

    // remove field
    collection.fields.removeById("number2392944706");

    // remove field
    collection.fields.removeById("relation4241804789");

    // remove field
    collection.fields.removeById("relation1841317061");

    // remove field
    collection.fields.removeById("date2862495610");

    // remove field
    collection.fields.removeById("text1767278655");

    return app.save(collection);
  },
);
