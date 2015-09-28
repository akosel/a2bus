import boto
import json

conn = boto.connect_s3()
bucket = conn.get_bucket('a2bus')

def get_key(key):
    k = boto.s3.key.Key(bucket)
    k.key = key
    return k

def save_file(key, filename):
    k = get_key(key)
    k.set_contents_from_filename(filename)

def save_list(key, new_list):
    k = get_key(key)
    data = json.dumps(new_list)
    k.set_contents_from_string(data)

def get_list(key):
    k = get_key(key)
    return json.loads(k.get_contents_as_string())

def get_list_of_keys(prefix):
    key_list = bucket.list(prefix=prefix)
    return key_list

def get_file(key, filename):
    k = get_key(key)
    k.get_contents_to_filename(filename)

def update_list(key, to_append):
    k = get_key(key)
    data = get_list(key)
    data.append(to_append)
    k.set_contents_from_string(json.dumps(data))
