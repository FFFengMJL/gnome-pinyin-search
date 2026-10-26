DIST := dist
GJS ?= gjs
PYTHON ?= python3

.PHONY: all test check install uninstall pack table clean

all: check

test:
	$(GJS) -m test/test-pinyin.js

check: test
	$(PYTHON) -m json.tool metadata.json >/dev/null
	$(PYTHON) -m json.tool pinyin-table.json >/dev/null
	$(PYTHON) -m py_compile tools/build_table.py tools/package.py
	@echo "checks passed"

install:
	./install.sh

uninstall:
	./uninstall.sh

pack:
	mkdir -p $(DIST)
	$(PYTHON) tools/package.py --out-dir $(DIST)
	@ls -lh $(DIST)

table:
	./tools/update-table.sh

clean:
	rm -rf -- $(DIST)
