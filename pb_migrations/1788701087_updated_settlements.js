/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4149088774")

  // update collection data
  unmarshal({
    "createRule": "group.members.id ?= @request.auth.id && from.groups_via_members.id ?= group && to.groups_via_members.id ?= group",
    "updateRule": "group.members.id ?= @request.auth.id && @request.body.group:isset = false && (@request.body.from:isset = false || @request.body.from.groups_via_members.id ?= group) && (@request.body.to:isset = false || @request.body.to.groups_via_members.id ?= group)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4149088774")

  // update collection data
  unmarshal({
    "createRule": "group.members.id ?= @request.auth.id ",
    "updateRule": "group.members.id ?= @request.auth.id && @request.body.group:isset = false"
  }, collection)

  return app.save(collection)
})
