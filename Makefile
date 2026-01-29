.PHONY: install web/dev web/lint web/build pkgs/lint pkgs/build

install:
	pnpm install

web/dev:
	pnpm -C web run dev

web/lint:
	pnpm -C web run lint

web/build:
	pnpm -C web run build

pkgs/lint:
	pnpm -r --filter "./packages/*" --if-present run lint

pkgs/build:
	pnpm -r --filter "./packages/*" run build
