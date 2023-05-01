#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/stacks/vpc-stack';
import { MskStack } from '../lib/stacks/msk-stack';
import { Config } from '../config/loader';

const app = new cdk.App({
  context: {
    ns: Config.app.ns,
    stage: Config.app.stage,
  },
});

const vpcStack = new VpcStack(app, `${Config.app.ns}VpcStack`, {
  vpcId: Config.vpc.id,
  env: {
    account: Config.aws.account,
    region: Config.aws.region,
  },
});
const mskStack = new MskStack(app, `${Config.app.ns}MskStack`, {
  vpc: vpcStack.vpc,
  vpcSubnetInfo: Config.vpc.subnetInfo,
  env: {
    account: Config.aws.account,
    region: Config.aws.region,
  },
});
mskStack.addDependency(vpcStack);

const tags = cdk.Tags.of(app);
tags.add(`namespace`, Config.app.ns);
tags.add(`stage`, Config.app.stage);

app.synth();
