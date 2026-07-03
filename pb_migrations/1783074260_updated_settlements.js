/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4149088774")

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3346940990",
    "help": "",
    "hidden": false,
    "id": "relation1841317061",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "group",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4149088774")

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3346940990",
    "help": "",
    "hidden": false,
    "id": "relation1841317061",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "group",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
