import redis
import s3
import requests
import json
import yaml

BASE_URL = 'http://microapi.theride.org'

LNG_KEY = 'longitude'
LAT_KEY = 'lattitude'

redis = redis.Redis()

def get_stops_on_routes():
    r = requests.get('{0}/StopsOnRoute'.format(BASE_URL))
    return r.json()

def get_stops_on_route(route):
    r = requests.get('{0}/StopsOnRoute/{1}'.format(BASE_URL, route))
    return r.json()

def get_bus_locations():
    r = requests.get('{0}/Location'.format(BASE_URL))
    return r.json()

def get_bus_location(route):
    r = requests.get('{0}/Location/{1}'.format(BASE_URL, route))
    return r.json()

def get_route_names():
    r = requests.get('{0}/RouteNames'.format(BASE_URL))
    return r.json()

# Dumb parser for their format without a dot. Note, this works because of the
# limited range of latitudes and longitudes in Ann Arbor, but would fail for
# lower numbers
def get_parsed_coordinate(coordinate):
    dot_idx = 2
    if coordinate.startswith('-'):
        dot_idx = 3

    return coordinate[:dot_idx] + '.' + coordinate[dot_idx:]

def get_parsed_key(key):
    key_list = key.split('.')
    return { 'abbreviation': key_list[0], 'stopID': key_list[1], 'directionID': key_list[2] }

def get_last_locations():
    return yaml.safe_load(redis.get('locations.last'))

def set_last_locations(locations):
    redis.set('locations.last', yaml.safe_dump(locations))

def set_cache_stops():
    stops = get_stops_on_routes()
    key = '{0}.{1}.{2}'
    for stop in stops:
        stop['lat'], stop['lng'] = get_parsed_coordinate(stop[LAT_KEY]), get_parsed_coordinate(stop[LNG_KEY])
        redis.set(key.format(stop['abbreviation'], stop['stopID'], stop['directionID']), yaml.safe_dump(stop)) 
        redis.execute_command('GEOADD', 'locations', stop['lng'], stop['lat'], key.format(stop['abbreviation'], stop['stopID'], stop['directionID']))

def get_stop_details(stops):
    pipe = redis.pipeline(transaction=False)
    for stop in stops:
        pipe.get(stop)

    stops = pipe.execute()
    return [yaml.safe_load(stop) for stop in stops]

def get_nearest_stops(key, lng, lat, radius, units, with_dist=False, with_coord=False, with_hash=False, sort=None):
    pieces = [key, lng, lat, radius, units]

    if with_dist:
        pieces.append('WITHDIST')
    if with_coord:
        pieces.append('WITHCOORD')
    if with_hash:
        pieces.append('WITHHASH')
    if sort:
        pieces.append(sort)

    stops = redis.execute_command('GEORADIUS', *pieces)
    return get_stop_details(stops)
