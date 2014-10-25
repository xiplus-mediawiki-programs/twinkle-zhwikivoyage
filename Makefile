all:

modules = modules/friendlytag.js \
		  modules/friendlytalkback.js \
		  modules/friendlywelcome.js \
		  modules/twinkleconfig.js \
		  modules/twinklecopyvio.js \
		  modules/twinklediff.js \
		  modules/twinklefluff.js \
		  modules/twinklespeedy.js \
		  modules/twinkleunlink.js \
		  modules/twinklexfd.js

deploy: twinkle.js morebits.js morebits.css $(modules)
	./sync.pl --deploy $^

.PHONY: deploy all
