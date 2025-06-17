//ESWA: To conform to the comments of the reviewers, I will perform several changes that will affect how the algorithm works
//I've marked the changes necessary with a CHANGE tag. 


//CHANGE: core_hardware_consumption_matrix should not be necessary any longer
var core_hardware_consumption_matrix = [['CPU_usage', 'CPU'], ['RAM_usage', 'RAM'], ['storage_usage', 'Storage'], ['network_usage', 'Network']];
var profile_bcs = {};

var report_errors = [];
var report_highlights = [];
var report = [];
let monitoring = true;
function monitor(message) {
    if (monitoring) {
        console.log("Monitoring: " + message);
    }

}

function fetchProfileBehavioralProperties(profile) {
    //console.log("test test");
    if (profile == null) {
        profile = this.available_parents;
    }
    let computation_centric = Object.entries(profile[1][1]);
    let data_centric = Object.entries(profile[2][1]);
    let conduct_centric = Object.entries(profile[3][1]);

    let a = [computation_centric, data_centric, conduct_centric];

    a.forEach(category => {

        category.forEach(element => {
            profile_bcs[element[0]] = element[1];
            //console.log("fetchProfileBcs: " + element[0] + " and " + element[1]);
        });
    });
    // Now that we have all the properties per categorie in a json, we can proceed and generate the highlights based on the users' selection
   Object.entries(profile_bcs).forEach(property=>{
    //property[0] is the name of the property, property[1] is the value
    let highlight = getAdvice(property[0],property[1],report_errors);
    if(highlight!=null){
        report_highlights.push(highlight);
    }
    
   });

}

class HardwareConsumption {
    constructor() {
        this.Cc = 0;
        this.Ca = 0;
        this.Rc = 0;
        this.Ra = 0;
        this.Nc = 0;
        this.Na = 0;
        this.Sc = 0;
        this.Sa = 0;
        this.Camera = '';
        this.camera_weight = '';
        this.Bluetooth = '';
        this.Bluetooth_weight = '';
        this.WIFI_usage = '';
        this.WIFI_usage_weight = '';
        this.GPS = '';
        this.GPS_weight = '';
        this.Screen_brightness = '';
        this.Screen_brightness_weight = '';
        this.cpuWeight = 0.3;//this weight is heavier because CPU consumes the battery AND generates residual heat
        this.ramWeight = 0.1;// this weight does not matter a lot because it is a constant source of consumption (the wattage required to keep ram is constant)
        this.netWeight = 0.5;// this weight is heavier because network consumes locally and remotely!
        this.storWeight = 0.1;
        //we get the qualitative consumption for each element from the profile and the quantitative consumption from the taxonomic guide
        this.HcS = '';
        this.SCS = '';
        this.BCS = '';//NOTE: THE PROPERTIES FOR THE BCS RELATED TO THE OPERATION ARE FETCHED INSIDE OF getRelativeConsumption()
        this.Ocs = '';


    }
    
    selfRateHcs(self) {

        this.HcS = (this.Cc / this.Ca * this.cpuWeight + this.Rc / this.Ra * this.ramWeight + this.Nc / this.Na * this.netWeight + this.Sc / this.Sa * this.storWeight) * 100;
        monitor("HCS score: " + this.HcS);
    }
    selfRateScs(self) {
        //we have to be sure that the sensorial consumption score has all the parameters filled in with a value, otherwise we should not assess it.
        console.log(JSON.stringify(self));
        if (this.Bluetooth == '' || this.Camera == '' || this.GPS == '' || this.WIFI_usage == '') {
            report_errors.push({ type: "error", sentimient: "negative", message: "There was an issue while calculating the Sensor Consumption Score: not all the sensors have a value assigned. The final rating is invalid.", algorithmic_category: "Scs", target_operation: self.operation_id, references: "None" });

        } else {
            let value_tabulator = {absent:0, on: 1, off: 0, circumstancial: 0.5 };
            let screen_brightness_tabulator = { unused: '', off: 0, low: 0.04, medium: 0.06, high: 0.1, auto: 0.05 };
            console.log("Bluetooth:", this.Bluetooth, "→", value_tabulator[this.Bluetooth]);
        console.log("GPS:", this.GPS, "→", value_tabulator[this.GPS]);
        console.log("Camera:", this.Camera, "→", value_tabulator[this.Camera]);
        console.log("Screen_brightness:", this.Screen_brightness, "→", screen_brightness_tabulator[this.Screen_brightness]);
            monitor("Values: " + value_tabulator[this.Bluetooth]);
            this.SCS = (value_tabulator[this.Bluetooth] * this.Bluetooth_weight + value_tabulator[this.GPS] * this.GPS_weight + value_tabulator[this.Camera] * this.camera_weight + screen_brightness_tabulator[this.Screen_brightness]) * 100;
            monitor("SCS score: " + this.SCS);
        }

    }

