var request = require('request');
var jsdom = require('jsdom');
var fs = require('fs');

var list = [];

var specialties = {
    "Allergologie (Médecins)": 'Allergologie',
    "Anesthésiologie-réanimation chirurgicale (Médecins)": 'Anesthésiologie-réanimation chirurgicale',
    "Biologie médicale et physiologie (Médecins)": 'Biologie médicale et physiologie',
    "Cardiologie (Médecins)": 'Cardiologie',
    "Chirurgie (Médecins)": 'Chirurgie',
    "Chirurgiens-dentistes": 'Chirurgie-dentaire',
    "Dermatologie et Vénéréologie (Médecins)": 'Dermatologie et Vénéréologie',
    "Endocrinologie et métabolisme (Médecins)": 'Endocrinologie et métabolisme',
    "Gastro-entérologie et hépatologie (Médecins)": 'Gastro-entérologie et hépatologie',
    "Généalogiste": 'Généalogie',
    "Gynécologie-obstétrique (Médecins)": 'Gynécologie-obstétrique',
    "Hématologie (Médecins)": 'Hématologie',
    "Néphrologie (Médecins)": 'Néphrologie',
    "Neurochirurgie (Médecins)": 'Neurochirurgie',
    "Neuropsychiatrie (Médecins)": 'Neuropsychiatrie',
    "Neurologie (Médecins)": 'Neurologie',
    "Ophtalmologie (Médecins)": 'Ophtalmologie',
    "Orthopédie dento-faciale (Médecins)": 'Orthopédie dento-faciale',
    "Oto rhino laryngologie (Médecins)": 'Oto rhino laryngologie',
    "Pathologie du sommeil (Médecins)": 'Pathologie du sommeil',
    "Pédiatrie (Médecins)": 'Pédiatrie',
    "Pneumologie (Médecins)": 'Pneumologie',
    "Psychiatrie (Médecins)": 'Psychiatrie',
    "Radiologie (Médecins)": 'Radiologie',
    "Rhumatologie (Médecins)": 'Rhumatologie',
    "Sexologues": 'Sexologie',
    "Urologie (Médecins)": 'Urologie',
    "Vétérinaires": 'Vétérinaire'
};

var cities = [
    'Casablanca',
    'Rabat'
];

var output = {};

var cityCount = 0, citiesPending = 0;
for (var i in cities) {
    ++cityCount;
    var city = cities[i];
    var cityOutput = {};
    output[city] = cityOutput;
    getCity(city, cityOutput, function() {
        if (++citiesPending >= cityCount) {
            console.log('Writing file...');
            var stream = fs.createWriteStream('db.json');
            stream.once('open', function(fd) {
                stream.write(JSON.stringify(output));
                stream.end();
                console.log('File written. Ending...');
            });
        };
    });
}

function getCity(city, output, callback) {
    var specialtyCount = 0, specialtiesPending = 0;
    for (var i in specialties) {
        specialtyCount++;
        var specialty = i;
        var specialtyName = specialties[i];
        var specialtyOutput = [];
        output[specialtyName] = specialtyOutput;
        getSpecialty(city, specialty, specialtyOutput, function() {
            if (++specialtiesPending >= specialtyCount) callback();
        });
    }
}

function getSpecialty(city, specialty, output, callback) {
    getPage(city, specialty, 1, output, callback);
}

function getPage(city, specialty, page, list, callback) {
    var url = 'http://www.telecontact.ma/trouver/index.php?nxo=moteur&nxs=process&string='
        + encodeURIComponent(specialty) + '&ou=' + encodeURIComponent(city)
        + '&ou_ville=&trouver=&page=' + page
        + '&quartier=&rubrique_name=&rubrique_affiner=&region=&m_ru_n=&activ=&produit=';

    request.get(url, function(err, res, body) {
        if (err) {
            console.log('Error occured: ' + err);
        }
        else if (res.statusCode != 200) {
            console.log('Status code: ' + res.statusCode);
        }
        else {
            jsdom.env(body, ['http://localhost/jquery.js'], function(err, window) {
                if (err) {
                    console.log('Parsing error occured: ' + err);
                    return;
                }

                // Parse locations first
                var locations = {};
                var mapsScript = window.$('script + a + #pro_res_vignettes').prev().prev().html();
                var regex = /(?:\[+.*\/)([0-9]+)', ?([0-9\-.]+), ?([0-9\-.]+), ?(?:.*\]+)/g;

                var match = regex.exec(mapsScript);
                while (match) {
                    var id = match[1];
                    locations[id] = {
                        x: parseFloat(match[2]),
                        y: parseFloat(match[3])
                    };

                    match = regex.exec(mapsScript);
                }

                // Get doctors
                var emptyList = true;
                window.$('#engine-results article.drs').each(function(index) {
                    // Ignore the ones with no location?
                    // if (index >= locations.length) return;
                    var item = window.$(this);

                    var nameElem = item.find('h2[itemprop=name]');
                    var onclickAttr = nameElem.find('a').attr('onclick');
                    var regex = /(?:.+, ?')([0-9]+)(?:', ?.*)/g;
                    var id = regex.exec(onclickAttr)[1];
                    var location = locations[id] || {};
                    var doctor = {
                        id: id,
                        name: nameElem.find('a').find('span.badge').remove().end().text().trim(),
                        address: item.find('.results-adress').text().trim(),
                        tel: item.find('.tel').text().trim(),
                        x: location.x,
                        y: location.y
                    };
                    list.push(doctor);

                    emptyList = false;
                });


                // Move on to next or write file if finished
                if (emptyList) {
                    callback();
                }
                else {
                    console.log('[' + city + '][' + specialty + '] Page ' + page + ' done...');
                    getPage(city, specialty, page + 1, list, callback);
                }
            });
        }
    });
}
