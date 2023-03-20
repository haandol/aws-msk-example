import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as appasg from 'aws-cdk-lib/aws-applicationautoscaling';
import * as msk from '@aws-cdk/aws-msk-alpha';
import { CfnConfiguration } from 'aws-cdk-lib/aws-msk';
import { MskDashboard } from '../constructs/msk-dashboard';

interface IProps extends StackProps {
  vpc: ec2.IVpc;
  vpcSubnetInfo?: string[];
}

export class MskStack extends Stack {
  public readonly cluster: msk.ICluster;

  constructor(scope: Construct, id: string, props: IProps) {
    super(scope, id, props);

    const config = this.newConfiguration();
    this.cluster = this.newCluster(props, {
      arn: config.attrArn,
      revision: 1,
    });

    new MskDashboard(this, `MskDashboard`, {
      cluster: this.cluster,
      brokers: 3,
    });
  }

  newConfiguration(): CfnConfiguration {
    const ns = this.node.tryGetContext('ns') as string;

    return new CfnConfiguration(this, `MskConfiguration`, {
      name: `${ns}Configuration`,
      serverProperties: `
auto.create.topics.enable=false
default.replication.factor=3
log.retention.hours=376
log.retention.bytes=-1
unclean.leader.election.enable=false
min.insync.replicas=2
      `,
      kafkaVersionsList: ['2.8.1'],
    });
  }

  newCluster(
    props: IProps,
    configurationInfo: msk.ClusterConfigurationInfo
  ): msk.ICluster {
    const ns = this.node.tryGetContext('ns') as string;

    const securityGroup = new ec2.SecurityGroup(this, `MskSecurityGroup`, {
      vpc: props.vpc,
      securityGroupName: `${ns}MskSecurityGroup`,
    });
    securityGroup.connections.allowInternally(ec2.Port.allTraffic());

    // use provided subnets or lookup existing private subnets
    let vpcSubnets: ec2.SubnetSelection;
    if (!props.vpcSubnetInfo) {
      vpcSubnets = {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      };
    } else {
      const subnets = [];
      for (const subnetInfo of props.vpcSubnetInfo) {
        const [subnetId, az] = subnetInfo.split(',');
        subnets.push(
          ec2.PrivateSubnet.fromPrivateSubnetAttributes(
            this,
            `Subnet-${subnetId}`,
            {
              subnetId,
              availabilityZone: az,
            }
          )
        );
      }
      vpcSubnets = { subnets };
    }

    const cluster = new msk.Cluster(this, `MskCluster`, {
      clusterName: `${ns.toLowerCase()}`,
      kafkaVersion: msk.KafkaVersion.V2_8_1,
      numberOfBrokerNodes: 1,
      vpc: props.vpc,
      vpcSubnets,
      securityGroups: [securityGroup],
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.M5,
        ec2.InstanceSize.XLARGE
      ),
      ebsStorageInfo: { volumeSize: 1000 },
      monitoring: {
        clusterMonitoringLevel:
          msk.ClusterMonitoringLevel.PER_TOPIC_PER_PARTITION,
        enablePrometheusJmxExporter: true,
        enablePrometheusNodeExporter: true,
      },
      logging: {
        cloudwatchLogGroup: new logs.LogGroup(this, `${ns}MSKLogGroup`, {
          retention: logs.RetentionDays.TWO_WEEKS,
          removalPolicy: RemovalPolicy.DESTROY,
        }),
      },
      configurationInfo,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // storage auto scaling
    // from 1000 (default) to 4096 Gib
    const target = new appasg.ScalableTarget(this, `MskStorageASGTarget`, {
      minCapacity: 1,
      maxCapacity: 4096,
      resourceId: cluster.clusterArn,
      scalableDimension: 'kafka:broker-storage:VolumeSize',
      serviceNamespace: appasg.ServiceNamespace.KAFKA,
    });
    new appasg.TargetTrackingScalingPolicy(this, 'MskStorageASGPolicy', {
      policyName: `${ns}StorageAutoScaling`,
      scalingTarget: target,
      predefinedMetric:
        appasg.PredefinedMetric.KAFKA_BROKER_STORAGE_UTILIZATION,
      targetValue: 75,
      disableScaleIn: true,
    });

    new CfnOutput(this, `MskSecurityGroupOutput`, {
      exportName: `${ns}MskSecurityGroupId`,
      value: securityGroup.securityGroupId,
    });

    return cluster;
  }
}
