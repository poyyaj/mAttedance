#!/bin/bash
# Quick API test script
BASE="http://localhost:5000/api"

echo "=== Testing mAttedance API ==="

# Health
echo -n "Health: "
curl -s $BASE/health | grep -o '"status":"OK"' && echo " ✅" || echo " ❌"

# Admin Login
echo -n "Admin Login: "
TOKEN=$(curl -s -X POST $BASE/auth/admin/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
[ -n "$TOKEN" ] && echo "✅ (token received)" || echo "❌"

# Dashboard
echo -n "Dashboard Summary: "
curl -s $BASE/dashboard/summary -H "Authorization: Bearer $TOKEN" | grep -o '"totalStudents":[0-9]*' && echo " ✅" || echo " ❌"

# Programs
echo -n "Programs: "
curl -s $BASE/programs -H "Authorization: Bearer $TOKEN" | grep -o '"Biomedical Science"' && echo " ✅" || echo " ❌"

# Subjects
echo -n "Subjects: "
curl -s $BASE/subjects -H "Authorization: Bearer $TOKEN" | grep -o '"BMS101"' && echo " ✅" || echo " ❌"

# Students
echo -n "Students: "
curl -s $BASE/students -H "Authorization: Bearer $TOKEN" | grep -o '"Aarav Patel"' && echo " ✅" || echo " ❌"

# Faculty
echo -n "Faculty: "
curl -s $BASE/faculty -H "Authorization: Bearer $TOKEN" | grep -o '"Dr. Priya Sharma"' && echo " ✅" || echo " ❌"

# Faculty Login
echo -n "Faculty Login: "
FTOKEN=$(curl -s -X POST $BASE/auth/faculty/login -H 'Content-Type: application/json' -d '{"email":"priya@university.edu","password":"faculty123"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
[ -n "$FTOKEN" ] && echo "✅ (token received)" || echo "❌"

# Shortage Report
echo -n "Shortage Report: "
curl -s "$BASE/reports/shortage?threshold=75" -H "Authorization: Bearer $TOKEN" | head -c 100
echo " ✅"

# Monthly Report
echo -n "Monthly Report: "
curl -s "$BASE/reports/monthly" -H "Authorization: Bearer $TOKEN" | head -c 100
echo " ✅"

# Heatmap
echo -n "Heatmap: "
curl -s "$BASE/dashboard/heatmap" -H "Authorization: Bearer $TOKEN" | head -c 100
echo " ✅"

echo ""
echo "=== All API Tests Completed ==="
