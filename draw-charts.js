var states = [
    {name: "Baden-Württemberg", inhabitants: 11100394, color: "#9e9ea2", hidden: true},
    {name: "Bayern", inhabitants: 13124737, color: "#9ac483", hidden: false},
    {name: "Berlin", inhabitants: 3669491, color: "#f5c8af", hidden: true},
    {name: "Brandenburg", inhabitants: 2521893, color: "#cad93f", hidden: true},
    {name: "Bremen", inhabitants: 681202, color: "#84d2f4", hidden: false},
    {name: "Hamburg", inhabitants: 1847253, color: "#e4b031", hidden: true},
    {name: "Hessen", inhabitants: 6288080, color: "#58595b", hidden: true},
    {name: "Mecklenburg-Vorpommern", inhabitants: 1608138, color: "#569d79", hidden: false},
    {name: "Niedersachsen", inhabitants: 7993608, color: "#569dd2", hidden: true},
    {name: "Nordrhein-Westfalen", inhabitants: 17947221, color: "#e57438", hidden: false},
    {name: "Rheinland-Pfalz", inhabitants: 4093903, color: "#48b24f", hidden: true},
    {name: "Saarland", inhabitants: 986887, color: "#50aed3", hidden: true},
    {name: "Sachsen", inhabitants: 4071971, color: "#3b3689", hidden: true},
    {name: "Sachsen-Anhalt", inhabitants: 2194782, color: "#d21f75", hidden: true},
    {name: "Schleswig-Holstein", inhabitants: 2903773, color: "#4770b3", hidden: true},
    {name: "Thüringen", inhabitants: 2133378, color: "#ff0000", hidden: true},
];
var sum_inhabitants = 0;
for (state of states) {
    sum_inhabitants += state.inhabitants;
}

var vaccination_data;
var delivery_data = [];

var chart_doses_per_day = null;
var chart_good_for = null;
var chart_unused = null;

function update_vaccination_data(data) {
    vaccination_data = data;
}

function update_delivery_data(tsv_string) {
    const state_to_index = {
        "DE-BW": 0,
        "DE-BY": 1,
        "DE-BE": 2,
        "DE-BB": 3,
        "DE-HB": 4,
        "DE-HH": 5,
        "DE-HE": 6,
        "DE-MV": 7,
        "DE-NI": 8,
        "DE-NW": 9,
        "DE-RP": 10,
        "DE-SL": 11,
        "DE-SN": 12,
        "DE-ST": 13,
        "DE-SH": 14,
        "DE-TH": 15,
    };

    let lines = tsv_string.trim().split('\n');
    for (let line of lines.slice(1, lines.length)) {
        let values = line.split('\t');

        let data = {};
        data.date = values[0];
        data.vaccine = values[1];
        data.state = state_to_index[values[2]];
        data.doses = parseInt(values[3]);

        delivery_data.push(data);
    }
}

