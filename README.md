# CDK MSK Example

# Prerequisite

- setup awscli
- node 16.x
- cdk 2.x

# Installation

open [**infra/config/dev.toml**](/infra/config/dev.toml) and fill the empty fields

> Remove all optional fields for empty value (empty value will be failed on validation)

and copy `env/dev.toml` file to project root as `.toml`

```bash
$ cd infra
$ cp config/dev.toml .toml
```

```bash
$ npm i
```

bootstrap cdk if no one has run it on the target region

```bash
$ cdk bootstrap
```

deploy infra

```
$ cdk deploy "*" --require-approval never
```
