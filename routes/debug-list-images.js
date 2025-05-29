// Script to list all IMAGE objects in the Square catalog
const { catalogApi } = require("../util/square-client");

(async () => {
  const { result: { objects } } = await catalogApi.listCatalog(undefined, undefined);
  const images = objects.filter(obj => obj.type === "IMAGE");
  images.forEach(img => {
    console.log("IMAGE ID:", img.id);
    if (img.imageData) {
      console.log("  Name:", img.imageData.name);
      console.log("  URL:", img.imageData.url);
      console.log("  Caption:", img.imageData.caption);
    }
    if (img.isDeleted || img.is_deleted) {
      console.log("  [DELETED]");
    }
    console.log("----------------------");
  });
})();
