var states = [
    {name: "Baden-Württemberg", inhabitants: 11100394, color: "#9e9ea2", hidden: true},
    {name: "Bayern", inhabitants: 13124737, color: "#9ac483", hidden: false},
    {name: "Berlin", inhabitants: 3669491, color: "#f5c8af", hidden: true},
    {name: "Brandenburg", inhabitants: 2521893, color: "#cad93f", hidden: true},
    {name: "Bremen", inhabitants: 681202, color: "#84d2f4", hidden: true},
    {name: "Hamburg", inhabitants: 1847253, color: "#e4b031", hidden: true},
    {name: "Hessen", inhabitants: 6288080, color: "#58595b", hidden: true},
    {name: "Mecklenburg-Vorpommern", inhabitants: 1608138, color: "#569d79", hidden: false},
    {name: "Niedersachsen", inhabitants: 7993608, color: "#569dd2", hidden: true},
    {name: "Nordrhein-Westfalen", inhabitants: 17947221, color: "#e57438", hidden: false},
    {name: "Rheinland-Pfalz", inhabitants: 4093903, color: "#48b24f", hidden: true},
    {name: "Saarland", inhabitants: 986887, color: "#50aed3", hidden: false},
    {name: "Sachsen", inhabitants: 4071971, color: "#3b3689", hidden: true},
    {name: "Sachsen-Anhalt", inhabitants: 2194782, color: "#d21f75", hidden: true},
    {name: "Schleswig-Holstein", inhabitants: 2903773, color: "#4770b3", hidden: true},
    {name: "Thüringen", inhabitants: 2133378, color: "#ff0000", hidden: true},
];
var germany_hidden = false;
var sum_inhabitants = 0;
for (state of states) {
    sum_inhabitants += state.inhabitants;
}

var vaccination_data;
var per_site_data = {};
var delivery_data = [];

var chart = null;

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
        "DE-BUND": 16,
        "DE-Betriebe": 16,
    };

    let lines = tsv_string.trim().split('\n');
    for (let line of lines.slice(1, lines.length)) {
        let values = line.split('\t');

        if (!(values[2] in state_to_index)) {
            console.log("Invalid state", values[2]);
            continue;
        }

        let data = {};
        data.date = new Date(values[0]);
        data.vaccine = values[1];
        data.state = state_to_index[values[2]];
        data.doses = parseInt(values[3]);

        delivery_data.push(data);
    }

    delivery_data.sort((delivery1, delivery2) => delivery1.date - delivery2.date);
}

function update_per_site_data(tsv_string) {
    let lines = tsv_string.trim().split('\n');
    for (let line of lines) {
        let values = line.split('\t');

        let date = values[0];
        let site = values[1];
        let dose_type = values[2];

        let dose_counts = [];
        for (let state_index in states) {
            dose_counts.push(parseInt(values[3 + parseInt(state_index)]));
        }

        if (!(date in per_site_data)) per_site_data[date] = {};
        if (!(site in per_site_data[date])) per_site_data[date][site] = {};
        per_site_data[date][site][dose_type] = dose_counts;
    }
}

var charts = {
    "doses_per_day": {
    },
    "total_doses": {
    },
    "inventory_range": {
        y_axis_ticks: {
            min: 0,
            max: 60,
        }
    },
    "inventory": {
    },
};

