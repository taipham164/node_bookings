@echo off
echo Testing Tyler Platform Service API...
echo.

:: First, create a shop to test with (we need a shopId for services)
echo 1. Creating a test shop...
curl.exe -s -w "Status: %%{http_code}\n" -X POST http://localhost:3001/api/shops ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Test Barbershop\", \"squareLocationId\": \"TEST_LOCATION_123\"}" > shop_response.json
echo.

:: Extract shop ID (simple approach - you might want to use jq in real scenarios)
echo 2. Getting all services (should be empty initially)...
curl.exe -s -w "Status: %%{http_code}\n" http://localhost:3001/api/services
echo.

echo 3. Creating a haircut service...
echo Note: You'll need to manually replace SHOP_ID_HERE with actual shop ID from step 1
curl.exe -s -w "Status: %%{http_code}\n" -X POST http://localhost:3001/api/services ^
  -H "Content-Type: application/json" ^
  -d "{\"shopId\": \"SHOP_ID_HERE\", \"name\": \"Classic Haircut\", \"durationMinutes\": 30, \"priceCents\": 2500, \"squareCatalogObjectId\": \"CATALOG_123\"}"
echo.

echo 4. Getting all services again...
curl.exe -s -w "Status: %%{http_code}\n" http://localhost:3001/api/services
echo.

echo Service API endpoints available:
echo - GET    /api/services       (list all services)
echo - POST   /api/services       (create service)
echo - GET    /api/services/:id   (get service by ID)
echo - PATCH  /api/services/:id   (update service)
echo - DELETE /api/services/:id   (delete service)
echo.

echo Service API tests completed!
del shop_response.json 2>nul
pause