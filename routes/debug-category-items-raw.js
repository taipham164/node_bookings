// Debug script to log raw item objects for category linkage troubleshooting
const { catalogApi } = require("../util/square-client");

(async () => {
  const { result: { objects } } = await catalogApi.listCatalog(undefined, undefined);
  const items = objects.filter(obj => obj.type === "ITEM" && obj.itemData && obj.itemData.productType === "APPOINTMENTS_SERVICE" && !obj.isDeleted && !obj.is_deleted);
  function replacer(key, value) {
    return typeof value === 'bigint' ? value.toString() : value;
  }
  items.forEach(item => {
    console.log("==== ITEM ====");
    console.log(JSON.stringify(item, replacer, 2));
  });
})();
