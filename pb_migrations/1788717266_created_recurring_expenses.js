/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "group.members.id ?= @request.auth.id && paidBy.groups_via_members.id ?= group",
    "deleteRule": "group.members.id ?= @request.auth.id",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_3346940990",
        "help": "",
        "hidden": false,
        "id": "relation1841317061",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "group",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text724990059",
        "max": 0,
        "min": 0,
        "name": "title",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number2392944706",
        "max": null,
        "min": null,
        "name": "amount",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_3379852803",
        "help": "",
        "hidden": false,
        "id": "relation1767278655",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "currency",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "help": "",
        "hidden": false,
        "id": "relation4241804789",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "paidBy",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1219621782",
        "help": "",
        "hidden": false,
        "id": "relation105650625",
        "maxSelect": 0,
        "minSelect": 0,
        "name": "category",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json1896815203",
        "maxSize": 0,
        "name": "splits",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select645904403",
        "maxSelect": 0,
        "name": "frequency",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "weekly",
          "monthly",
          "yearly"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "date1269603864",
        "max": "",
        "min": "",
        "name": "startDate",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date3104211033",
        "max": "",
        "min": "",
        "name": "nextDate",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date826688707",
        "max": "",
        "min": "",
        "name": "endDate",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "autodate2990389176",
        "name": "created",
        "onCreate": true,
        "onUpdate": false,
        "presentable": false,
        "system": false,
        "type": "autodate"
      },
      {
        "hidden": false,
        "id": "autodate3332085495",
        "name": "updated",
        "onCreate": true,
        "onUpdate": true,
        "presentable": false,
        "system": false,
        "type": "autodate"
      }
    ],
    "id": "pbc_3657945760",
    "indexes": [],
    "listRule": "group.members.id ?= @request.auth.id",
    "name": "recurring_expenses",
    "system": false,
    "type": "base",
    "updateRule": "group.members.id ?= @request.auth.id && @request.body.group:isset = false && (@request.body.paidBy:isset = false || @request.body.paidBy.groups_via_members.id ?= group)",
    "viewRule": "group.members.id ?= @request.auth.id"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3657945760");

  return app.delete(collection);
})
