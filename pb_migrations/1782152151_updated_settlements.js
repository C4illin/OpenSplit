/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4149088774")

  // update collection data
  unmarshal({
    "createRule": "group.members.id ?= @request.auth.id",
    "deleteRule": "group.members.id ?= @request.auth.id",
    "listRule": "group.members.id ?= @request.auth.id",
    "updateRule": "group.members.id ?= @request.auth.id",
    "viewRule": "group.members.id ?= @request.auth.id"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4149088774")

  // update collection data
  unmarshal({
    "createRule": null,
    "deleteRule": null,
    "listRule": null,
    "updateRule": null,
    "viewRule": null
  }, collection)

  return app.save(collection)
})