    selfRateBcs(self) {
        //code trace: 46fd570634
        let guide = JSON.parse('{"properties":[{"property":"task_distribution","possible_values":[{"value":"centralized","score":0.5},{"value":"decentralized","score":1}]},{"property":"computational_criticality","possible_values":[{"value":"low","score":0.3},{"value":"medium","score":0.6},{"value":"high","score":1}]},{"property":"computation_complexity","possible_values":[{"value":"low","score":0.3},{"value":"medium","score":0.6},{"value":"high","score":1}]},{"property":"distribution_strategy","possible_values":[{"value":"true","score":0},{"value":"false","score":1}]},{"property":"consumption_rate","possible_values":[{"value":"definite","score":0},{"value":"indefinite","score":0.1}]},{"property":"data_flow_behavior","possible_values":[{"value":"regular","score":0.8},{"value":"irregular","score":0.4}]},{"property":"data_flow_direction","possible_values":[{"value":"unidirectional","score":0.5},{"value":"bidirectional","score":1}]},{"property":"data_handling","possible_values":[{"value":"keep","score":0.5},{"value":"destroy","score":0},{"value":"store and broadcast","score":0.5}]},{"property":"access_frequency","possible_values":[{"value":"regular","score":0},{"value":"irregular","score":0.5}]},{"property":"depth","possible_values":[{"value":"foreground","score":0.5},{"value":"background","score":0}]},{"property":"dependence","possible_values":[{"value":"dependee","score":0.5},{"value":"dependent","score":0.5},{"value":"independent","score":0}]}]}');

        //we have to be really careful here because the values of the operations override the values of the profile.
        //if the value of an operation is empty, we use the profile, otherwise we override it with that of the operation
        //the easiest way to make this is to override the values from the beginning
        let profile_bcs_copy = JSON.parse(JSON.stringify(profile_bcs));
        //console.log(JSON.stringify(profile_bcs_copy));
        Object.entries(profile_bcs_copy).forEach(element => {
            //console.log(self);
            if (self.hasOwnProperty('operation_' + element[0])) {
                profile_bcs_copy[element[0]] = self['operation_' + element[0]];

            }
        });


        for (let x in guide.properties) {
            let element = guide.properties[x].property;
            //console.log("Checking the guide score for property: "+element);
            if (profile_bcs_copy.hasOwnProperty(guide.properties[x].property)) {

                //console.log("Property match");
                //we now look for the actual quantitative value
                for (let y in guide.properties[x].possible_values) {
                    let guide_value = guide.properties[x].possible_values[y].value;
                    if (profile_bcs_copy[element] == '') {
                        //report_highlights.push({ type: "error", sentimient: "negative", message: "Property "+element+" has no value.", algorithmic_category: "", target_operation: self.operation_id, references: "None" });
                    }
                    else if (guide_value == profile_bcs_copy[element]) {
                        profile_bcs_copy[element] = guide.properties[x].possible_values[y].score;
                        //console.log("Score for property: "+element+" with original value: "+guide_value+" is: "+guide.properties[x].possible_values[y].score);
                    }
                }
            }
        }

        //now we sum the score of each property
        var sum = 0.0;
        Object.entries(profile_bcs_copy).forEach(element => {
            //be careful here as strings would disrupt the sum.
            if(typeof profile_bcs_copy[element[0]] != 'number'){
                report_errors.push({ type: "error", sentimient: "negative", message: "There was an issue while calculating the Behavior Consumption Score: the property "+element[0]+" did not recieve an appropiate score, resulting in a STRING value instead of a NUMBER. The final rating of the Bcs invalid. Please check that the name and value in the configuration of your profile matches the ones in the algorithmic equivalence in the code of the algorithm. [code trace: 46fd570634]", algorithmic_category: "Scs", target_operation: self.operation_id, references: "None" });
                //console.log("REPORT ERRORS: "+report_errors);
            }else{
                //console.log("BCS sum: " + Number(sum) + " " + typeof sum + " adding: " + profile_bcs_copy[element[0]] + " type: " + typeof profile_bcs_copy[element[0]] +" value: "+ profile_bcs_copy[element[0]]+" what property? "+element[0]);
            sum += Number(profile_bcs_copy[element[0]]);

            }
            

        });

        this.BCS = sum;

    }

