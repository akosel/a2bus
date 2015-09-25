import geohash
import json
import os
import redis
import requests
import s3
import yaml
import config

BASE_URL = 'http://microapi.theride.org'

LNG_KEY = 'longitude'
LAT_KEY = 'lattitude' # (sic)
LAT_KEY_NEW = 'lat'

redis_url = config.REDIS_URL or 'redis://localhost:6379'
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
    locations = r.json()
    for location in locations:
        raw_lat = location.get(LAT_KEY) or location.get(LAT_KEY_NEW)
        raw_lng = location.get(LNG_KEY)
        location['lat'] = get_parsed_coordinate(raw_lat)
        location['lng'] = get_parsed_coordinate(raw_lng)
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
    if type(coordinate) == int:
        coordinate = str(coordinate)
    dot_idx = 2
    if coordinate.startswith('-'):
        dot_idx = 3

    return float(coordinate[:dot_idx] + '.' + coordinate[dot_idx:])

def get_parsed_key(key):
    key_list = key.split('.')
    return { 'abbreviation': key_list[0], 'stopID': key_list[1], 'directionID': key_list[2], 'sequence': key_list[3] }

def get_last_locations():
    return yaml.safe_load(api_redis.get('locations.last'))

def set_last_locations(locations):
    api_redis.set('locations.last', yaml.safe_dump(locations))

def set_cache_stops():
    stops = get_stops_on_routes()
    key = '{0}.{1}.{2}.{3}'
    pipe = api_redis.pipeline(transaction=False)
    for stop in stops:
        stop['lat'], stop['lng'] = get_parsed_coordinate(stop[LAT_KEY]), get_parsed_coordinate(stop[LNG_KEY])
        pipe.set(key.format(stop['abbreviation'], stop['stopID'], stop['directionID'], stop['sequence']), yaml.safe_dump(stop))
        # TODO Some day this can be done with the Geo Redis commands
        pipe.zadd('locations', key.format(stop['abbreviation'], stop['stopID'], stop['directionID'], stop['sequence']), geohash.encode_uint64(stop['lat'], stop['lng']))
    pipe.execute()

def get_historical_data(year='2015', month='09', day='21', hour='23', minute=''):
    prefix = 'locations.{0}{1}{2}T{3}{4}'.format(year, month, day, hour, minute)
    print prefix
    location_dict = yaml.safe_load(s3.get_list_of_keys(prefix))
    location_values = [v for location_list in location_dict.values() for v in yaml.safe_load(location_list)]
    return location_values

# TODO Use historical timepoints to get a stop's expected crossing time
# TODO Update redis stop key with expected crossing time value

def get_stop_details(stops):
    pipe = api_redis.pipeline(transaction=False)
    for stop in stops:
        pipe.get(stop)

    stops = pipe.execute()
    return [yaml.safe_load(stop) for stop in stops]

def get_nearest_stops(key, lng, lat, radius=150, units='m', with_dist=False, with_coord=False, with_hash=False, sort=None):
    if not api_redis.exists('locations'):
        set_cache_stops()
    pieces = [key, lng, lat, radius, units]

    # XXX Can modify precision based on user radius. Default to 36 (~150m)
    ranges = geohash.expand_uint64(geohash.encode_uint64(float(lat), float(lng)), precision=36)

    # XXX This has no affect at this time
    if with_dist:
        pieces.append('WITHDIST')
    if with_coord:
        pieces.append('WITHCOORD')
    if with_hash:
        pieces.append('WITHHASH')
    if sort:
        pieces.append(sort)

    # TODO Some day this can be done with the Geo Redis commands
    pipe = api_redis.pipeline(transaction=False)
    for r in ranges:
        pipe.zrangebyscore(key, r[0], r[1])

    # TODO This will require some intermediate steps if scores are returned
    stops = [stop for stop_list in pipe.execute() for stop in stop_list]
    # TODO Implement filtering by radius and units
    return get_stop_details(stops)
