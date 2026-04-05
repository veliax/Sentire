# Sentire
An Intelligent General Purpose Incident Detection System

## Frontend Obejctives for 18th of february
1. Login page with form that can be sent to the backend via json format

2. Signup page with form that can be sent to the backend via json format

## Backend Objectives for 18th of february (Done)
### Construct the skeleton (Done) 
Create The initial necessary files, Ensure that nodejs works, Package json should have the modules type, Additionally you should create the majority of the directories you will work in. 

### Create The database's script (Done)
Create A database initialziation script that will run once during each instance of the project. (A script that will initilize the schema we created once).

### Create the initial authentication process (Done)
1. Ensure that users can create accounts / login

2. Create the auth jwt token file and ensure that jwt is properly being sent and stored.

3. Create the middleware that will exist between each request for each route 

## Backend Objectives for 25th of february
### User Crud
Completing User Crud capabilites
1. Create (done)
2. Read (done)
3. Update (Done)
4. Delete (Done)

All of these should be within the /api/userRoute.js file 

### Cron Jobs (Done)
Initially for deleted users past one year (Will Test with 1 minute).

I will implement it for deleted or unwanted videos as well after videos are implemented.

will be done within the user.js  (I already coded this just need to reimplement it)

### file storing 
implement file storing for videos (decide on a video format, most likely whichever is compatible with ffmpeg) and store its path within the database

### Emails
I already have the code for it just need to reimplement
will be helpful for 2 step verification (which will be implemented once the core of the project is done)

### Admin Privs
Since we use role based access controls it should be easy 
I've already coded a manual solution where a root admin exists and gives others admin privs

Idk if its a correct approach and how to automate it though (ask dr or research)

### EXCLUDE THE .ENV FILE FROM GIT AND REMOVE IT FROM GITHUB IMPORTANT------

## Objectives that we've yet to set a date on 
### Docker
Should be relatively late after the projects done, unless issues regarding differences in development environments arise

### Two Step verification
Most likely through a simple email code (as its the easiest to implement) however if there is enough time then implement a unique way as the dr instructed us to 

### Dealing with Gemini api 

### Yolov8 Object Detection

### Frame Splitting

