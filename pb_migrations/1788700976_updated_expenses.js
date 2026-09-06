/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1691921218")

  // update collection data
  unmarshal({
    "createRule": "group.members.id ?= @request.auth.id && paidBy.groups_via_members.id ?= group",
    "updateRule": "group.members.id ?= @request.auth.id && @request.body.group:isset = false\n          && (@request.body.paidBy:isset = false || @request.body.paidBy.groups_via_members.id ?= group)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1691921218")

  // update collection data
  unmarshal({
    "createRule": "group.members.id ?= @request.auth.id",
    "updateRule": "group.members.id ?= @request.auth.id && @request.body.group:isset = false"
  }, collection)

  return app.save(collection)
})
