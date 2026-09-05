/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4149088774")

  // update collection data
  unmarshal({
    "createRule": "group.members.id ?= @request.auth.id ",
    "updateRule": "group.members.id ?= @request.auth.id && @request.body.group:isset = false"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4149088774")

  // update collection data
  unmarshal({
    "createRule": "group.members.id ?= @request.auth.id && group.members.id ?= from && group.members.id ?= to",
    "updateRule": "group.members.id ?= @request.auth.id && group.members.id ?= from && group.members.id ?= to && @request.body.group:isset = false"
  }, collection)

  return app.save(collection)
})
