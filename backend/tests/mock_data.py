"""
Mock data for F1 Dashboard when OpenF1 API is unavailable
"""

# 2024 F1 Drivers (as fallback data)
MOCK_DRIVERS = [
    {
        "driver_number": 1,
        "full_name": "Max Verstappen",
        "name_acronym": "VER",
        "team_name": "Red Bull Racing",
        "team_colour": "3671C6",
        "country_code": "NED"
    },
    {
        "driver_number": 11,
        "full_name": "Sergio Perez",
        "name_acronym": "PER",
        "team_name": "Red Bull Racing",
        "team_colour": "3671C6",
        "country_code": "MEX"
    },
    {
        "driver_number": 44,
        "full_name": "Lewis Hamilton",
        "name_acronym": "HAM",
        "team_name": "Mercedes",
        "team_colour": "27F4D2",
        "country_code": "GBR"
    },
    {
        "driver_number": 63,
        "full_name": "George Russell",
        "name_acronym": "RUS",
        "team_name": "Mercedes",
        "team_colour": "27F4D2",
        "country_code": "GBR"
    },
    {
        "driver_number": 16,
        "full_name": "Charles Leclerc",
        "name_acronym": "LEC",
        "team_name": "Ferrari",
        "team_colour": "E80020",
        "country_code": "MON"
    },
    {
        "driver_number": 55,
        "full_name": "Carlos Sainz",
        "name_acronym": "SAI",
        "team_name": "Ferrari",
        "team_colour": "E80020",
        "country_code": "ESP"
    },
    {
        "driver_number": 4,
        "full_name": "Lando Norris",
        "name_acronym": "NOR",
        "team_name": "McLaren",
        "team_colour": "FF8000",
        "country_code": "GBR"
    },
    {
        "driver_number": 81,
        "full_name": "Oscar Piastri",
        "name_acronym": "PIA",
        "team_name": "McLaren",
        "team_colour": "FF8000",
        "country_code": "AUS"
    },
    {
        "driver_number": 14,
        "full_name": "Fernando Alonso",
        "name_acronym": "ALO",
        "team_name": "Aston Martin",
        "team_colour": "229971",
        "country_code": "ESP"
    },
    {
        "driver_number": 18,
        "full_name": "Lance Stroll",
        "name_acronym": "STR",
        "team_name": "Aston Martin",
        "team_colour": "229971",
        "country_code": "CAN"
    },
    {
        "driver_number": 10,
        "full_name": "Pierre Gasly",
        "name_acronym": "GAS",
        "team_name": "Alpine",
        "team_colour": "FF87BC",
        "country_code": "FRA"
    },
    {
        "driver_number": 31,
        "full_name": "Esteban Ocon",
        "name_acronym": "OCO",
        "team_name": "Alpine",
        "team_colour": "FF87BC",
        "country_code": "FRA"
    },
    {
        "driver_number": 23,
        "full_name": "Alexander Albon",
        "name_acronym": "ALB",
        "team_name": "Williams",
        "team_colour": "64C4FF",
        "country_code": "THA"
    },
    {
        "driver_number": 2,
        "full_name": "Logan Sargeant",
        "name_acronym": "SAR",
        "team_name": "Williams",
        "team_colour": "64C4FF",
        "country_code": "USA"
    },
    {
        "driver_number": 27,
        "full_name": "Nico Hulkenberg",
        "name_acronym": "HUL",
        "team_name": "Haas F1 Team",
        "team_colour": "B6BABD",
        "country_code": "GER"
    },
    {
        "driver_number": 20,
        "full_name": "Kevin Magnussen",
        "name_acronym": "MAG",
        "team_name": "Haas F1 Team",
        "team_colour": "B6BABD",
        "country_code": "DEN"
    },
    {
        "driver_number": 22,
        "full_name": "Yuki Tsunoda",
        "name_acronym": "TSU",
        "team_name": "RB",
        "team_colour": "6692FF",
        "country_code": "JPN"
    },
    {
        "driver_number": 3,
        "full_name": "Daniel Ricciardo",
        "name_acronym": "RIC",
        "team_name": "RB",
        "team_colour": "6692FF",
        "country_code": "AUS"
    },
    {
        "driver_number": 77,
        "full_name": "Valtteri Bottas",
        "name_acronym": "BOT",
        "team_name": "Kick Sauber",
        "team_colour": "52E252",
        "country_code": "FIN"
    },
    {
        "driver_number": 24,
        "full_name": "Zhou Guanyu",
        "name_acronym": "ZHO",
        "team_name": "Kick Sauber",
        "team_colour": "52E252",
        "country_code": "CHN"
    }
]