function draw_charts() {
    let only_vaccine = document.getElementById('select_vaccine').value;

    let delivered_doses = [];
    let next_delivery_index = 0;

    let datasets_doses_per_day = [];
    let datasets_good_for = [];
    let datasets_unused = [];

    for (state_index in states) {
        delivered_doses[state_index] = 0;

        let state = states[state_index];
        datasets_doses_per_day.push({
            label: state.name,
            backgroundColor: state.color,
            borderColor: state.color,
            borderWidth: 2,
            lineTension: 0,
            pointRadius: 1.5,
            pointHitRadius: 4,
            hidden: state.hidden,
            fill: false,
            data: [],
        });
        datasets_good_for.push({
            label: state.name,
            backgroundColor: state.color,
            borderColor: state.color,
            borderWidth: 2,
            lineTension: 0,
            pointRadius: 1.5,
            pointHitRadius: 4,
            hidden: state.hidden,
            fill: false,
            data: [],
        });
        datasets_unused.push({
            label: state.name,
            backgroundColor: state.color,
            borderColor: state.color,
            borderWidth: 2,
            lineTension: 0,
            pointRadius: 1.5,
            pointHitRadius: 4,
            hidden: state.hidden,
            fill: false,
            data: [],
        });
    }

    datasets_doses_per_day.push({
        label: "Deutschland",
        backgroundColor: "#000000",
        borderColor: "#000000",
        lineTension: 0,
        fill: false,
        data: [],
    });
    datasets_good_for.push({
        label: "Deutschland",
        backgroundColor: "#000000",
        borderColor: "#000000",
        lineTension: 0,
        fill: false,
        data: [],
    });
    datasets_unused.push({
        label: "Deutschland",
        backgroundColor: "#000000",
        borderColor: "#000000",
        lineTension: 0,
        fill: false,
        data: [],
    });

    let labels_doses_per_day = [];
    let labels_good_for = [];
    let labels_unused = [];

    for (let date_str in vaccination_data) {
        let date = new Date(date_str);
        let previous_week_date = new Date(date_str);
        previous_week_date.setDate(previous_week_date.getDate() - 7);
        previous_week_date_str = previous_week_date.toISOString().substring(0, 10);

        if (next_delivery_index < delivery_data.length) {
            let next_delivery = delivery_data[next_delivery_index];
            let next_delivery_date = new Date(next_delivery.date);
            while (next_delivery_date <= date) {
                if (only_vaccine == next_delivery.vaccine || only_vaccine == "") {
                    delivered_doses[next_delivery.state] += next_delivery.doses;
                }


                next_delivery_index++;

                if (next_delivery_index >= delivery_data.length) {
                    break;
                }
                next_delivery = delivery_data[next_delivery_index];
                next_delivery_date = new Date(next_delivery.date);
            }
        }

        if (previous_week_date_str in vaccination_data) {
            labels_doses_per_day.push(date);
            labels_good_for.push(date);
            labels_unused.push(date);
        }

        let sum_new_doses = 0;
        let sum_doses_available = 0;

        for (state_index in states) {
            let state = states[state_index];

            let total_doses = count_doses(vaccination_data[date_str], state_index, only_vaccine);

            if (previous_week_date_str in vaccination_data) {
                let previous_week_doses = count_doses(vaccination_data[previous_week_date_str], state_index, only_vaccine);
                let new_doses = total_doses - previous_week_doses;
                let daily_new_doses = new_doses / 7;
                let daily_new_doses_rate = (daily_new_doses * 100) / state.inhabitants;

                let doses_available = delivered_doses[state_index] - total_doses;
                let doses_good_for = doses_available / daily_new_doses;

                let doses_unused_rate = (doses_available * 100) / state.inhabitants;

                sum_new_doses += new_doses;
                sum_doses_available += doses_available;

                datasets_doses_per_day[state_index].data.push(daily_new_doses_rate);
                datasets_good_for[state_index].data.push(doses_good_for);
                datasets_unused[state_index].data.push(doses_unused_rate);
            }
        }

        if (previous_week_date_str in vaccination_data) {
            // Special "federal" vaccinations that are not registered with a state
            let federal_total_doses = count_doses(vaccination_data[date_str], 16, only_vaccine);
            let previous_week_federal_doses = count_doses(vaccination_data[previous_week_date_str], 16, only_vaccine);
            let federal_new_doses = federal_total_doses - previous_week_federal_doses;
            sum_doses_available -= federal_total_doses;

            // Calculations for all of Germany
            let daily_new_doses = (sum_new_doses + federal_new_doses) / 7;
            let daily_new_doses_rate = (daily_new_doses * 100) / sum_inhabitants;
            let doses_good_for = sum_doses_available / daily_new_doses;
            let doses_unused_rate = (sum_doses_available * 100) / sum_inhabitants;

            datasets_doses_per_day[datasets_doses_per_day.length - 1].data.push(daily_new_doses_rate);
            datasets_good_for[datasets_good_for.length - 1].data.push(doses_good_for);
            datasets_unused[datasets_unused.length - 1].data.push(doses_unused_rate);
        }
    }


    if (chart_doses_per_day != null) {
        chart_doses_per_day.destroy();
    }

    let ctx_doses_per_day = document.getElementById('chart_doses_per_day').getContext('2d');
    chart_doses_per_day = new Chart(ctx_doses_per_day, {
        type: 'line',
        data: {
            labels: labels_doses_per_day,
            datasets: datasets_doses_per_day,
        },
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        tooltipFormat: 'dddd, DD.MM.YYYY',
                        displayFormats: {
                            day: 'DD.MM.',
                        }
                    }
                }]
            },
        }
    });

    if (chart_good_for != null) {
        chart_good_for.destroy();
    }

    let ctx_good_for = document.getElementById('chart_good_for').getContext('2d');
    chart_good_for = new Chart(ctx_good_for, {
        type: 'line',
        data: {
            labels: labels_good_for,
            datasets: datasets_good_for,
        },
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        tooltipFormat: 'dddd, DD.MM.YYYY',
                        displayFormats: {
                            day: 'DD.MM.',
                        }
                    }
                }],
                yAxes: [{
                    display: true,
                    ticks: {
                        min: 0,
                        max: 60,
                    }
                }],
            },
        }
    });

    if (chart_unused != null) {
        chart_unused.destroy();
    }

    let ctx_unused = document.getElementById('chart_unused').getContext('2d');
    chart_unused = new Chart(ctx_unused, {
        type: 'line',
        data: {
            labels: labels_unused,
            datasets: datasets_unused,
        },
        options: {
            scales: {
                xAxes: [{
                    type: 'time',
                    time: {
                        tooltipFormat: 'dddd, DD.MM.YYYY',
                        displayFormats: {
                            day: 'DD.MM.',
                        }
                    }
                }],
            },
        }
    });
}

function count_doses(vaccination_day_data, state_index, only_vaccine) {
    let result = 0;
    for (vaccine in vaccination_day_data) {
        if (vaccine == only_vaccine || only_vaccine == "") {
            let vaccine_doses = vaccination_day_data[vaccine];
            result += vaccine_doses[state_index * 2] + vaccine_doses[state_index * 2 + 1];
        }
    }
    return result;
}

let fetch_vaccination_data = fetch('./vaccination-data.json')
    .then(response => response.json())
    .then(update_vaccination_data);

let fetch_delivery_data = fetch('./germany_deliveries_timeseries_v2.tsv')
    .then(response => response.text())
    .then(update_delivery_data);

Promise.all([fetch_delivery_data, fetch_vaccination_data])
    .then(draw_charts);

document.getElementById('select_vaccine').addEventListener('change', draw_charts);