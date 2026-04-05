#!/bin/bash 
echo "enter email"
read email;
echo "enter user name"
read name;
while true; do
    echo "
    1= Register-user POST /api/auth/register 
    2= Login-user POST /api/auth/login
    3= Auth & GET /api/user/profile
    4= Auth & PUT /api/user/profile
    "
    read option;

    if [[ $option == 1 ]]; then 
        curl -X POST localhost:5000/api/auth/register -H "Content-type: application/json" \
            -d '{"email":"'"$email"'","name":"'"$name"'", "age":"21", "occupation":"whatever", "password":"test1234567"}' > ./token.txt
    elif [[ $option == 2 ]]; then 
        curl -X POST localhost:5000/api/auth/login -H "Content-type: application/json" \
            -d '{"email":"'"$email"'", "password":"test1234567"}' > ./token.txt
    elif [[ $option == 3 ]]; then 
        token=$(jq -r .token < ./token.txt)
        curl localhost:5000/api/user/profile -H "Authorization: Bearer $token" 
    elif [[ $option == 4 ]]; then
        token=$(jq -r .token < ./token.txt)
        curl -X PUT localhost:5000/api/user/profile -H "Authorization: Bearer $token" -H "Content-Type: application/json" \
            -d '{"email":"'"$email"'","name":"'"$name"'","age":21,"occupation":"IT WORKS I CHANGED IT"}'
    else
        echo "Not an option"
    fi
done