    selfOCS() {
        this.Ocs = this.BCS + this.SCS + this.HcS;
    }
}
var test_sequence;
var timing_diagram = '';

function initTimingDiagram(root_profile) {

    let profile;
    if (root_profile == null || root_profile == '') {
        profile = this.available_parents;
    } else {
        profile = root_profile;
    }

    //we initialize all the operations as robust
    let init = '\n <style>\n    timingDiagram {\n      .red {\n        LineColor red\n      }\n      .blue {\n        LineColor blue\n        LineThickness 3\n      }\n    }\n</style>\n scale 1 as 200 pixels';
    timing_diagram += init;
    let operations = profile[findPlaceByParentName('Operations', profile)][4];

    for (let x in operations) {
        timing_diagram += '\nrobust "' + operations[x].Name + '" as ' + operations[x].Name.split(' ').join('') + ' <' + '<' + 'blue' + '>' + '>';
    }

    timing_diagram += '\n @0';
    for (let x in operations) {
        timing_diagram += '\n' + operations[x].Name.split(' ').join('') + ' is Off';
    }
}


function getAlgoComponents() {

    //we get the operational pathways of the profile in order to define what operations to rate in each step and how
    var sequencer = [];
    //do not use the cache of this.element_to_edit.profile_cache as it will evaluate over the older cache, use this.available_parents instead.
    getProfileOperationalPathways(this.available_parents, sequencer, 0);
    //console.log("Algo: sequencer: "+JSON.stringify(sequencer));
    console.log("SEQUENCE: "+JSON.stringify(sequencer));
    // We create a hardware consumption guide with the availability:
    let hardwareConsumption = new HardwareConsumption();

    //CHANGE: set the hardware availability to what the hardware consumption guide has as an option
        //Note: a screen for either inputting manual variables or selecting a specific device in the taxonomical consumption guide or performing sensitivity testing must be added
    //we set the hardware availability to whatever we want
    hardwareConsumption.Ca = 1.6;
    hardwareConsumption.Ra = 16;
    hardwareConsumption.Na = 2400;
    hardwareConsumption.Sa = 256;
    //We assign the weights here
    //CHANGE: Add this to the screen and allow the user to configure the weights to their preferences
    hardwareConsumption.camera_weight = 0.1;
    hardwareConsumption.Bluetooth_weight = 0.35;
    hardwareConsumption.WIFI_usage_weight = 0.35;
    hardwareConsumption.GPS_weight = 0.2;


    var sequencer_consumption = [];
    for (let x in sequencer) {
        sequencer_consumption.push(rateStep(sequencer[x], x, hardwareConsumption));
    }

    //we now calculate the final rating for each step by invoking the rateSelf for each of the hardware consumption instances in the sequencer ratings per step
    for (let x in sequencer_consumption) {
        //we enter each step
        for (let y in sequencer_consumption[x]) {
            let instance = sequencer_consumption[x][y];
            monitor("Instance: " + JSON.stringify(instance));
            monitor("Sequencer: " + JSON.stringify(sequencer));
            console.log("instance type:", instance.constructor.name);
            console.log(typeof instance.selfRateScs);
            instance.selfRateHcs();
            instance.selfRateScs(instance);//I am passing the instance so that I can access the operation id (it is a hack to make my life easier).
            instance.selfRateBcs(instance);
            instance.selfOCS();
        }

    }
    //console.log("ALGO SEQUENCER CONSUMPTION: " + JSON.stringify(sequencer_consumption));


    let step_ratings = [];//the average rating for each step, we take the mean from the instance's HcS

    for (let x in sequencer_consumption) {
        //we enter each step
        let avg_rating = 0;
        let sum = 0;
        for (let y in sequencer_consumption[x]) {
            let instance = sequencer_consumption[x][y];
            sum += instance.Ocs;
        }
        avg_rating = sum / sequencer_consumption[x].length;
        step_ratings.push(avg_rating);
    }

    console.log("Step ratings: " + JSON.stringify(step_ratings));

    for (let x in sequencer) {//here x is the step
        timing_diagram += sequencer[x].description;
    }

    //we add the rating background color to the timing diagram
    let background_descriptions = '';

    //THE COLORS ARE TAKEN FROM WIKIPEDIA: https://en.wikipedia.org/wiki/European_Union_energy_label (washing machines)
    timing_diagram += '\n';

    for (let x in step_ratings) {

        //we set the color selection
        console.log("Labeling score: " + step_ratings[x]);
        let label = getCategoryAccordingToTaxonomy(step_ratings[x]);
        background_descriptions += 'highlight ' + (Number(x) + 1) + ' to ' + (Number(x) + 2) + ' ' + label.color + ' : ' + label.label + '\n';

    }

    timing_diagram += background_descriptions;

    //we store the highest and the lowest scores in the profie data so that we can use them later
    let highest = 0;
    for (let x in sequencer_consumption) {

        for (let y in sequencer_consumption[x]) {
            let instance = sequencer_consumption[x][y];
            if (instance.Ocs > highest) {
                highest = instance.Ocs;
            }
        }

    }

    let lowest = 100;
    for (let x in sequencer_consumption) {

        for (let y in sequencer_consumption[x]) {
            let instance = sequencer_consumption[x][y];
            if (instance.Ocs < lowest) {
                lowest = instance.Ocs;
            }
        }

    }

    let db_profile_index = findProfilePlaceInStorage('profile', this.element_to_edit.element_id);
    if (this.db.profile_Array[db_profile_index].hasOwnProperty("lowest_cs")) {
        this.db.profile_Array[db_profile_index].lowest_cs = lowest;
        this.db.profile_Array[db_profile_index].highest_cs = highest;
    } else {
        this.db.profile_Array[db_profile_index]["lowest_cs"] = lowest;
        this.db.profile_Array[db_profile_index]["highest_cs"] = highest;
    }
}


