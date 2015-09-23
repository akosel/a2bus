

all: node_modules venv

node_modules: package.json
	npm install

venv: requirements.txt
	virtualenv venv
	CFLAGS="-std=c99" venv/bin/pip install -r requirements.txt
	venv/bin/pip install python-geohash

clean:
	rm -rf venv
	rm -rf node_modules
