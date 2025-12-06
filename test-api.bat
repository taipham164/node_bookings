@echo off
echo Testing Tyler Platform Shop API...
echo.

:: Test health endpoint
echo 1. Testing health endpoint...
echo URL: http://localhost:3001/api/health
curl.exe -s -w "Status: %%{http_code}\n" http://localhost:3001/api/health
echo.

:: Get all shops (should be empty initially)
echo 2. Getting all shops...
echo URL: http://localhost:3001/api/shops
curl.exe -s -w "Status: %%{http_code}\n" http://localhost:3001/api/shops
echo.

:: Create a new shop
echo 3. Creating a new shop...
curl.exe -s -w "Status: %%{http_code}\n" -X POST http://localhost:3001/api/shops ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Tyler's Barbershop\", \"squareLocationId\": \"LOCATION_123\"}"
echo.

:: Get all shops again (should show our new shop)
echo 4. Getting all shops again...
curl.exe -s -w "Status: %%{http_code}\n" http://localhost:3001/api/shops
echo.

echo Shop API tests completed!
pause