function rateStep(step, step_index, hardwareGuideline) {

    //console.log("%c rateStep: rating step: " + step_index, 'background-color: white;color:blue');
    let newConsumption;

    let step_consumption = [];
    //------------by state operations---------
    for (let x in step.by_state) {
        if (step.by_state[x] != null) {
            newConsumption = new HardwareConsumption();
            Object.assign(newConsumption, hardwareGuideline);

            let consumption = getRelativeConsumption(step.by_state[x], newConsumption);

            //we assign to the operation its consumption value..
            findInstanceInStorage(findPlaceByParentName('Operations', this.available_parents), step.by_state[x])['last_HCS'] = consumption;

            step_consumption.push(consumption);
        }
    }
    //------------by parameter operations-----

    for (let x in step.by_parameter) {
        if (step.by_parameter[x] != null) {
            newConsumption = new HardwareConsumption();
            Object.assign(newConsumption, hardwareGuideline);
            let consumption = getRelativeConsumption(step.by_parameter[x], newConsumption);
            //we assign to the operation its consumption value..
            findInstanceInStorage(findPlaceByParentName('Operations', this.available_parents), step.by_parameter[x])['last_HCS'] = consumption;

            step_consumption.push(consumption);
        }
    }
    //------------by operation----------------

    for (let x in step.by_operations) {
        if (step.by_operations[x] != null) {
            newConsumption = new HardwareConsumption();
            Object.assign(newConsumption, hardwareGuideline);
            let consumption = getRelativeConsumption(step.by_operations[x], newConsumption);
            //we assign to the operation its consumption value..
            findInstanceInStorage(findPlaceByParentName('Operations', this.available_parents), step.by_operations[x])['last_HCS'] = consumption;

            step_consumption.push(consumption);
        }
    }

    //console.log("Step " + x + " consumption data: " + JSON.stringify(step_consumption));

    return step_consumption;


    function getRelativeConsumption(operation_id, newConsumption) {

        //console.log("%cgetRelativeConsumption: fetching the relative consumption for: " + operation_id, 'background-color:white;color:red');
        let profile = this.available_parents;
        let consumption_guide_index = findProfilePlaceInStorage('profile', this.element_to_edit.consumption_guide);
        let consumption_guide_unparsed = db.profile_Array[consumption_guide_index];
        let consumption_guide_parsed = JSON.parse(db.profile_Array[consumption_guide_index].profile_cache);
        let software_category = profile[0][1].software_category;
        let software_type = profile[0][1].software_type;
        let hardware_platform = profile[0][1].hardware_platform;
        let operation_instance = findInstanceInStorage(findPlaceByParentName('Operations', profile), operation_id);
        let sensor_usage_instance = findInstanceInStorage(findPlaceByParentName('Operations', profile), operation_id);
        //console.log("SENSOR USAGE INSTANCE: "+JSON.stringify(sensor_usage_instance));
        console.log("Hardware USAGE INSTANCE: "+JSON.stringify(sensor_usage_instance));
        let proportion = 3;
        //-----------CPU RELATIVE CONSUMPTION-------------
        //1 is the index of the resource usage

        let qualitative_value = operation_instance.inner_variables[1].variables.CPU_usage;
        let quantitative_value;

        newConsumption.Cc = getValueByConsumptionGuide(operation_id, software_category, software_type, hardware_platform, qualitative_value, 'CPU_usage');
        if(Number(qualitative_value)||Number(qualitative_value)==0){
            newConsumption.Cc = Number(qualitative_value);   
            console.info("Cc for "+operation_id+" is ->"+newConsumption.Cc+"<- No qualitative value found for translation.");
         
        }else{
        if (qualitative_value == 'low') {
            newConsumption.Cc = newConsumption.Cc / proportion;
        } else if (qualitative_value == 'medium') {
            newConsumption.Cc = (newConsumption.Cc / proportion) * 2;
        }
        }

        //-------------RAM RELATIVE CONSUMPTION-----------

        qualitative_value = operation_instance.inner_variables[1].variables.RAM_usage;
        quantitative_value = '';

        newConsumption.Rc = getValueByConsumptionGuide(operation_id, software_category, software_type, hardware_platform, qualitative_value, 'RAM_usage');
        console.log("SC: "+qualitative_value+" and "+Number(qualitative_value));
        if(Number(qualitative_value)||Number(qualitative_value)==0){
            newConsumption.Rc = Number(qualitative_value);   
            console.info("Rc for "+operation_id+" is ->"+newConsumption.Rc+"<- No qualitative value found for translation.");
         
        }else{
        if (qualitative_value == 'low') {
            newConsumption.Rc = newConsumption.Rc / proportion;
        } else if (qualitative_value == 'medium') {
            newConsumption.Rc = (newConsumption.Rc / proportion) * 2;
        }
        }

        //---------------Storage Relative consumption------------ 

        qualitative_value = operation_instance.inner_variables[1].variables.storage_usage;
        quantitative_value = '';


        newConsumption.Sc = getValueByConsumptionGuide(operation_id, software_category, software_type, hardware_platform, qualitative_value, 'storage_usage');
        console.log("SC: "+qualitative_value+" and "+Number(qualitative_value));
        if(Number(qualitative_value)||Number(qualitative_value)==0){
            newConsumption.Sc = Number(qualitative_value);   
            console.info("Sc for "+operation_id+" is ->"+newConsumption.Sc+"<- No qualitative value found for translation.");
         
        }else{
        if (qualitative_value == 'low') {
            newConsumption.Sc = newConsumption.Sc / proportion;
        } else if (qualitative_value == 'medium') {
            newConsumption.Sc = (newConsumption.Sc / proportion) * 2;
        }
    }
        //---------------Network Relative consumption------------ 

        qualitative_value = operation_instance.inner_variables[1].variables.network_usage;
        quantitative_value = '';
        relative_consumption = '';
        newConsumption.Nc = getValueByConsumptionGuide(operation_id, software_category, software_type, hardware_platform, qualitative_value, 'network_usage');
        if(Number(qualitative_value)||Number(qualitative_value)==0){
            newConsumption.Nc = Number(qualitative_value);   
            console.info("Nc for "+operation_id+" is ->"+newConsumption.Nc+"<- No qualitative value found for translation.");
         
        }else{
        if (qualitative_value == 'low') {
            newConsumption.Nc = newConsumption.Nc / proportion;
        } else if (qualitative_value == 'medium') {
            newConsumption.Nc = (newConsumption.Nc / proportion) * 2;
        }
    }
        //------We get the rest of the sensors---------
        newConsumption.GPS = sensor_usage_instance.inner_variables[1].variables.GPS;
        newConsumption.Bluetooth = sensor_usage_instance.inner_variables[1].variables.Bluetooth;
        newConsumption.Camera = sensor_usage_instance.inner_variables[1].variables.Camera;
        newConsumption.Screen_brightness = sensor_usage_instance.inner_variables[1].variables.Screen_brightness;
        newConsumption.WIFI_usage = sensor_usage_instance.inner_variables[1].variables.WIFI_usage;
        //console.log("JSON: " + JSON.stringify(newConsumption));
        //------WE GET THE VALUES FOR THE BBCP PROPERTIES OF THE OPERATIONS--------
        newConsumption.operation_data_handling = operation_instance.inner_variables[0].variables.operation_data_handling;
        newConsumption.operation_depth = operation_instance.inner_variables[0].variables.operation_depth;
        newConsumption.operation_task_distribution = operation_instance.inner_variables[0].variables.operation_task_distribution;
        newConsumption.operation_id = operation_id;

        //we return the object with all the data for the operation
        return newConsumption;

    }

    function getValueByConsumptionGuide(operation_id, software_category, software_type, hardware_platform, qualitative_value, hardware_component) {

        let consumption_guide_index = findProfilePlaceInStorage('profile', this.element_to_edit.consumption_guide);
        let consumption_guide_unparsed = db.profile_Array[consumption_guide_index];
        let consumption_guide_parsed = JSON.parse(db.profile_Array[consumption_guide_index].profile_cache);
        let quantitative_value;
        if (qualitative_value == '') {
            return 0;
        }
        if (typeof qualitative_value == "string" || typeof qualitative_value == null) {
            //we get the quantitative value from the consumption guide
            //console.log("getRelativeConsumtion: The stored value is qualitative, converting to quantitative");
            //1- get the valid consumption guide according to the software category, the software type and the hardware platform
            if (software_type == '') {
                //there is no software type selection, therefore we have to look in the parent category
                //3 is the 'consumption' parent for the category, 4 is the instances
                let consumption_guide_instances = consumption_guide_parsed[3][4];
                let selected_consumption_guide_index;
                for (let x in consumption_guide_instances) {
                    if (consumption_guide_instances[x].parent_instance_id == software_category && consumption_guide_instances[x].inner_id == hardware_platform) {
                        selected_consumption_guide_index = consumption_guide_instances[x];
                    }
                }

                //now that we have the index of the consumption, we have to match the operation hardware consumption values to the values of the index
                let matrix_name = findInCoreHardwareComponentMatrix(hardware_component);

                let inner_variables = selected_consumption_guide_index.inner_variables

                //we fetch the object in the inner variables that matches the matrix_name
                let inner_variables_index = '';
                for (let x in inner_variables) {
                    if (inner_variables[x].name == matrix_name) {
                        inner_variables_index = x;
                        break;
                    }

                }

                return inner_variables[inner_variables_index].variables[qualitative_value];

            } else {
                //there is a selection of a software type, therefore the consumption comes from that sub-category
                //there is no software type selection, therefore we have to look in the parent category
                //9 is the 'consumption' parent for the software type, 4 is the instances
                let consumption_guide_instances = consumption_guide_parsed[9][4];
                let selected_consumption_guide_index;
                for (let x in consumption_guide_instances) {
                    if (consumption_guide_instances[x].parent_instance_id == software_type && consumption_guide_instances[x].inner_id == hardware_platform) {
                        selected_consumption_guide_index = consumption_guide_instances[x];
                    }
                }

                //now that we have the index of the consumption, we have to match the operation hardware consumption values to the values of the index
                let matrix_name = findInCoreHardwareComponentMatrix(hardware_component);

                let inner_variables = selected_consumption_guide_index.inner_variables

                //we fetch the object in the inner variables that matches the matrix_name
                let inner_variables_index = '';
                for (let x in inner_variables) {
                    if (inner_variables[x].name == matrix_name) {
                        inner_variables_index = x;
                        break;
                    }

                }

                return inner_variables[inner_variables_index].variables[qualitative_value];



            }


        } else {
            //the value is not a string, it is set to a number, probably by an advanced user
            console.log("%cgetRelativeConsumption: The stored value is already quantiative", 'color:red;');
            quantitative_value = qualitative_value;
            return quantitative_value;
        }
    }

    function findInCoreHardwareComponentMatrix(profile_component_name) {

        for (let x in core_hardware_consumption_matrix) {
            //console.log("checking "+profile_component_name+' against '+core_hardware_consumption_matrix[x][0]);
            if (core_hardware_consumption_matrix[x][0] == profile_component_name) {
                let matrix_equivalence_name = core_hardware_consumption_matrix[x][1];
                //console.log("Returning name equivalence: "+matrix_equivalence);
                //we now have to get the correct object within inner_variables
                return matrix_equivalence_name;
            }
        }

        return profile_component_name;


    }

}

