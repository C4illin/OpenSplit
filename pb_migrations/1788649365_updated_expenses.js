/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1691921218")

  // update collection data
  unmarshal({
    "createRule": "group.members.id ?= @request.auth.id && group.members.id ?= paidBy",
    "updateRule": "group.members.id ?= @request.auth.id && group.members.id ?= paidBy && @request.body.group:isset = false"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1691921218")

  // update collection data
  unmarshal({
    "createRule": "group.members.id ?= @request.auth.id ",
    "updateRule": "group.members.id ?= @request.auth.id "
  }, collection)

  return app.save(collection)
})
