#!/bin/bash

# Get admin token using grep + sed (no jq)
LOGIN_RESPONSE=$(curl -s -X POST https://kibu-evote-backend.onrender.com/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@kibu.ac.ke","password":"Admin@123"}')

# Extract token (remove quotes, braces)
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d '"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Token obtained: $TOKEN"
ELECTION_ID="69a170fc3dca494f2870b744"

# Candidate list (39 entries)
candidates=(
  "0,Chairperson,Sarah Wanjiku,BIT/0025/23,Information Technology,3,School of Computing & Informatics,Improve campus facilities"
  "0,Chairperson,James Kiprotich,BIT/0034/22,Computer Science,4,School of Computing & Informatics,Digital innovation"
  "0,Chairperson,Grace Akinyi,BBA/0012/23,Business Administration,3,School of Business & Economics,Sustainability initiatives"
  
  "1,Vice Chairperson,Peter Omondi,LLB/0045/22,Law,4,School of Law,Student rights"
  "1,Vice Chairperson,Mary Wangari,EDU/0023/23,Education,3,School of Education,Academic excellence"
  "1,Vice Chairperson,John Kiprotich,BIT/0101/24,Information Technology,2,School of Computing & Informatics,Student welfare"
  
  "2,Secretary General,David Mwangi,BIT/0012/22,Information Technology,4,School of Computing & Informatics,Transparent comms"
  "2,Secretary General,Lucy Achieng,JOU/0005/23,Journalism,3,School of Education,Media communication"
  "2,Secretary General,Michael Odhiambo,BBA/0033/22,Accounting,4,School of Business & Economics,Digital records"
  
  "3,Treasurer,Cynthia Wanjiru,BBA/0044/23,Economics,3,School of Business & Economics,Budget management"
  "3,Treasurer,Brian Kipkoech,EDU/0055/22,Education,4,School of Education,Financial transparency"
  "3,Treasurer,Faith Chemutai,SCI/0066/23,Science,3,School of Health Sciences,Fund allocation"
  
  "4,Academic Secretary,Samuel Kiprono,ENG/0077/22,Engineering,4,School of Engineering,Study resources"
  "4,Academic Secretary,Esther Njeri,BBA/0088/23,Business Administration,3,School of Business & Economics,Academic support"
  "4,Academic Secretary,Kevin Otieno,LLB/0099/22,Law,4,School of Law,Exam reforms"
  
  "5,Accommodation & Security Secretary,Janet Akinyi,EDU/0100/23,Education,3,School of Education,Safe hostels"
  "5,Accommodation & Security Secretary,Robert Kimani,ART/0111/22,Arts,4,School of Education,Campus security"
  "5,Accommodation & Security Secretary,Catherine Muthoni,ART/0122/23,Arts,3,School of Education,Accommodation improvements"
  
  "6,Special Interests Secretary,Diana Achieng,ART/0133/22,Arts,4,School of Education,Special needs"
  "6,Special Interests Secretary,Priscah Jelagat,ART/0144/23,Arts,3,School of Education,Minority representation"
  "6,Special Interests Secretary,Joseph Njoroge,ART/0155/22,Arts,4,School of Education,Disability inclusion"
  
  "7,FASS Academic Nominee,Simon Kipchoge,ART/0166/23,Arts,3,School of Education,Arts advocacy"
  "7,FASS Academic Nominee,Thomas Mboya,BBA/0177/21,Business Administration,5,School of Business & Economics,FASS academics"
  "7,FASS Academic Nominee,Rose Auma,BIT/0188/21,Information Technology,5,School of Computing & Informatics,FASS representation"
  
  "8,FASS Female Nominee,Daniel Mwaura,EDU/0199/21,Education,5,School of Education,Women empowerment"
  "8,FASS Female Nominee,Monicah Wanjiku,LLB/0200/21,Law,5,School of Law,Female leadership"
  "8,FASS Female Nominee,Jane Atieno,BBA/0211/22,Business Administration,4,School of Business & Economics,Gender equality"
  
  "9,FASS Male Nominee,Paul Mwangi,BIT/0222/23,Information Technology,3,School of Computing & Informatics,Male mentorship"
  "9,FASS Male Nominee,John Njue,EDU/0233/24,Education,2,School of Education,Male student voice"
  "9,FASS Male Nominee,Alex Otieno,LLB/0244/25,Law,1,School of Law,Men's issues"
  
  "10,Evening & Weekend Nominee,Beatrice Akinyi,BBA/0255/21,Business Administration,5,School of Business & Economics,Evening students"
  "10,Evening & Weekend Nominee,Charles Omondi,BIT/0266/21,Information Technology,5,School of Computing & Informatics,Weekend classes"
  "10,Evening & Weekend Nominee,Dorcas Wambui,EDU/0277/22,Education,4,School of Education,Part-time support"
  
  "11,Part-Time,Elijah Kipchoge,ENG/0288/23,Engineering,3,School of Engineering,Part-time flexibility"
  "11,Part-Time,Florence Muthoni,SCI/0299/23,Science,3,School of Health Sciences,Part-time resources"
  "11,Part-Time,George Otieno,LLB/0300/24,Law,2,School of Law,Part-time rights"
  
  "12,Postgraduate,Sarah Odhiambo,PHD/0211/20,PhD Computer Science,3,School of Computing & Informatics,Research support"
  "12,Postgraduate,James Kariuki,MSC/0222/21,MSc Economics,2,School of Business & Economics,Postgraduate welfare"
  "12,Postgraduate,Alice Njeri,PHD/0233/19,PhD Education,4,School of Education,Postgraduate funding"
)

count=0
for entry in "${candidates[@]}"; do
  IFS=',' read -r posId posTitle name reg course year faculty manifesto <<< "$entry"
  
  response=$(curl -s -X POST https://kibu-evote-backend.onrender.com/api/v1/admin/candidates \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"name\": \"$name\",
      \"regNumber\": \"$reg\",
      \"course\": \"$course\",
      \"yearOfStudy\": $year,
      \"faculty\": \"$faculty\",
      \"manifesto\": \"$manifesto\",
      \"positionId\": $posId,
      \"positionTitle\": \"$posTitle\",
      \"electionId\": \"$ELECTION_ID\"
    }")
  
  if echo "$response" | grep -q '"success":true'; then
    echo "✅ Added: $name ($posTitle)"
    ((count++))
  else
    echo "❌ Failed: $name - $response"
  fi
done

echo "✅ Added $count candidates (should be 39)"