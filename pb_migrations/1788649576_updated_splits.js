/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1176266541")

  // update collection data
  unmarshal({
    "createRule": "expense.group.members.id ?= @request.auth.id && expense.group.members.id ?= user",
    "updateRule": "expense.group.members.id ?= @request.auth.id && expense.group.members.id ?= user && @request.body.expense:isset = false"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1176266541")

  // update collection data
  unmarshal({
    "createRule": "expense.group.members.id ?= @request.auth.id",
    "updateRule": "expense.group.members.id ?= @request.auth.id"
  }, collection)

  return app.save(collection)
})
