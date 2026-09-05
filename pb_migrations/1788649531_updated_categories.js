/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1219621782")

  // update collection data
  unmarshal({
    "updateRule": "group.members.id ?= @request.auth.id && @request.body.group:isset = false"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1219621782")

  // update collection data
  unmarshal({
    "updateRule": "group.members.id ?= @request.auth.id"
  }, collection)

  return app.save(collection)
})
