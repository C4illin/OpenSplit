/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1691921218")

  // update field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3346940990",
    "help": "",
    "hidden": false,
    "id": "relation1841317061",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "group",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1691921218")

  // update field
  collection.fields.addAt(4, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3346940990",
    "help": "",
    "hidden": false,
    "id": "relation1841317061",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "group",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