# 2024 F1 Teams
MOCK_TEAMS = [
    {
        "team_id": 1,
        "team_name": "Red Bull Racing",
        "team_colour": "3671C6",
        "country_code": "AUT"
    },
    {
        "team_id": 2,
        "team_name": "Mercedes",
        "team_colour": "27F4D2",
        "country_code": "GER"
    },
    {
        "team_id": 3,
        "team_name": "Ferrari",
        "team_colour": "E80020",
        "country_code": "ITA"
    },
    {
        "team_id": 4,
        "team_name": "McLaren",
        "team_colour": "FF8000",
        "country_code": "GBR"
    },
    {
        "team_id": 5,
        "team_name": "Aston Martin",
        "team_colour": "229971",
        "country_code": "GBR"
    },
    {
        "team_id": 6,
        "team_name": "Alpine",
        "team_colour": "FF87BC",
        "country_code": "FRA"
    },
    {
        "team_id": 7,
        "team_name": "Williams",
        "team_colour": "64C4FF",
        "country_code": "GBR"
    },
    {
        "team_id": 8,
        "team_name": "Haas F1 Team",
        "team_colour": "B6BABD",
        "country_code": "USA"
    },
    {
        "team_id": 9,
        "team_name": "RB",
        "team_colour": "6692FF",
        "country_code": "ITA"
    },
    {
        "team_id": 10,
        "team_name": "Kick Sauber",
        "team_colour": "52E252",
        "country_code": "CHE"
    }
]

