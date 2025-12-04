@echo off
echo Testing Tyler Platform Customer API...
echo.

:: First, create a shop to test with (customers need a shopId)
echo 1. Creating a test shop for customers...
curl.exe -s -w "Status: %%{http_code}\n" -X POST http://localhost:3001/api/shops ^
  -H "Content-Type: application/json" ^
  -d "{\"name\": \"Customer Test Shop\", \"squareLocationId\": \"CUSTOMER_TEST_LOCATION\"}" > shop_response.json
echo.

:: Get all customers (should be empty initially)
echo 2. Getting all customers (should be empty initially)...
curl.exe -s -w "Status: %%{http_code}\n" http://localhost:3001/api/customers
echo.

echo 3. Creating a new customer...
echo Note: You'll need to manually replace SHOP_ID_HERE with actual shop ID from step 1
curl.exe -s -w "Status: %%{http_code}\n" -X POST http://localhost:3001/api/customers ^
  -H "Content-Type: application/json" ^
  -d "{\"shopId\": \"SHOP_ID_HERE\", \"firstName\": \"John\", \"lastName\": \"Doe\", \"phone\": \"+1-555-0123\", \"email\": \"john.doe@example.com\", \"squareCustomerId\": \"SQ_CUSTOMER_123\"}"
echo.

echo 4. Getting all customers again...
curl.exe -s -w "Status: %%{http_code}\n" http://localhost:3001/api/customers
echo.

echo 5. Creating another customer (without email)...
curl.exe -s -w "Status: %%{http_code}\n" -X POST http://localhost:3001/api/customers ^
  -H "Content-Type: application/json" ^
  -d "{\"shopId\": \"SHOP_ID_HERE\", \"firstName\": \"Jane\", \"lastName\": \"Smith\", \"phone\": \"+1-555-0456\"}"
echo.

echo Customer API endpoints available:
echo - GET    /api/customers       (list all customers with shop info)
echo - POST   /api/customers       (create customer)
echo - GET    /api/customers/:id   (get customer by ID with appointments)
echo - PATCH  /api/customers/:id   (update customer)
echo - DELETE /api/customers/:id   (delete customer)
echo.

echo Customer DTO fields:
echo - shopId (required)
echo - firstName (required)
echo - lastName (required)
echo - phone (required)
echo - email (optional, validated)
echo - squareCustomerId (optional)
echo.

echo Customer API tests completed!
del shop_response.json 2>nul
pause