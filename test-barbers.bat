@echo off
echo Testing Tyler Platform Barber API...
echo.

:: First, create a shop to test with (barbers need a shopId)
echo 1. Creating a test shop for barber...
curl.exe -s -w "Status: %%{http_code}\n" -X POST http://localhost:3001/api/shops ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Tyler's Barbershop\", \"squareLocationId\": \"BARBER_TEST_LOCATION\"}" > shop_response.json
echo.

:: Get all barbers (should be empty initially)
echo 2. Getting all barbers (should be empty initially)...
curl.exe -s -w "Status: %%{http_code}\n" http://localhost:3001/api/barbers
echo.

echo 3. Creating a new barber...
echo Note: You'll need to manually replace SHOP_ID_HERE with actual shop ID from step 1
curl.exe -s -w "Status: %%{http_code}\n" -X POST http://localhost:3001/api/barbers ^
  -H "Content-Type: application/json" ^
  -d "{\"shopId\": \"SHOP_ID_HERE\", \"displayName\": \"Tyler Johnson\", \"squareTeamMemberId\": \"TEAM_123\", \"active\": true}"
echo.

echo 4. Getting all barbers again...
curl.exe -s -w "Status: %%{http_code}\n" http://localhost:3001/api/barbers
echo.

echo Barber API endpoints available:
echo - GET    /api/barbers       (list all barbers with shop info)
echo - POST   /api/barbers       (create barber)
echo - GET    /api/barbers/:id   (get barber by ID with appointments)
echo - PATCH  /api/barbers/:id   (update barber)
echo - DELETE /api/barbers/:id   (delete barber)
echo.

echo Barber API tests completed!
del shop_response.json 2>nul
pause