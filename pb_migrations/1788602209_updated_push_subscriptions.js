/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2483452340")

  // update collection data
  unmarshal({
    "updateRule": "user = @request.auth.id && (@request.body.user:isset = false || @request.body.user = @request.auth.id)"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2483452340")

  // update collection data
  unmarshal({
    "updateRule": "user = @request.auth.id"
  }, collection)

  return app.save(collection)
})
