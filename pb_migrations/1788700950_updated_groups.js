/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3346940990")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\" && members:length = 1 && members.id ?= @request.auth.id",
    "updateRule": "members.id ?= @request.auth.id && @request.body.members:isset = false"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3346940990")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "members.id ?= @request.auth.id"
  }, collection)

  return app.save(collection)
})
