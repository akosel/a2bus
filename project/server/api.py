import geohash
import json
import os
import redis
import requests
import s3
import yaml

BASE_URL = 'http://microapi.theride.org'

LNG_KEY = 'longitude'
LAT_KEY = 'lattitude' # (sic)

redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
try:
    api_redis = redis.from_url(redis_url)
    api_redis.ping()
    print 'Connected to redis in API'
except redis.ConnectionError as e:
    print 'ERROR', e
    api_redis = None

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

    return float(coordinate[:dot_idx] + '.' + coordinate[dot_idx:])

def get_parsed_key(key):
    key_list = key.split('.')
    return { 'abbreviation': key_list[0], 'stopID': key_list[1], 'directionID': key_list[2] }

def get_last_locations():
    return yaml.safe_load(api_redis.get('locations.last'))

def set_last_locations(locations):
    api_redis.set('locations.last', yaml.safe_dump(locations))

def set_cache_stops():
    stops = get_stops_on_routes()
    key = '{0}.{1}.{2}'
    pipe = api_redis.pipeline(transaction=False)
    for stop in stops:
        stop['lat'], stop['lng'] = get_parsed_coordinate(stop[LAT_KEY]), get_parsed_coordinate(stop[LNG_KEY])
        pipe.set(key.format(stop['abbreviation'], stop['stopID'], stop['directionID']), yaml.safe_dump(stop))
        pipe.zadd('locations', key.format(stop['abbreviation'], stop['stopID'], stop['directionID']), geohash.encode_uint64(stop['lat'], stop['lng']))
    pipe.execute()

def get_stop_details(stops):
    pipe = api_redis.pipeline(transaction=False)
    print stops
    for stop in stops:
        pipe.get(stop)

    stops = pipe.execute()
    return [yaml.safe_load(stop) for stop in stops]

def get_nearest_stops(key, lng, lat, radius=150, units='m', with_dist=False, with_coord=False, with_hash=False, sort=None):
    if not api_redis.exists('locations'):
        set_cache_stops()
    pieces = [key, lng, lat, radius, units]

    ranges = geohash.expand_uint64(geohash.encode_uint64(float(lat), float(lng)), precision=36)

    if with_dist:
        pieces.append('WITHDIST')
    if with_coord:
        pieces.append('WITHCOORD')
    if with_hash:
        pieces.append('WITHHASH')
    if sort:
        pieces.append(sort)

    pipe = api_redis.pipeline(transaction=False)
    for r in ranges:
        pipe.zrangebyscore(key, r[0], r[1])

    # TODO This will require some intermediate steps if scores are returned
    stops = [stop for stop_list in pipe.execute() for stop in stop_list]
    # TODO Implement filtering by radius and units
    return get_stop_details(stops)