function getCategoryAccordingToTaxonomy(score) {

    let label = '';
    let color = '';
    if (score < 20) {
        label = 'A';
    } else if (score >= 20 && score < 30) {
        label = 'B';
    } else if (score >= 30 && score < 40) {
        label = 'C';
    } else if (score >= 40 && score < 50) {
        label = 'D';
    } else if (score >= 50 && score < 60) {
        label = 'E';
    } else if (score >= 60 && score < 70) {
        label = 'F';

        
    } else if (score >= 70) {
        label = 'G';
    }

    if (label == 'A') {
        color = '#33a357';
    }
    if (label == 'B') {
        color = '#79b752';
    }
    if (label == 'C') {
        color = '#c3d545';
    }
    if (label == 'D') {
        color = '#fff12c';
    }
    if (label == 'E') {
        color = '#edb731';
    }
    if (label == 'F') {
        color = '#d66f2c';
    }
    if (label == 'G') {
        color = '#cc232a';
    }

    let final_label = new Object();
    final_label.label = label;
    final_label.color = color;
    return final_label;
}


//lets open the general traits..


function getSubSetVariables(name) {
    let place = findPlaceByParentName(name, this.available_parents);
    return this.available_parents[place][1];
}

initTimingDiagram();
//-------Generate the ratings-------------
//we get the Ocs for each operation in a step: 
fetchProfileBehavioralProperties(this.available_parents);
getAlgoComponents();
//let taxonomic_label = getCategoryAccordingToTaxonomy(taxonomic_rating);

//-------Generate the timing diagram-------
timing_diagram += '';
console.log("Timing diagram generated by the algorithm: " + timing_diagram);
this.db.timing_diagram = timing_diagram;
updateLocalStorage();
//the following line updates the memory of the builder to keep it up to date with the data generated by the algorithm
//this.setBuilderSelection('profile',this.element_to_edit.element_id);
//the following line updates the diagrams by making a request to plantuml url
reasonerPlantumlDiagram();
console.log("Report highlights: " + JSON.stringify(report_errors));
console.log("Report: " + report);
//----- Guide the user to new things in the UI -------
//the next line is used to highlight elements in the UI by adding a green shadow to them
document.getElementById('_' + findPlaceByParentName('Operations', this.available_parents) + '_parent_header').parentElement.classList.add('attention');
//the next line refreshes the operations list so that it gets updated with the latest labels.
populateChildren(findPlaceByParentName('Operations', this.available_parents), null, null, true, true);
//window.open('./timing_preview.html');
showReport(report_errors,report_highlights);

