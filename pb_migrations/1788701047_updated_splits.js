/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1176266541")

  // update collection data
  unmarshal({
    "createRule": "expense.group.members.id ?= @request.auth.id && user.groups_via_members.id ?= expense.group",
    "updateRule": "expense.group.members.id ?= @request.auth.id && @request.body.expense:isset = false && (@request.body.user:isset = false || @request.body.user.groups_via_members.id ?= expense.group)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1176266541")

  // update collection data
  unmarshal({
    "createRule": "expense.group.members.id ?= @request.auth.id",
    "updateRule": "expense.group.members.id ?= @request.auth.id && @request.body.expense:isset = false"
  }, collection)

  return app.save(collection)
})
