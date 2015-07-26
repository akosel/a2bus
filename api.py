import redis
import requests

BASE_URL = 'http://microapi.theride.org'

LNG_KEY = 'longitude'
LAT_KEY = 'lattitude'

redis = redis.Redis()

def get_stops_on_route(route):
    r = requests.get('{0}/StopsOnRoute/{1}'.format(BASE_URL, route))
    print r.json()
    return r.json()

def get_bus_locations(route):
    r = requests.get('{0}/Location/{1}'.format(BASE_URL, route))
    print r.json()
    return r.json()

def get_route_names():
    r = requests.get('{0}/RouteNames'.format(BASE_URL))
    print r.json()
    return r.json()

# Dumb parser for their format without a dot. Note, this works because of the
# limited range of latitudes and longitudes in Ann Arbor, but would fail for
# lower numbers
def parse_coordinate(coordinate):
    dot_idx = 2
    if coordinate.startswith('-'):
        dot_idx = 3

    return coordinate[:dot_idx] + '.' + coordinate[dot_idx:]


def set_cache_stops():
    routes = get_route_names()

    route_numbers = [route['routeAbbr'] for route in routes]

    for route in route_numbers:
        stops = get_stops_on_route(route)

        key = '{0}.{1}.{2}'
        for stop in stops:
            print key.format(stop['abbreviation'], stop['stopID'], stop['directionID']), parse_coordinate(stop[LAT_KEY]), parse_coordinate(stop[LNG_KEY])
            redis.execute_command('GEOADD', 'locations', parse_coordinate(stop[LNG_KEY]), parse_coordinate(stop[LAT_KEY]), key.format(stop['abbreviation'], stop['stopID'], stop['directionID']))
