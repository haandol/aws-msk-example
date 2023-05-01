# CDK MSK Example

# Prerequisite

- setup awscli
- node 16.x
- cdk 2.x

## Configuration

open [**infra/config/dev.toml**](/infra/config/dev.toml) and fill the empty fields
and copy `config/dev.toml` file to project root as `.toml`

> Remove all optional fields for empty value (empty value will be failed on validation)

```bash
$ cd infra
$ cp config/dev.toml .toml
```

## Install dependencies

```bash
$ cd infra
$ npm i -g aws-cdk@2.77.0
$ npm i
```

## Provision

```bash
$ cdk bootstrap
$ cdk deploy "*" --require-approval never
```
