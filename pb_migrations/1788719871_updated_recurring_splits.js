/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2497640270")

  // update collection data
  unmarshal({
    "createRule": "recurring.group.members.id ?= @request.auth.id && user.groups_via_members.id ?= recurring.group\n",
    "deleteRule": "recurring.group.members.id ?= @request.auth.id",
    "listRule": "recurring.group.members.id ?= @request.auth.id",
    "updateRule": "recurring.group.members.id ?= @request.auth.id && @request.body.recurring:isset = false && (@request.body.user:isset = false || @request.body.user.groups_via_members.id ?= recurring.group)",
    "viewRule": "recurring.group.members.id ?= @request.auth.id"
  }, collection)

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": true,
    "collectionId": "pbc_3657945760",
    "help": "",
    "hidden": false,
    "id": "relation1819017965",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "recurring",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2497640270")

  // update collection data
  unmarshal({
    "createRule": null,
    "deleteRule": null,
    "listRule": null,
    "updateRule": null,
    "viewRule": null
  }, collection)

  // update field
  collection.fields.addAt(1, new Field({
    "cascadeDelete": false,
    "collectionId": "pbc_3657945760",
    "help": "",
    "hidden": false,
    "id": "relation1819017965",
    "maxSelect": 0,
    "minSelect": 0,
    "name": "recurring",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
})