function draw_chart() {
    console.time("chart update");

    let chart_type = document.getElementById('select_chart').value;
    let only_vaccine = document.getElementById('select_vaccine').value;
    let dose_type = document.getElementById('select_dose_type').value;
    let site = document.getElementById('select_site').value;

    if (chart_type == "inventory_range" || chart_type == "inventory") {
        // There is no separate inventory for first/second doses
        // And we don't have reliable per-site delivery data

        dose_type = "";
        site = "";
        document.getElementById('select_dose_type').disabled = true;
        document.getElementById('select_site').disabled = true;
    } else {
        document.getElementById('select_dose_type').disabled = false;
        document.getElementById('select_site').disabled = false;
    }

    let delivered_doses = [];
    let next_delivery_index = 0;

    let chart_labels = [];
    let chart_datasets = [];

    for (state_index in states) {
        delivered_doses[state_index] = 0;

        let state = states[state_index];

        chart_datasets.push({
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

    delivered_doses[16] = 0;
    chart_datasets.push({
        label: "Deutschland",
        backgroundColor: "#000000",
        borderColor: "#000000",
        lineTension: 0,
        hidden: germany_hidden,
        fill: false,
        data: [],
    });

    // Last day of the week (Sunday) in which delivery data ends. Draw delivery-based charts up to this date.
    let delivery_data_end = new Date(delivery_data[delivery_data.length - 1].date);
    let day_of_week = (delivery_data_end.getDay() + 6) % 7; // 0 = Monday, 6 = Sunday
    delivery_data_end.setDate(delivery_data_end.getDate() - day_of_week + 6);
    delivery_data_end.setHours(23);

    date_loop:
    for (let date_str in vaccination_data) {
        let date = new Date(date_str);
        let previous_week_date = new Date(date_str);
        previous_week_date.setDate(previous_week_date.getDate() - 7);
        previous_week_date_str = previous_week_date.toISOString().substring(0, 10);

        if (next_delivery_index < delivery_data.length) {
            let next_delivery = delivery_data[next_delivery_index];

            while (next_delivery.date <= date) {
                if (only_vaccine == next_delivery.vaccine || only_vaccine == "") {
                    delivered_doses[next_delivery.state] += next_delivery.doses;
                }

                next_delivery_index++;

                if (next_delivery_index >= delivery_data.length) {
                    break;
                }
                next_delivery = delivery_data[next_delivery_index];
            }
        }

        let all_states_today_doses = null;
        let all_states_previous_week_doses = null;
        let all_states_available_doses = null;

        for (let state_index in states) {
            let state = states[state_index];
            let data_point = null;

            let today_doses = count_doses(date_str, state_index, only_vaccine, dose_type, site);
            if (today_doses != null) {
                all_states_today_doses += today_doses;
            } else {
                continue date_loop;
            }

            let previous_week_doses = count_doses(previous_week_date_str, state_index, only_vaccine, dose_type, site);
            if (previous_week_doses != null) {
                all_states_previous_week_doses += previous_week_doses;
            }

            let new_doses = today_doses - previous_week_doses;
            let available_doses = delivered_doses[state_index] - today_doses;
            all_states_available_doses += available_doses;

            if (chart_type == "doses_per_day") {
                if (previous_week_doses != null) {
                    data_point = (new_doses * 100) / (state.inhabitants * 7);
                }
            } else if (chart_type == "total_doses") {
                data_point = (today_doses * 100) / state.inhabitants;
            } else if (chart_type == "inventory_range") {
                if (previous_week_doses != null && date < delivery_data_end) {
                    let daily_doses = new_doses / 7;
                    data_point = available_doses / daily_doses;
                }
            } else if (chart_type == "inventory") {
                if (date < delivery_data_end) {
                    data_point = (available_doses * 100) / state.inhabitants;
                }
            }

            if (state_index == 0) {
                if (data_point != null) {
                    chart_labels.push(date);
                } else {
                    continue date_loop;
                }
            }

            chart_datasets[state_index].data.push(data_point);
        }

        // All of Germany: include federal deliveries and vaccinations,
        // as well as state-level deliveries and vaccinations
        let data_point = NaN;
        let federal_today_doses = count_doses(date_str, 16, only_vaccine, dose_type, site);
        let federal_previous_week_doses = count_doses(previous_week_date_str, 16, only_vaccine, dose_type, site);
        let federal_available_doses = delivered_doses[16] - federal_today_doses;

        let today_doses = federal_today_doses + all_states_today_doses;
        let previous_week_doses = federal_previous_week_doses + all_states_previous_week_doses;
        let available_doses = federal_available_doses + all_states_available_doses;

        let new_doses = today_doses - previous_week_doses;

        if (chart_type == "doses_per_day") {
            if (federal_previous_week_doses != null) {
                data_point = (new_doses * 100) / (sum_inhabitants * 7);
            }
        } else if (chart_type == "total_doses") {
            data_point = (today_doses * 100) / sum_inhabitants;
        } else if (chart_type == "inventory_range") {
            if (federal_previous_week_doses != null) {
                let daily_doses = new_doses / 7;
                data_point = available_doses / daily_doses;
            }
        } else if (chart_type == "inventory") {
            data_point = (available_doses * 100) / sum_inhabitants;
        }

        chart_datasets[16].data.push(data_point);
    }

    console.timeLog("chart update");

    if (chart != null) {
        chart.destroy();
    }

    let scale_end = new Date(delivery_data_end);
    scale_end.setDate(scale_end.getDate() + 8);
    let chart_options = {
        scales: {
            xAxes: [{
                type: 'time',
                time: {
                    unit: 'week',
                    isoWeekday: true,
                    tooltipFormat: 'dddd, DD.MM.YYYY',
                    displayFormats: {
                        day: 'DD.MM.',
                    },
                },
                ticks: {
                    max: scale_end,
                },
            }]
        },
        legend: {
            onClick: on_legend_click,
        }
    };

    if (charts[chart_type].y_axis_ticks) {
        chart_options.scales.yAxes = [{
            display: true,
            ticks: charts[chart_type].y_axis_ticks,
        }];
    }

    let ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chart_labels,
            datasets: chart_datasets,
        },
        options: chart_options,
    });

    console.timeEnd("chart update");
}

