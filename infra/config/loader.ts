import * as fs from 'fs';
import * as path from 'path';
import * as joi from 'joi';
import * as toml from 'toml';
import { VpcValidator } from './validators';

export interface IConfig {
  app: {
    ns: string;
    stage: string;
  };
  aws: {
    account: string;
    region: string;
  };
  vpc: {
    id: string;
    subnetInfo: string[];
  };
}

const cfg = toml.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '.toml'), 'utf-8')
);
console.log('loaded config', cfg);

const schema = joi
  .object({
    app: joi.object({
      ns: joi.string().required(),
      stage: joi.string().required(),
    }),
    aws: joi.object({
      account: joi.number().required(),
      region: joi.string().required(),
    }),
    vpc: joi.object({
      id: joi.string().custom(VpcValidator),
      // TODO: check pair of subnet and AZ
      subnetInfo: joi.array().items(joi.string()),
    }),
  })
  .unknown();

const { error } = schema.validate(cfg);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const Config: IConfig = {
  ...cfg,
  app: {
    ...cfg.app,
    ns: `${cfg.app.ns}${cfg.app.stage}`,
  },
};