# 2024 Mock Driver Standings (fallback when Ergast unavailable)
MOCK_DRIVER_STANDINGS = [
    {
        "position": 1,
        "points": 575.0,
        "wins": 19,
        "driver": {
            "code": "VER",
            "full_name": "Max Verstappen",
            "given_name": "Max",
            "family_name": "Verstappen",
            "number": "1",
            "nationality": "Dutch"
        },
        "constructor": {
            "name": "Red Bull Racing",
            "constructor_id": "red_bull",
            "nationality": "Austrian"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 2,
        "points": 285.0,
        "wins": 2,
        "driver": {
            "code": "PER",
            "full_name": "Sergio Perez",
            "given_name": "Sergio",
            "family_name": "Perez",
            "number": "11",
            "nationality": "Mexican"
        },
        "constructor": {
            "name": "Red Bull Racing",
            "constructor_id": "red_bull",
            "nationality": "Austrian"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 3,
        "points": 234.0,
        "wins": 0,
        "driver": {
            "code": "HAM",
            "full_name": "Lewis Hamilton",
            "given_name": "Lewis",
            "family_name": "Hamilton",
            "number": "44",
            "nationality": "British"
        },
        "constructor": {
            "name": "Mercedes",
            "constructor_id": "mercedes",
            "nationality": "German"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 4,
        "points": 206.0,
        "wins": 2,
        "driver": {
            "code": "ALO",
            "full_name": "Fernando Alonso",
            "given_name": "Fernando",
            "family_name": "Alonso",
            "number": "14",
            "nationality": "Spanish"
        },
        "constructor": {
            "name": "Aston Martin",
            "constructor_id": "aston_martin",
            "nationality": "British"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 5,
        "points": 205.0,
        "wins": 0,
        "driver": {
            "code": "NOR",
            "full_name": "Lando Norris",
            "given_name": "Lando",
            "family_name": "Norris",
            "number": "4",
            "nationality": "British"
        },
        "constructor": {
            "name": "McLaren",
            "constructor_id": "mclaren",
            "nationality": "British"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 6,
        "points": 200.0,
        "wins": 1,
        "driver": {
            "code": "SAI",
            "full_name": "Carlos Sainz",
            "given_name": "Carlos",
            "family_name": "Sainz",
            "number": "55",
            "nationality": "Spanish"
        },
        "constructor": {
            "name": "Ferrari",
            "constructor_id": "ferrari",
            "nationality": "Italian"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 7,
        "points": 200.0,
        "wins": 0,
        "driver": {
            "code": "LEC",
            "full_name": "Charles Leclerc",
            "given_name": "Charles",
            "family_name": "Leclerc",
            "number": "16",
            "nationality": "Monegasque"
        },
        "constructor": {
            "name": "Ferrari",
            "constructor_id": "ferrari",
            "nationality": "Italian"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 8,
        "points": 159.0,
        "wins": 0,
        "driver": {
            "code": "RUS",
            "full_name": "George Russell",
            "given_name": "George",
            "family_name": "Russell",
            "number": "63",
            "nationality": "British"
        },
        "constructor": {
            "name": "Mercedes",
            "constructor_id": "mercedes",
            "nationality": "German"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 9,
        "points": 97.0,
        "wins": 0,
        "driver": {
            "code": "PIA",
            "full_name": "Oscar Piastri",
            "given_name": "Oscar",
            "family_name": "Piastri",
            "number": "81",
            "nationality": "Australian"
        },
        "constructor": {
            "name": "McLaren",
            "constructor_id": "mclaren",
            "nationality": "British"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 10,
        "points": 74.0,
        "wins": 0,
        "driver": {
            "code": "STR",
            "full_name": "Lance Stroll",
            "given_name": "Lance",
            "family_name": "Stroll",
            "number": "18",
            "nationality": "Canadian"
        },
        "constructor": {
            "name": "Aston Martin",
            "constructor_id": "aston_martin",
            "nationality": "British"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    }
]

# 2024 Mock Constructor Standings (fallback when Ergast unavailable)
MOCK_CONSTRUCTOR_STANDINGS = [
    {
        "position": 1,
        "points": 860.0,
        "wins": 21,
        "constructor": {
            "name": "Red Bull Racing",
            "constructor_id": "red_bull",
            "nationality": "Austrian"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 2,
        "points": 409.0,
        "wins": 0,
        "constructor": {
            "name": "Mercedes",
            "constructor_id": "mercedes",
            "nationality": "German"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 3,
        "points": 406.0,
        "wins": 1,
        "constructor": {
            "name": "Ferrari",
            "constructor_id": "ferrari",
            "nationality": "Italian"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 4,
        "points": 302.0,
        "wins": 0,
        "constructor": {
            "name": "McLaren",
            "constructor_id": "mclaren",
            "nationality": "British"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 5,
        "points": 280.0,
        "wins": 0,
        "constructor": {
            "name": "Aston Martin",
            "constructor_id": "aston_martin",
            "nationality": "British"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 6,
        "points": 120.0,
        "wins": 0,
        "constructor": {
            "name": "Alpine",
            "constructor_id": "alpine",
            "nationality": "French"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 7,
        "points": 28.0,
        "wins": 0,
        "constructor": {
            "name": "Williams",
            "constructor_id": "williams",
            "nationality": "British"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 8,
        "points": 25.0,
        "wins": 0,
        "constructor": {
            "name": "AlphaTauri",
            "constructor_id": "alphatauri",
            "nationality": "Italian"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 9,
        "points": 12.0,
        "wins": 0,
        "constructor": {
            "name": "Alfa Romeo",
            "constructor_id": "alfa",
            "nationality": "Swiss"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    },
    {
        "position": 10,
        "points": 12.0,
        "wins": 0,
        "constructor": {
            "name": "Haas F1 Team",
            "constructor_id": "haas",
            "nationality": "American"
        },
        "points_gap_to_leader": 0.0,
        "points_gap_to_previous": 0.0
    }
]
