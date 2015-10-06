# Requires node, python, virtualenv, and gulp (globally installed via npm)
# Should add targets for those at some point

all: node_modules venv dist

node_modules: package.json
	npm install

venv: requirements.txt
	virtualenv venv
	CFLAGS="-std=c99" venv/bin/pip install -r requirements.txt
	venv/bin/pip install python-geohash

dist: gulpfile.js
	mkdir -p /home/aaronjkosel/projects/a2bus/dist/icons
	cp /home/aaronjkosel/projects/a2bus/project/client/icons/* /home/aaronjkosel/projects/a2bus/dist/icons
	gulp build

install: dist/bundle.js dist/stylesheet.css
	cp -r /home/aaronjkosel/projects/a2bus /var/local

clean:
	rm -rf venv
	rm -rf node_modules