function count_doses(date_str, state_index, only_vaccine = "", dose_type = "", site = "") {
    if (!(date_str in vaccination_data)) {
        return null;
    }

    let vaccination_day_data = vaccination_data[date_str];
    let type = vaccination_day_data['type'];
    let result = 0;
    for (vaccine in vaccination_day_data['data']) {
        if (vaccine == only_vaccine || only_vaccine == "") {
            let vaccine_doses = vaccination_day_data['data'][vaccine];

            if (type == "nogp") { // always two doses
                if (site == "vaccination_centre" || site == "") {
                    if (dose_type == "first_dose" || dose_type == "") {
                        result += vaccine_doses[state_index * 2 + 0];
                    }
                    if (dose_type == "second_dose" || dose_type == "") {
                        result += vaccine_doses[state_index * 2 + 1];
                    }
                }
            } else if (type == "gp" && vaccine_doses.length == (16 + 1) * 2 * 2) { // two-dose vaccine
                if (dose_type == "first_dose" || dose_type == "") {
                    if (site == "vaccination_centre" || site == "") {
                        result += vaccine_doses[state_index * 4 + 0];
                    }
                    if (site == "doctors_office" || site == "") {
                        result += vaccine_doses[state_index * 4 + 1];
                    }
                }
                if (dose_type == "second_dose" || dose_type == "") {
                    if (site == "vaccination_centre" || site == "") {
                        result += vaccine_doses[state_index * 4 + 2];
                    }
                    if (site == "doctors_office" || site == "") {
                        result += vaccine_doses[state_index * 4 + 3];
                    }
                }
            } else if (type == "gp" && vaccine_doses.length == (16 + 1) * 2 && dose_type != "booster_dose") { // single dose vaccine
                if (site == "vaccination_centre" || site == "") {
                    result += vaccine_doses[state_index * 2 + 0];
                }
                if (site == "doctors_office" || site == "") {
                    result += vaccine_doses[state_index * 2 + 1];
                }
            } else if (type == "combined" && site == "" && vaccine_doses.length == (16 + 1) * 3) { // two-dose vaccine
                if (dose_type == "first_dose" || dose_type == "") {
                    result += vaccine_doses[state_index * 3 + 0];
                }
                if (dose_type == "second_dose" || dose_type == "") {
                    result += vaccine_doses[state_index * 3 + 1];
                }
                if (dose_type == "booster_dose" || dose_type == "") {
                    result += vaccine_doses[state_index * 3 + 2];
                }
            } else if (type == "combined" && site == "" && vaccine_doses.length == (16 + 1) * 2) { // single dose vaccine
                if (dose_type == "first_dose" || dose_type == "second_dose" || dose_type == "") {
                    result += vaccine_doses[state_index * 2 + 0];
                }
                if (dose_type == "booster_dose" || dose_type == "") {
                    result += vaccine_doses[state_index * 2 + 1];
                }
            } else if (type == "combined" && site != "" && only_vaccine == "" && date_str in per_site_data) {
                if (state_index == 16) {
                    break;
                }
                if (dose_type == "first_dose" || dose_type == "") {
                    result += per_site_data[date_str][site]['first_dose'][state_index];
                }
                if (dose_type == "second_dose" || dose_type == "") {
                    result += per_site_data[date_str][site]['second_dose'][state_index];
                }
                break;
            } else if (type == "combined" && site != "" && (only_vaccine != "" || !(date_str in per_site_data))) {
                return null;
            } else {
                console.log("Invalid count request!");
                return null;
            }
        }
    }
    return result;
}

function on_legend_click(e, legend_item) {
    let index = legend_item.datasetIndex;
    if (index < 16) {
        states[index].hidden = !states[index].hidden;
    } else {
        germany_hidden = !germany_hidden;
    }

    chart.getDatasetMeta(index).hidden = (index < 16) ?states[index].hidden :germany_hidden;
    chart.update();
}

function show_all() {
    germany_hidden = false;
    for (let index = 0; index <= 16; index++) {
        if (index < 16) states[index].hidden = false;

        chart.getDatasetMeta(index).hidden = (index < 16) ?states[index].hidden :germany_hidden;
        chart.update();
    }
}

let fetch_vaccination_data = fetch('./vaccination-data.json')
    .then(response => response.json())
    .then(update_vaccination_data);

let fetch_delivery_data = fetch('./germany_deliveries_timeseries_v2.tsv')
    .then(response => response.text())
    .then(update_delivery_data);

let fetch_expected_deliveries = fetch('./expected_deliveries.tsv')
    .then(response => response.text())
    .then(update_delivery_data);

let fetch_per_site_data = fetch('./vaccinations_per_site.tsv')
    .then(response => response.text())
    .then(update_per_site_data);

Promise.all([fetch_delivery_data, fetch_vaccination_data, fetch_expected_deliveries, fetch_per_site_data])
    .then(draw_chart);

document.getElementById('select_chart').addEventListener('change', draw_chart);
document.getElementById('select_vaccine').addEventListener('change', draw_chart);
document.getElementById('show_all').addEventListener('click', show_all);
document.getElementById('select_site').addEventListener('change', draw_chart);
document.getElementById('select_dose_type').addEventListener('change', draw_chart);
