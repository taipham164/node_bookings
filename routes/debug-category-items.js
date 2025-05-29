// Debug script to log category and item relationships from Square catalog
const { catalogApi } = require("../util/square-client");

(async () => {
  const { result: { objects } } = await catalogApi.listCatalog(undefined, undefined);
  const items = objects.filter(obj => obj.type === "ITEM" && obj.itemData && obj.itemData.productType === "APPOINTMENTS_SERVICE" && !obj.isDeleted && !obj.is_deleted);
  const categories = objects.filter(obj => obj.type === "CATEGORY" && obj.categoryData && !obj.isDeleted && !obj.is_deleted);

  // Print all categories
  console.log("CATEGORIES:");
  categories.forEach(cat => {
    console.log(`- ${cat.id}: ${cat.categoryData.name}`);
  });

  // Print all items and their category references
  console.log("\nITEMS:");
  items.forEach(item => {
    let catIds = [];
    if (item.itemData.categories && Array.isArray(item.itemData.categories)) {
      catIds = item.itemData.categories.map(catObj => catObj.id);
    } else if (item.itemData.category && item.itemData.category.id) {
      catIds = [item.itemData.category.id];
    }
    console.log(`- ${item.id}: ${item.itemData.name} | Categories: ${catIds.join(", ")}`);
  });
})();
