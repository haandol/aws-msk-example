terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.16"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  profile = "tf"
  region = "ap-northeast-2"
}

resource "aws_security_group" "sg" {
  name = "msko11y-dev-sg"
  vpc_id = "vpc-xxx"

  egress {
    from_port = 0
    to_port = 0
    protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

resource "aws_msk_cluster" "kafka" {
  cluster_name           = "msko11y-dev"
  kafka_version          = "2.8.1"
  number_of_broker_nodes = 3
  enhanced_monitoring = "PER_TOPIC_PER_BROKER"

  broker_node_group_info {
    instance_type = "kafka.m5.xlarge"
    client_subnets = [
      "subnet-xxx",
      "subnet-xxx",
    ]
    storage_info {
      ebs_storage_info {
        volume_size = 1000
      }
    }
    security_groups = [aws_security_group.sg.id]
  }

  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = true
      }
      node_exporter {
        enabled_in_broker = true
      }
    }
  }
}

output "zookeeper_connect_string" {
  value = aws_msk_cluster.kafka.zookeeper_connect_string
}

output "bootstrap_brokers_tls" {
  description = "TLS connection host:port pairs"
  value = aws_msk_cluster.kafka.bootstrap_brokers_tls
}

/*
# https://github.com/cloudposse/terraform-aws-msk-apache-kafka-cluster
module "kafka" {
  source = "cloudposse/msk-apache-kafka-cluster/aws"

  namespace = "pe"
  stage = "test"
  name = "msko11y-dev"
  vpc_id = "REPLACE_WITH_YOUR_VPC_ID"
  subnet_ids = ["REPLACE_WITH_YOUR_SUBNET_ID", "REPLACE_WITH_YOUR_SUBNET_ID"]
  kafka_version = "2.8.1"
  broker_instance_type = "kafka.m5.xlarge"
  broker_per_zone = 1
  broker_volume_size = 1000
  create_security_group = true # if false, associated_security_group_ids should be provided
  enhanced_monitoring = "PER_TOPIC_PER_BROKER"
  jmx_exporter_enabled = true
}
*/