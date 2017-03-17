Asynchrously extracts doctor information (address, telephone number, GPS coordinates if available...) from http://www.telecontact.ma and stores them in a JSON file.

Install dependencies with `npm`

    cd /path/to/this/directory
    npm install

Set what specialties and cities you want to build a database of in main.js

    var specialties = {
        "Name as it appears on telecontact.ma": "Name as you want it to appear in the database"
    };

    var cities = [
        "telecontact.ma city 1",
        "telecontact.ma city 2"
    ];

Run the file with `nodejs`

    node main.js

Sorry telecontact.ma, and thank you :)
