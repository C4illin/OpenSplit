/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1176266541")

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_1691921218",
    "help": "",
    "hidden": false,
    "id": "relation758812070",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "expense",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1176266541")

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_1691921218",
    "help": "",
    "hidden": false,
    "id": "relation758812070",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "expense",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
