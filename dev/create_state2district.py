import json 

import json

with open('/Users/surya/Desktop/toy_projects/spice-routes/public/india.json', 'r') as f:
    data = json.load(f)

state2district_list = {}

districts_objects = data['objects']['districts']["geometries"]

for district in districts_objects:
    try:
        district_name = district['properties']['district'] 
        # district_code = district['properties']['dt_code']
        state_name = district['properties']['st_nm']
        state_code = district['properties']['st_code']

        if state_name not in state2district_list:
            state2district_list[state_name] = []

        state2district_list[state_name].append(district_name)
        print(f"{district_name} {state_name}, {state_code}")
    except:
        continue

with open('/Users/surya/Desktop/toy_projects/spice-routes/public/state2district_list.json', 'w') as f:
    json.dump(state2district_list, f)