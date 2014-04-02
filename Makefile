
build: components index.js quanta.css template.js
	@echo building
	@component build --dev

template.js: template.html
	@component convert $<

components: component.json
	@component install --dev

clean:
	rm -fr build components template.js

deploy: build
	rm -rf app
	mkdir -p app/build
	cp ./build/* ./app/build/
	cp index.html ./app/
	firebase deploy

.PHONY: clean
