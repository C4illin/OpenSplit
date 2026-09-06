/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3657945760")

  // remove field
  collection.fields.removeById("json1896815203")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3657945760")

  // add field
  collection.fields.addAt(7, new Field({
    "help": "",
    "hidden": false,
    "id": "json1896815203",
    "maxSize": 0,
    "name": "splits",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "json"
  }))

  return app.save(collection)
})
